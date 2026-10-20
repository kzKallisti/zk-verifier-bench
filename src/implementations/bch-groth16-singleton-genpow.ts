// Source-assembled BN254 genpow with canonical G1 parity witnesses.
// 4,183 locking bytes and a 208-byte witness; historical UE used 4,198/272.
// Owning source: singleton/bn254/genpow-reconstructed/{verifier.asm,build.mjs}.
// Assembly SHA-256: 1a2437914b36d1128c5476a9361d52836c80e86ea4ac1c779480f3f6cc000e73.
// Earlier source helper reductions and the guarded outline49 rotation cycle are now exported.
// Candidate locking SHA-256: 332fdd4dbbd5468afc997a49571e15ed88d04c6dda6ccff5863e1dfb0568e3dd.
// A/C y parity is decoded with the shared exponent-driven Fp routine;
// exact archived y, original x and eight other raw witness pushes are preserved.
// Decoder root checks replace the two former standalone G1 equations.
// This changes the witness representation domain; no unrestricted byte-language
// equivalence, native resource admission or new subgroup theorem is claimed.
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
  name: 'BCH Groth16 verifier singleton, BN254 genpow (shared P, range-checked inputs, source-assembled 4,183 B, G1 parity)',
  proofSystem: 'Groth16',
  field: 'BN254',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    'Explicit symbolic assembly in singleton/bn254/genpow-reconstructed/verifier.asm. ' +
    'The fixed proof A/C y coordinates use parity pushes, reducing the witness from 272 to 208 bytes. ' +
    'The verifier reconstructs each canonical y with a shared posttest remaining-exponent loop, checks the ' +
    'curve equation and requested parity, and retains the original x and remaining witness data. ' +
    'The 4,183-byte program has sha256 332fdd4dbbd5468afc997a49571e15ed88d04c6dda6ccff5863e1dfb0568e3dd. ' +
    'The 72-function program retains its 32-byte scalar guard, G2 checks and source-owned helpers. ' +
    'Three rotations after successful depth-nine disposal guards are omitted because they form an identity. The power loop ' +
    'shifts its remaining exponent before testing for zero; all archived proof and ' +
    'public-input integers are preserved. The original CashScript/stackcert lineage remains missing. ' +
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
