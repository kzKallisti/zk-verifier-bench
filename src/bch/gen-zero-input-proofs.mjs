// Mint valid Groth16 proofs whose public inputs contain a canonical ZERO (n0 = 0, n1 = 0, and
// both), under the SAME fixture VK as the committed BN254 singleton instance, plus ordinary
// tampered-input rejections for each.
//
// Why: a scalar of 0 makes the on-chain MSM term in*IC the point at infinity. A Jacobian add
// that only handles an identity LEFT operand then returns O for IC0 + O, so vk_x silently drops
// IC0 and an honest proof for that statement is rejected. These fixtures pin both directions:
// every valid zero-input proof must verify, every tampered input must be rejected.
//
// Proofs are solved in the exponent exactly as gen-multiproof.mjs does (fixture trapdoor
// scalars from src/checkpoints/pairing-vectors.json), with a separate deterministic seed, so
// the output is reproducible. Each proof is checked with @noble/curves and, when the vector
// files exist, against the singleton lockings (the standard and opcode-optimized builds).
//
//   node src/bch/gen-zero-input-proofs.mjs        -> src/bch/groth16-singleton-zero-input-vectors.json
//   CHECK_ONLY=1 node src/bch/gen-zero-input-proofs.mjs   (re-check the written file, no rewrite)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import {
  hexToBin, binToHex, bigIntToVmNumber,
  createVirtualMachine, createInstructionSetBch2026,
  createTestAuthenticationProgramBch, ConsensusBch2025, ripemd160, secp256k1, sha1, sha256,
} from '@bitauth/libauth';
import { bn254 } from '@noble/curves/bn254.js';

const OUT = 'src/bch/groth16-singleton-zero-input-vectors.json';
const r = bn254.fields.Fr.ORDER;
const Fp12 = bn254.fields.Fp12;
const modr = (x) => ((x % r) + r) % r;
const invr = (x) => bn254.fields.Fr.inv(modr(x));
const G1 = (k) => bn254.G1.Point.BASE.multiply(modr(k));
const G2 = (k) => bn254.G2.Point.BASE.multiply(modr(k));

const HUGE = Number.MAX_SAFE_INTEGER;
const loosened = {
  ...ConsensusBch2025, baseInstructionCost: 100, maximumFunctionIdentifierLength: 7,
  maximumMemorySlots: HUGE, maximumStandardLockingBytecodeLength: -1,
  maximumStandardUnlockingBytecodeLength: HUGE, maximumTokenCommitmentLength: 128,
  operationCostBudgetPerByte: HUGE, maximumStackItemLength: HUGE, maximumVmNumberByteLength: HUGE,
  maximumStackDepth: HUGE, maximumControlStackDepth: HUGE, maximumBytecodeLength: HUGE, maximumOperationCount: HUGE,
};
const looseVm = createVirtualMachine(createInstructionSetBch2026(false, { consensus: loosened, ripemd160, secp256k1, sha1, sha256 }));
const evalPair = (locking, unlocking) => {
  const state = looseVm.evaluate(createTestAuthenticationProgramBch({ lockingBytecode: locking, unlockingBytecode: unlocking, valueSatoshis: 1000n }));
  const top = state.stack[state.stack.length - 1];
  const accepted = state.error === undefined && state.stack.length === 1 && top !== undefined && top.length === 1 && top[0] === 1;
  return { accepted, error: state.error, operationCost: state.metrics.operationCost };
};
// minimal pushes (same encoder as gen-multiproof.mjs; 0 -> OP_0, the canonical zero push)
const pushInt = (n) => {
  const d = bigIntToVmNumber(n);
  if (d.length === 0) return Uint8Array.from([0x00]);
  if (d.length === 1 && d[0] >= 1 && d[0] <= 16) return Uint8Array.from([0x50 + d[0]]);
  if (d.length === 1 && d[0] === 0x81) return Uint8Array.from([0x4f]);
  if (d.length <= 75) return Uint8Array.from([d.length, ...d]);
  if (d.length <= 255) return Uint8Array.from([0x4c, d.length, ...d]);
  return Uint8Array.from([0x4d, d.length & 0xff, (d.length >> 8) & 0xff, ...d]);
};
const unlockingFor = (args) => Uint8Array.from(args.slice().reverse().flatMap((a) => [...pushInt(a)]));
const g1aff = (p) => { const a = p.toAffine(); return [a.x, a.y]; };
const g2aff = (p) => { const a = p.toAffine(); return [a.x.c0, a.x.c1, a.y.c0, a.y.c1]; };
// spend(Ax,Ay, Bxa,Bxb,Bya,Byb, Cx,Cy, in0,in1)
const proofArgs = (A, B, C, inputs) => [...g1aff(A), ...g2aff(B), ...g1aff(C), ...inputs.map(BigInt)];

