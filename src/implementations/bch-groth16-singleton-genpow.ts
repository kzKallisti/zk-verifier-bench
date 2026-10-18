// Source-assembled BN254 genpow with shared prime constant, public-input range check,
// and one measured straight-line outline: 4,234 locking bytes.
// Exact reconstruction baseline: official 4,292-byte artifact 61c451d0...8494c83.
// Owning source: singleton/bn254/genpow-reconstructed/{verifier.asm,build.mjs}.
// Candidate locking SHA-256: 3cacfc09...b51c08; the static inverse restores
// the published 4,236-byte control exactly. Proof/public-input fixtures are unchanged.
// Runtime cost and public-gate qualification are recorded after the fresh benchmark job.
// No native input-resource or new point-validation claim is made.
import { readFileSync } from 'node:fs';
import { hexToBin } from '@bitauth/libauth';

import type { Implementation, Step } from '../harness/types.js';

const v = JSON.parse(readFileSync('src/bch/groth16-singleton-genpow-vectors.json', 'utf8')) as {
  lockingOK: string;
  unlocking: string;
  invalidUnlocking: string;
};

// Extra DISTINCT proofs minted under the SAME VK (same locking), to confirm this verifier
// is runtime-general (one program verifies many proofs). committed:true is the primary
// vector already in `v`; the rest are the extra runtime proofs.
const mp = JSON.parse(readFileSync('src/bch/groth16-singleton-genpow-multiproof-vectors.json', 'utf8')) as {
  lockingOK: string;
  proofs: { publicInputs: string[]; unlocking: string; invalidUnlocking: string; committed: boolean }[];
};

export const bchGroth16SingletonGenpow: Implementation = {
  id: 'bch-groth16-singleton-genpow',
  // where the claimed public inputs live (public-input binding gate, harness/gates.ts)
  publicInputs: [{ input: 0, push: 1, name: 'n0' }, { input: 0, push: 0, name: 'n1' }],
  name: 'BCH Groth16 verifier singleton, BN254 genpow (shared P, range-checked inputs, source-assembled 4,234 B)',
  proofSystem: 'Groth16',
  field: 'BN254',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    'Explicit symbolic assembly in singleton/bn254/genpow-reconstructed/verifier.asm. ' +
    'The published 4,236-byte compact-ID control is preserved by exact inverse; this ' +
    'candidate outlines OP_2 OP_PICK OP_4 OP_PICK OP_6 OP_PICK at four sites into ' +
    'outline_63 (raw ID 17), producing 4,234 bytes with sha256 ' +
    '3cacfc09b6d847dfbd8913bcb433a1d7cb33253b549a35547a5f8fa998b51c08. ' +
    'A 32-byte prefix requires 0 <= n0, n1 < r (r = P - 6x^2), closing the n + r input alias. ' +
    'All original verification predicates and proof/public-input fixtures are preserved. ' +
    'The missing original CashScript/stackcert lineage is not claimed recovered. Runtime ' +
    'cost and the public VM gates are measured by the fresh TD-a3 benchmark job. No native ' +
    'BCH resource or stronger input-validation claim is made.',
  load: async () => {
    const valid: Step[] = [
      {
        label: 'full BN254 Groth16 verify (genpow, full EIP-197 incl. G2 subgroup): vk_x on-chain + finalExpPow(e(-A,B)*e(a,b)*e(vk_x,g)*e(C,d))==Fp12.ONE (single tx)',
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
