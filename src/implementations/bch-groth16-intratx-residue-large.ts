// BCH-native BN254 Groth16 verifier targeting the PROPOSED bch-spec 100 kB-script VM:
//
//   GLV vk_x MSM             1 input    (one 128-position four-scalar schedule)
//   fused Miller + verdict   3 inputs   (the complete 348-operation quotient-torus trace)
//                            --------
//                            4 inputs   (one transaction passing the bch-spec standard-policy model)
//
// The root fixes the exact input count and SHA-256-pins the terminal program; the terminal fixes
// its position. OP_INPUTBYTECODE binds the projective vk_x and complete Miller-state handoffs. The
// Miller inputs validate canonical A/B/C encodings, curve relations, identity semantics, and the
// exact runtime-B subgroup endpoint, then evaluate the complete prescribed four-pair equation. They
// fold only the ordinary fixed-key e(alpha,beta) and e(IC0,gamma) factors; they do not use the
// fixture's published scalar relations to collapse the statement.
//
// Committed fixture: 58,446 script B; 58,498 serialized B; 58,638 verifier.cash score;
// 67,456,340 op. The dense worst-case fixture is 68,315 serialized B / 80,858,092 op.
// All 14 accepting fixture families use the same locking graph and pass the bch-spec consensus
// and standard-policy VMs with default-minimum-fee-funded deterministic templates. This requires
// the proposed VM because
// the largest unlocking is 21,356 B; current BCH limits unlocking bytecode to 10,000 B.
//
// The prescribed checkpoint key is synthetic and publishes setup and IC scalars. These vectors
// establish complete-equation execution and proposed-VM resource validity for that key; circuit
// knowledge, production public-input binding, arbitrary-key verification, and independently
// generated setup interoperability are outside this artifact's scope.
//
// Source: mr-zwets/groth16_cashscript @ e1e322ac4b9575e0cb3dfc47e7594fac0ea46445
// Compiler: mr-zwets/cashscript compiler-optimizations-8 @
// dab3f89fb7483372459714d262cbf0ee3debb85d
// Input fixture SHA-256:
//   multiproof d513f1fe45d7aba20f289cbc38439d5ebdb05a9975950a5e32d2bf21239d4abc
//   pairing checkpoint e393e8b6af6f528c93f97f37656802bf44daefa5819640a557fbff95e236739e
// Vector SHA-256: de0ee49676e26adeba338a6f3979902be186286398a4d51809ce44d0170bd13e
// Locking graph SHA-256 (UTF-8 concatenated locking-hex text):
// 97873357b18110717b88b2511063e51f216712160a651cfbcd79e8b924e4a30a
// Locking-bytecode SHA-256 values, in input order:
//   00 74e6287705c81cc95018163d179dfd0d64550f98940c69c6208d2f59efee3134
//   01 822a5de1d8cec6492f9a3fbb6757bd672f697b0cbd454e48407586ba35a417e7
//   02 7633668e49057be3c9ebde39e1b4201b170a66dd699ef243ab696fd96bd08742
//   03 164c3c54959bc72b2dbd1d943984511a0d12c9c838eaee49610f4f72bce50fac
import { readFileSync } from 'node:fs';
import { hexToBin } from '@bitauth/libauth';

import type { Implementation, Step } from '../harness/types.js';

interface RawStep { label: string; locking: string; unlocking: string; checkpoint?: string }
interface Vectors { steps: RawStep[]; extraValidProofs?: RawStep[][]; worstCaseProof?: RawStep[]; invalid?: RawStep[][]; invalidInputs?: RawStep[][] }

const v = JSON.parse(readFileSync('src/bch/groth16-intratx-residue-large-vectors.json', 'utf8')) as Vectors;

// Turn one run (an ordered list of chunk inputs) into Step[] sharing ONE inputs array,
// so each step is evaluated against the same multi-input transaction (and its
// tx.inputs[idx±1] introspection resolves to the real siblings).
const toRun = (raw: RawStep[]): Step[] => {
  const inputs = raw.map((s) => ({ lockingBytecode: hexToBin(s.locking), unlockingBytecode: hexToBin(s.unlocking) }));
  return raw.map((s, i) => ({
    label: s.label,
    lockingBytecode: inputs[i]!.lockingBytecode,
    unlockingBytecode: inputs[i]!.unlockingBytecode,
    checkpoint: s.checkpoint,
    intraTx: { index: i, inputs },
  }));
};

export const bchGroth16IntratxResidueLarge: Implementation = {
  id: 'bch-groth16-intratx-residue-large',
  // where the claimed public inputs live (public-input binding gate, harness/gates.ts): every copy
  // of n0, n1 in the valid run (32-byte fields packed in larger pushes), located by the maintainers
  publicInputs: [
    { input: 0, push: 0, offset: 0, encoding: 'le32', name: 'n0' },
    { input: 0, push: 0, offset: 32, encoding: 'le32', name: 'n1' },
    { input: 0, push: 0, offset: 64, encoding: 'le32', name: 'n0' },
    { input: 0, push: 0, offset: 98, encoding: 'le32', name: 'n1' },
  ],
  name: 'BCH Groth16 intra-tx quotient-torus residue, LARGE 100 kB scripts (whole verifier in 4 inputs of one transaction, PROPOSED bch-spec)',
  proofSystem: 'Groth16',
  field: 'BN254',
  structure: 'single-tx',
  proofBinding: 'runtime',
  vm: 'bch-spec',
  source:
    'BCH-native CashScript: one runtime-proof BN254 verifier in four linked inputs of one ' +
    'transaction, targeting the proposed bch-spec 100,000-byte-script VM. A 128-position ' +
    'four-scalar GLV schedule computes the IC1/IC2 MSM projectively. Three linked inputs then ' +
    'validate canonical A/B/C encodings, curve relations, identity semantics, and the exact ' +
    'runtime-B subgroup endpoint while executing the complete 348-operation quotient-torus ' +
    'Miller trace and terminal relation. The fixed e(alpha,beta) and e(IC0,gamma) factors are ' +
    'precomputed without using the fixture\'s published scalar relations to collapse the ' +
    'four-pair equation. The root enforces the exact input count and pins the terminal locking ' +
    'program; the terminal enforces its position; OP_INPUTBYTECODE binds every state handoff; ' +
    'all input blobs have exact widths. All accepting fixtures pass the bch-spec consensus and ' +
    'standard-policy VMs with fee-funded deterministic templates. The 21,356-byte maximum ' +
    'unlocking requires the proposed VM and exceeds current BCH\'s 10,000-byte limit. Deployed ' +
    'as P2SH32. The prescribed checkpoint key is synthetic and publishes setup and IC scalars, ' +
    'so this artifact establishes complete-equation execution and proposed-VM resource validity ' +
    'for that key; it does not establish circuit knowledge, production public-input binding, ' +
    'arbitrary-key verification, or independent-setup interoperability.',
  load: async () => {
    const valid = toRun(v.steps);
    const extraValidProofs = (v.extraValidProofs ?? []).map(toRun);
    const worstCaseProof = v.worstCaseProof ? toRun(v.worstCaseProof) : undefined;
    const invalid = (v.invalid ?? []).map(toRun);
    const invalidInputs = (v.invalidInputs ?? []).map(toRun);
    return { valid, extraValidProofs, worstCaseProof, invalid, invalidInputs };
  },
};
