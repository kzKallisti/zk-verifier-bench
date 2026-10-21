// Source-owned BN254 singleton: minimum bytes, generic final exponent.
// Source 73645ec5f01f3a9bc8cd6f1c684881191dcfe955; profile bytes.
// Assembly SHA256 137083ce3fc2db6d0bcf19f1438a9b89a59a8329ad35af3f2404a411546a0333; builder SHA256 6c899e71d58093e3904a7617e207778c38c906a00af5545f4eac607f4c87d355.
// 4152 locking +208 witness +85 overhead =4445 bytes; relaxed primary cost 5516859822.
// Locking SHA256 0e2ec0dc2ba7c23307385b6b742f89903c278c5ab095561a4350914953c65b2f.
// Proof/witness/public/VK values fixed; four valid/four invalid and nine public-input mutations.
// Existing validation/security grades; no new red-team, subgroup, native or bch-spec claim.
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
  name: 'BCH Groth16 verifier singleton, BN254 genpow (shared P, range-checked inputs, source-assembled 4,152 B, G1 parity)',
  proofSystem: 'Groth16',
  field: 'BN254',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    'Explicit symbolic assembly in singleton/bn254/genpow-reconstructed/verifier.asm. ' +
    'The fixed proof A/C y coordinates use parity pushes, reducing the witness from 272 to 208 bytes. ' +
    'The verifier reconstructs each canonical y with a shared posttest remaining-exponent loop, checks the ' +
    'curve equation and requested parity, and retains the original x and remaining witness data. ' +
    'The 4,152-byte program has sha256 0e2ec0dc2ba7c23307385b6b742f89903c278c5ab095561a4350914953c65b2f. ' +
    'The 72-function program retains its 32-byte scalar guard, G2 checks and source-owned helpers. ' +
    'Three rotations after successful depth-nine disposal guards are omitted because they form an identity. The power loop ' +
    'shifts its remaining exponent before testing for zero; all archived proof and ' +
    'public-input integers are preserved. The final Fp12 exponent now shifts in place too, retaining the ' +
    'unused counter slot to keep field-helper stack indices exact. Eleven depth-10 rolls in the verdict tail form an identity and are removed; the next depth-11 roll remains. The original CashScript/stackcert lineage remains missing. ' +
    'Actual finite proof/cost gates are recorded separately; relaxed VM limits are required.',
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