// fixed VK from the committed instance's fixture scalars
const vec = JSON.parse(readFileSync('src/checkpoints/pairing-vectors.json', 'utf8'));
const s = vec.scalars;
const alpha_s = BigInt(s.alpha), beta_s = BigInt(s.beta), gamma_s = BigInt(s.gamma), delta_s = BigInt(s.delta);
const ic_s = s.ic.map(BigInt);
const alpha = G1(alpha_s), beta = G2(beta_s), gamma = G2(gamma_s), delta = G2(delta_s), ic = ic_s.map(G1);
if (ic[0].toAffine().x !== BigInt(vec.vk.ic[0].x) || ic[1].toAffine().x !== BigInt(vec.vk.ic[1].x)
  || alpha.toAffine().x !== BigInt(vec.vk.alpha.x)) {
  throw new Error('reconstructed VK != committed VK');
}
const nobleVerify = (A, B, C, inputs) => {
  let vkx = ic[0];
  inputs.forEach((inp, i) => { if (modr(inp) !== 0n) vkx = vkx.add(ic[i + 1].multiply(modr(inp))); });
  const prod = bn254.pairingBatch([{ g1: A.negate(), g2: B }, { g1: alpha, g2: beta }, { g1: vkx, g2: gamma }, { g1: C, g2: delta }], true);
  return Fp12.eql(prod, Fp12.ONE);
};

// SplitMix64, seeded apart from gen-multiproof.mjs / gen-pairing-vectors.ts
let st = 0x5EED2E40C0FFEE01n;
const MASK64 = (1n << 64n) - 1n;
const nextU64 = () => {
  st = (st + 0x9e3779b97f4a7c15n) & MASK64;
  let z = st;
  z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK64;
  z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MASK64;
  return (z ^ (z >> 31n)) & MASK64;
};
const randScalar = () => { let a = 0n; for (let i = 0; i < 4; i++) a = (a << 64n) | nextU64(); return (a % r) || 1n; };

const X = 424242n; // the nonzero companion input
const CASES = [
  { label: 'n0 = 0', inputs: [0n, X], tampers: [['n0 0 -> 1', [1n, X]], ['n1 + 1', [0n, X + 1n]]] },
  { label: 'n1 = 0', inputs: [X, 0n], tampers: [['n1 0 -> 1', [X, 1n]], ['n0 + 1', [X + 1n, 0n]]] },
  { label: 'n0 = n1 = 0', inputs: [0n, 0n], tampers: [['n0 0 -> 1', [1n, 0n]], ['n1 0 -> 1', [0n, 1n]]] },
];

const mint = ({ label, inputs, tampers }) => {
  const a_s = randScalar(), b_s = randScalar();
  const vkx_s = modr(ic_s[0] + inputs[0] * ic_s[1] + inputs[1] * ic_s[2]);
  const c_s = modr((a_s * b_s - alpha_s * beta_s - vkx_s * gamma_s) * invr(delta_s));
  const A = G1(a_s), B = G2(b_s), C = G1(c_s);
  if (!nobleVerify(A, B, C, inputs)) throw new Error(`${label}: minted proof fails noble verify`);
  return {
    label,
    publicInputs: inputs.map(String),
    unlocking: binToHex(unlockingFor(proofArgs(A, B, C, inputs))),
    invalid: tampers.map(([tl, t]) => {
      if (nobleVerify(A, B, C, t)) throw new Error(`${label}: tamper ${tl} unexpectedly verifies in noble`);
      return { label: tl, publicInputs: t.map(String), unlocking: binToHex(unlockingFor(proofArgs(A, B, C, t))) };
    }),
  };
};

const data = process.env.CHECK_ONLY
  ? JSON.parse(readFileSync(OUT, 'utf8'))
  : {
    description:
      'Valid Groth16 proofs with canonical zero public inputs (n0 = 0, n1 = 0, both) under the committed '
      + 'BN254 fixture VK, each with ordinary tampered-input rejections. The unlocking data uses the '
      + 'uncompressed spend(Ax,Ay,Bxa,Bxb,Bya,Byb,Cx,Cy,in0,in1) ABI: any BN254 singleton built for '
      + 'this VK with that ABI (standard / opcode-optimized) must accept every proof and reject every '
      + 'invalid entry. Builds with a different unlocking layout (e.g. genpow compressed, minop with '
      + 'hints) are out of scope and reject these by layout mismatch.',
    proofs: CASES.map(mint),
  };

// check against every singleton locking whose vector file is present
const LOCKINGS = [
  'src/bch/groth16-singleton-vectors.json',
  'src/bch/groth16-singleton-opcode-optimized-vectors.json',
].filter(existsSync);
let ok = true;
for (const f of LOCKINGS) {
  const locking = hexToBin(JSON.parse(readFileSync(f, 'utf8')).lockingOK);
  console.log(`=== ${f} (${locking.length} B) ===`);
  for (const p of data.proofs) {
    const good = evalPair(locking, hexToBin(p.unlocking));
    const bad = p.invalid.map((t) => ({ t, res: evalPair(locking, hexToBin(t.unlocking)) }));
    const rejOk = bad.every(({ res }) => !res.accepted);
    ok &&= good.accepted && rejOk;
    console.log(`  ${p.label.padEnd(12)} accept=${good.accepted}${good.accepted ? '' : ` (${good.error})`} `
      + `op-cost=${good.operationCost.toLocaleString()}  ${bad.map(({ t, res }) => `reject[${t.label}]=${!res.accepted}`).join('  ')}`);
  }
}
if (!process.env.CHECK_ONLY) {
  writeFileSync(OUT, JSON.stringify(data, null, 2));
  console.log(`wrote ${OUT} (${data.proofs.length} proofs)`);
}
if (!ok) {
  console.error('FAIL: a valid zero-input proof was rejected or a tampered one accepted');
  process.exitCode = 1;
}
