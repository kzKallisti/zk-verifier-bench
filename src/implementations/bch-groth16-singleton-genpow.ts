// Source-assembled BN254 genpow with shared prime constant, public-input range check,
// and shared 4/6-pick outline: 4,198 locking bytes.
// Exact reconstruction baseline: official 4,292-byte artifact 61c451d0...8494c83.
// Owning source: singleton/bn254/genpow-reconstructed/{verifier.asm,build.mjs}.
// Candidate locking SHA-256: c25ed044...4dfa1c3f0; UE-a4 adds outline_66/67/68 to
// measured sites after outline_65, demotes outline_13 to raw ID 47, and preserves fixtures.
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
  name: 'BCH Groth16 verifier singleton, BN254 genpow (shared P, range-checked inputs, source-assembled 4,198 B, UE-a4)',
  proofSystem: 'Groth16',
  field: 'BN254',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    'Explicit symbolic assembly in singleton/bn254/genpow-reconstructed/verifier.asm. ' +
    'UE-a4 preserves eleven exact OP_6 OP_ROLL OP_7 OP_ROLL sites as outline_65 (raw ID 13), ' +
    'adds outline_66/outline_67/outline_68 at measured stack sites, demotes outline_13 to raw ID 47, ' +
    'and emits 4,198 bytes with sha256 c25ed044bd3c1d7f3b234cee1651a50eccbb615d3a1ba5a304ac5504dfa1c3f0. ' +
    'A 32-byte prefix requires 0 <= n0, n1 < r (r = P - 6x^2), closing the n + r input alias. ' +
    'All original verification predicates and proof/public-input fixtures are preserved. ' +
    'The missing original CashScript/stackcert lineage is not claimed recovered. Runtime ' +
    'cost and the public VM gates are measured by the fresh UE-a4 benchmark jobs. No native ' +
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
