// BLS12-381 Groth16 genpow singleton, recovered symbolic source, compact IDs, and SX-b2.
//
// Oct 16, 2026: main is prefixed with a public-input range check, 0 <= n0, n1 < r with
// r = x^4 - x^2 + 1 from curveSeedAndScalarMinusOne (+17 bytes, 3,432-byte locking, sha256
// b994fd7c4646465636bb88a9ff0f4437bb744758d94fd734b90e2b9429d34e46). Without it the
// public-input gate accepted n0 + r and n1 + r. SX-b2 keeps this guard and emits 3,424 bytes.
//
// Full final exponentiation f^E == Fp12.ONE, E = (p^12-1)/r, over the raw
// four-pair Miller product. vk_x is recomputed on-chain. The unlocking carries
// compressed proof coordinates and two public inputs; no residue witness or
// Fiat-Shamir polynomial-identity test is introduced.
//
// The current range-closed baseline is 3,432 bytes; SX-b2 inlines three low-fanout helpers
// after compact IDs and the range guard, producing 3,424 bytes and an expected score of 3,714.
// Official operation-cost qualification is recorded separately by the release gate.
// The historical compact baseline was 3,415 bytes and scored 3,705; current official cost
// qualification for SX-b2 is recorded by the release gate.
// Four supplied proofs accept and the official changed-input mutation rejects.
// No dense fixture or isolated input-validation fixtures are supplied.
// Current-BCH compatibility and standardness remain false: this is a singleton
// byte-footprint result evaluated with the official resource ceilings lifted.
//
// The recovered source declares all 51 function bodies and the main program;
// it builds the original locking byte-for-byte. Compact output reassigns
// fieldPrime 1->0, fp6Add 17->1 and fp6Mul 18->-1, rebuilding every immediate
// call, then SX-b2 inlines stackSequence33, negFp, and inverseFp. All remaining
// calls are static and the range guard is unchanged. Function-table keys are raw
// bytes; empty and 0x81 keys are valid.
//
// Recovered program source:
//   singleton/bls12-381/leader-recovered/program.mjs
// Candidate builder/exporter: compact.mjs / export.mjs in the same directory.
// Source checkout base revision: 8fb6a6ef71c3bc9ae3692d2d8d36d8f50719edb0
// Recovered program origin revision: da85bde1a3918e653e545e3d588f8e3c7a58cd0f
// This is recovered symbolic Script source. The original CashScript compiler
// revision, search witness, replay and stackcert pipeline remain unavailable.
// The supplied witness/public-input bytes are unchanged from the original
// official genpow vectors. The source exporter records their hashes and the
// recovered-source hashes in both vector files.
//
// The original entry omits G1/G2 subgroup checks and declares cofactor-equivalent
// proof semantics. This recovered-source transformation preserves that posture; it does
// not establish a new malformed-point theorem or an input-validation grade.
//
// Current range-closed baseline locking SHA256:
//   b994fd7c4646465636bb88a9ff0f4437bb744758d94fd734b90e2b9429d34e46
// SX-b2 candidate locking SHA256:
//   24c86240f9b4721d699ae7b76938b0b03bd1b80061d48e52b2374a7a4a5b6d34
// groth16-bls12381-singleton-genpow-vectors.json SHA256:
//   160ef41128b09c3e6bce23ddf58ae37ea1ec5f53cc8abfae15bf29d29e758023
// groth16-bls12381-singleton-genpow-multiproof-vectors.json SHA256:
//   21566c1a91e359334b405b529994776b666e9f78a51ec670300097fd8a6aef50
import { readFileSync } from 'node:fs';
import { hexToBin } from '@bitauth/libauth';

import type { Implementation, Step } from '../harness/types.js';

const v = JSON.parse(readFileSync('src/bch/groth16-bls12381-singleton-genpow-vectors.json', 'utf8')) as {
  lockingOK: string;
  unlocking: string;
  invalidUnlocking: string;
};

// Extra DISTINCT proofs minted under the SAME VK (same locking), to confirm this
// verifier is runtime-general (one program verifies many proofs). committed:true is
// the primary vector already in `v`; the rest are the extra runtime proofs.
const mp = JSON.parse(readFileSync('src/bch/groth16-bls12381-singleton-genpow-multiproof-vectors.json', 'utf8')) as {
  proofs: { publicInputs: string[]; unlocking: string; invalidUnlocking: string; committed: boolean }[];
};

export const bchGroth16Bls12381SingletonGenpow: Implementation = {
  id: 'bch-groth16-bls12381-singleton-genpow',
  // where the claimed public inputs live (public-input binding gate, harness/gates.ts)
  publicInputs: [{ input: 0, push: 1, name: 'n0' }, { input: 0, push: 0, name: 'n1' }],
  name: 'BCH Groth16 verifier singleton, BLS12-381 genpow (full final-exp, range-checked inputs, 3,424 B, SX-b2 recovered symbolic source)',
  proofSystem: 'Groth16',
  field: 'BLS12-381',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    'BLS12-381 Groth16 genpow singleton with on-chain vk_x, the raw four-pair Miller ' +
    'product, and full final exponentiation f^((p^12-1)/r) == Fp12.ONE. SX-b2 inlines ' +
    'three low-fanout static helpers after compact IDs and the range guard. The unlocking ' +
    'contains compressed proof coordinates and two public inputs; no residue witness ' +
    'or Fiat-Shamir PIT is added. Recovered symbolic Script source reproduces the ' +
    'original 3,425-byte leader exactly; the range-closed baseline is 3,432 bytes and SX-b2 is ' +
    '3,424 bytes (expected score 3,714). ' +
    'All four supplied proof witnesses are unchanged. The original CashScript ' +
    'compiler/search-witness/replay pipeline remains unavailable. Current BCH and ' +
    'standardness limits are exceeded. The original no-G1/G2-subgroup-check and ' +
    'cofactor-equivalent proof posture is preserved; no new malformed-point theorem ' +
    'or isolated input-validation grade is claimed.',
  load: async () => {
    const valid: Step[] = [
      {
        label: 'full BLS12-381 Groth16 verify (genpow): vk_x on-chain + finalExpPow(e(-A,B)*e(a,b)*e(vk_x,g)*e(C,d))==Fp12.ONE (single tx)',
        lockingBytecode: hexToBin(v.lockingOK),
        unlockingBytecode: hexToBin(v.unlocking),
        checkpoint: 'verify',
      },
    ];
    const invalid: Step[][] = [
      [{ ...valid[0]!, unlockingBytecode: hexToBin(v.invalidUnlocking) }],
    ];
    const extraValidProofs: Step[][] = mp.proofs
      .filter((p) => !p.committed)
      .map((p) => [{ ...valid[0]!, unlockingBytecode: hexToBin(p.unlocking) }]);

    return { valid, invalid, extraValidProofs };
  },
};
