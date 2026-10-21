// Source-owned BN254 singleton: lower cost, factored final exponent.
// Source 73645ec5f01f3a9bc8cd6f1c684881191dcfe955; profile factored.
// Assembly SHA256 137083ce3fc2db6d0bcf19f1438a9b89a59a8329ad35af3f2404a411546a0333; builder SHA256 6c899e71d58093e3904a7617e207778c38c906a00af5545f4eac607f4c87d355.
// 4408 locking +208 witness +85 overhead =4701 bytes; relaxed primary cost 2049440569.
// Locking SHA256 955865f3ea49d9f93e0fb378b7d4f79944dac398c5eada1d8f8cd1cc5a76813d.
// Proof/witness/public/VK values fixed; four valid/four invalid and nine public-input mutations.
// Existing validation/security grades; no new red-team, subgroup, native or bch-spec claim.
import { readFileSync } from 'node:fs';
import { hexToBin } from '@bitauth/libauth';

import type { Implementation, Step } from '../harness/types.js';

const v = JSON.parse(readFileSync('src/bch/groth16-singleton-genpow-factored-vectors.json', 'utf8')) as {
  lockingOK: string;
  unlocking: string;
  invalidUnlocking: string;
};

// Archived distinct proofs under the same VK (same locking), to confirm this verifier
// is runtime-general (one program verifies many proofs). committed:true is the primary
// vector already in `v`; the rest are the extra runtime proofs.
const mp = JSON.parse(readFileSync('src/bch/groth16-singleton-genpow-factored-multiproof-vectors.json', 'utf8')) as {
  lockingOK: string;
  proofs: { publicInputs: string[]; unlocking: string; invalidUnlocking: string; committed: boolean }[];
};

export const bchGroth16SingletonGenpowFactored: Implementation = {
  id: 'bch-groth16-singleton-genpow-factored',
  // where the claimed public inputs live (public-input binding gate, harness/gates.ts)
  publicInputs: [{ input: 0, push: 1, name: 'n0' }, { input: 0, push: 0, name: 'n1' }],
  name: 'BCH Groth16 singleton, BN254 factored final exponent (4,408 B, canonical Fp12)',
  proofSystem: 'Groth16',
  field: 'BN254',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    "Same fixed BN254 Groth16 statement/VK and runtime208-byte parity witness as the generic genpow entry. " +
    "Normal source command: node singleton/bn254/genpow-reconstructed/build.mjs OUTPUT factored, at " +
    "73645ec5f01f3a9bc8cd6f1c684881191dcfe955. After unchanged scalar/G1/G2/Miller code, require twelve " +
    "canonical final Fp12 limbs. Derive H=(P^4-P^2+1)/r from the existing P/r calculation, compute g=f^H with " +
    "the unchanged generic field loop, then h=Frob2(g)*g. Accept precisely nonzero Fp6: upper six limbs zero " +
    "and at least one lower limb nonzero. For canonical f this is equivalent to f^((P^12-1)/r)=1; zero is " +
    "explicitly rejected. Frobenius shares root t=18u^3+18u^2+9u+1. All72 old helper bodies retained, three " +
    "source-owned helpers added. This narrows noncanonical encoding acceptance; it does not add isolated " +
    "point-validation or subgroup claims. Four fixed proofs/four invalid witnesses and nine generic " +
    "public-input mutations qualify a finite cohort on the relaxed VM. Current native resources fail; no " +
    "bch-spec admission or universal soundness/resource theorem.",
  load: async () => {
    const valid: Step[] = [
      {
        label: 'BN254 Groth16 pairing product, canonical hard power and nonzero Fp6 verdict (single tx)',
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
