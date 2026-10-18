// Source-assembled BN254 genpow with shared prime constant and a public-input range check
// (0 <= n0, n1 < r): 4,242 locking bytes after identical-body sharing.
// Exact reconstruction baseline: official 4,292-byte artifact 61c451d0...8494c83.
// Owning source: singleton/bn254/genpow-reconstructed/{verifier.asm,build.mjs}.
// Current hash 8537de89...d58a2; closed-program duplicate-body equivalence preserves
// the original arithmetic, proof/public-input checks and final exponentiation.
// Original CashScript/stackcert pipeline is not recovered by this reconstruction.
// Duplicate-body sharing saves 18 bytes and 315 committed operation units. This remains a
// relaxed-VM singleton, with no native input-resource or new point-validation claim.
// The original load function and gates below are unchanged, including its labels.
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
  name: 'BCH Groth16 verifier singleton, BN254 genpow (shared P, range-checked inputs, source-assembled 4,242 B)',
  proofSystem: 'Groth16',
  field: 'BN254',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    'Explicit symbolic assembly in singleton/bn254/genpow-reconstructed/verifier.asm. ' +
    'Reproduces the official 4,292-byte genpow leader exactly before a proved P-sharing ' +
    'rewrite to 4,228 bytes (sha256 a7686356eba90eb594d2a05189e645111506e67fc3c52007144081761d357cd0). ' +
    'A 32-byte prefix requires 0 <= n0, n1 < r (r = P - 6x^2), closing the n + r input alias ' +
    '(4,260 B, sha256 6d884ee69b1ec0f6b20e749d64422a4f0c779f756a1b01bb1b8edb9b40836e80). ' +
    'All original verification predicates and public fixtures are preserved. The missing ' +
    'original CashScript/stackcert lineage is not claimed recovered. Committed relaxed-VM ' +
    'cost was 5,505,565,336 after prime sharing. Removing duplicate outline_17 and ' +
    'retargeting five calls to identical outline_9 reduces locking to 4,242 bytes, ' +
    'sha256 8537de8922c6e4711357e4390fd0e1a2006015a16e7b93a7f1d5a88c7d0d58a2, ' +
    'and the current range-checked score from 4,619 to 4,601. The matching current ' +
    'baseline costs 5,505,567,176; deduplication costs 5,505,566,861 (-315). ' +
    'No native BCH resource or stronger input-validation claim is made.',
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
