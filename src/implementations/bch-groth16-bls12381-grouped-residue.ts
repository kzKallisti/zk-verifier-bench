// BCH-native BLS12-381 Groth16 verifier for the same fixed benchmark VK as the published grouped
// entry. It evaluates the complete equation
//
//   e(-A,B) * e(alpha,beta) * e(IC0 + in0*IC1 + in1*IC2,gamma) * e(C,delta) = 1
//
// with runtime A/B/C and two runtime public inputs. The fixed e(alpha,beta) Miller value and the
// fixed-G2 gamma/delta line coefficients are ordinary VK preparation; the runtime terms are not
// collapsed with the fixture's published scalar relations.
//
// The graph has five shared-table GLV vk_x inputs followed by 21 fused prepared-Miller inputs,
// packed 9/9/8 into three transactions. The Miller accumulator lives in Q=Fp12*/Fp6*. A
// canonical six-limb u represents the finite class [c]=[1+u*W]. For lambda=p+|x|,
// gcd(lambda,p^6+1)=r, so the lambda-power image is exactly the final-exponent kernel in Q. The
// final Miller input checks the projective Frobenius relation and rejects the zero representative.
//
// A and C use canonical half-normalized G1 coordinates, reserve (0,0) for identity, and are checked
// on-curve. Their G1 subgroup checks are intentionally omitted: each is paired only with an
// order-r G2 point, so G1 cofactor components pair trivially and do not enlarge the accepted
// prime-order equation. Their encodings are therefore not claimed to be unique modulo cofactor
// components. Non-identity B is canonical, on-curve, and checked in the exact G2 subgroup; all-zero
// B maps to a fixed G2 base paired with the effective G1 identity.
//
// OP_INPUTBYTECODE binds all 23 in-group successor states and lockings. Each group root fixes input
// index zero and the exact input count, requires input[0] to carry a mutable NFT, and excludes its
// 32-byte category from every sibling input. The two cross-group hand-offs pin the successor P2SH32
// locking and carry hash256(state); full tokenCategory equality pins category and mutable capability.
// The terminal root requires exactly one token-free output, burning the thread. Committed fixtures
// reject a stripped capability, a minting input/output thread, a same-category sibling token, and a
// retained terminal token. A deployment designates the initial group-0 token UTXO as the graph root
// and must retain control of that category's minting authority.
//
// Exact committed measurements: 203,324 script B; 204,634 challenge-score B; 203,794 serialized
// spend B across 3 transactions (45,882 / 81,825 / 76,087); 159,987,187 op; maximum input
// 7,983,894 op. The same 26 lockings accept ten measured runtime fixtures plus a separate valid
// all-position GLV stress run. Across that accepting suite, the largest transaction is 81,826 B,
// maximum input is 7,983,894 op, and maximum unlocking bytecode is 9,954 B; every transaction
// passes the BCH 2026 consensus and current standard-policy VMs with an exact 1 sat/B fee template.
// The contracts do not constrain satoshi values. The vectors also commit 27 rejecting runs and
// four isolated point/range rejection runs, including finite off-curve C and complete token flow.
//
// Against the immediate-upstream 34-input artifact, this schedule removes 8 inputs and lowers
// score by 3,075 B, serialized size by 2,795 B, script bytes by 2,731 B, and total op-cost by
// 2,260,586. In the measured accepting suite, the largest transaction falls from 87,708 B to
// 81,826 B; maximum input cost rises to 7,983,894 op and maximum unlocking bytecode rises to
// 9,954 B, both within current policy. It does not claim the overall cross-curve record or a
// single-transaction result.
//
// The prescribed fixed benchmark key is synthetic and publishes its setup and IC scalars. These
// vectors establish complete-equation execution and BCH transaction packaging for that key; they do
// not establish circuit knowledge, secure application public-input binding, arbitrary-VK support,
// or independent-setup interoperability. Relayability is measured across the accepting fixture
// suite, not asserted as a proof-independent size ceiling for every possible witness.
//
// Byte-exact provenance:
//   source: groth16_cashscript commit 74c24a1eb8b8d59896c3bdd0fec62b17aa4641dc
//   compiler: CashScript commit 647be955537f0996d3c89184a306ee87848dbc8c
//   vector sha256: d3a25c5fc0d929fb1a99e7b0643644b11914457faa478e308dec1e8113b927af
//   Miller manifest sha256: 3eb42b9b506752d76f09433de5b4fca59fe94ba2cfd079a12b827bc45110d888
//   locking graph sha256 (UTF-8 concatenated locking-hex text):
//     b5d1e89348be6972ce87d7b80db716b09d4955609448e9a5685b34d94323f6ba
// Reproduce from the source checkout:
//   VERIFIER_DIR=/path/to/zk-verifier-bench BLS_QUOTIENT_TORUS=1 pnpm vectors:grouped:residue:bls
//
// sha256 of locking bytecode, in graph order:
//   00 033645109bab21476b39c4cf499c9319eb70644ce701bf975b4d21279d42442b
//   01 af7a165e0d379349e099dee7580881c96d699bb14a924369125de6541bed1ffd
//   02 2ea42b3243b80b1c05df164fc6f0fde317a98e6c87a0311019ca22ae3a15e84c
//   03 35e3a65c5bdc1b90bb814cbbb4ecca2a9c6a7cde5831fad45ff4d47220ee43eb
//   04 8c04550fd4f34ef2db785ff8c1aa3bac5c3a4883fd3397049a56f6fb665d7a22
//   05 eb3e69aba4ced0a8202d98fb7d007a8e6f1b5a38b52583de063ab0548e709302
//   06 d77f7a44c92ac495a9ce70b64504f3f43f614fa4cbf2fb94599f0a4eb8a901bb
//   07 b34163e786cbafad220b8c2d7bbd76140c8a8298393cb682f6bc3e95cacc1a73
//   08 29f56849a78f32fd267e7ddec098e7d4a16e4e14f88411c11c32ea6672a24771
//   09 631d3ad600b49a7daee07afe44e8080e879aa6a5f39d655e65974b2748bffb67
//   10 ba793e76391643e6e8aa98be26b367ba101ac15efd2312da7099e226e23afb5d
//   11 fd6bec0861f100aa48f000e3d73d80e2c12be1a4e0795105f1abbf3f79dfdace
//   12 509010534f5f3b9a9bb47234097eeb9c9aeda2857a73861a4fc62b9f487744d1
//   13 94a7cdb03b29ae16e09854cb40528c562697ab8cac97d5da2399f3baa917c1aa
//   14 f9a753848adfe503484072d0e92e7b29140ac72394c67918829a5c45e3cbc703
//   15 d8e763336b6cd57e8a579e365800988b0eeec75b04789b3895d2b5a8c349eeea
//   16 fb407b03e2ff2f8edf4783b5bf99c0e50ed7f6c0bf15a6f3d0a070e443383341
//   17 83e9bedda12c7bb27c13cc9e7049dc48e480bb35271f5904532e66c469e09ce8
//   18 1bf8f80e02681cce2a241e72e96d3fa9b39e69001b3d004ed9acbbdee9884e52
//   19 042ec4dd3c82257694fda8631a2e058fac9f9f08655e31978c97e0d46a0eba21
//   20 5452c1be7a3a54795c8ec2ac9f097bc3e6c82ab118c9ea1f2089197adbeb6a4a
//   21 9dd7638bed11d1be429b8f0f1ebd98cb53510b9bebe06dc75cac4ff850e77785
//   22 ace9d041207fab302681b58a5aa737c6981118516b7da8df6d4c60ef8d14490c
//   23 efb505e9e9e47ca5fbd5d4d9bbb518ce31273cffbc5c9564183158a50d68db59
//   24 4ac21b289e4caa8a341f9f379ffe911a3b2a2dfb7e37b0e3a9ca8fba522755cc
//   25 e0fa9e946d483af92f7b3ebd964e1e0d12e0cf095d2d99c17da7b59903b90622
import { readFileSync } from 'node:fs';
import { hexToBin } from '@bitauth/libauth';

import type { Implementation, Step } from '../harness/types.js';

interface RawStep { label: string; locking: string; unlocking: string; checkpoint?: string; group: number }
interface RawGroup {
  lo: number; hi: number;
  inToken: { capability: 'none' | 'mutable' | 'minting'; commitment: string } | null;
  inputTokens?: ({ capability: 'none' | 'mutable' | 'minting'; commitment: string } | null)[];
  outToken: { capability: 'none' | 'mutable' | 'minting'; commitment: string } | null;
  outLocking: string | null;
}
interface RawRun { steps: RawStep[]; groups: RawGroup[] }
interface Vectors { category: string; valid: RawRun; extraValidProofs?: RawRun[]; worstCaseProof?: RawRun; invalid?: RawRun[]; invalidInputs?: RawRun[] }

const v = JSON.parse(readFileSync('src/bch/groth16-bls12381-grouped-residue-vectors.json', 'utf8')) as Vectors;
const CATEGORY = hexToBin(v.category);

const toRun = (run: RawRun): Step[] => {
  const inputsByGroup = run.groups.map((g) =>
    run.steps.slice(g.lo, g.hi + 1).map((s) => ({ lockingBytecode: hexToBin(s.locking), unlockingBytecode: hexToBin(s.unlocking) })),
  );
  const inputTokensByGroup = run.groups.map((g) => g.inputTokens?.map((token) => token
    ? { capability: token.capability, commitment: hexToBin(token.commitment) }
    : undefined));
  return run.steps.map((s, i) => {
    const g = run.groups[s.group]!;
    return {
      label: s.label,
      lockingBytecode: hexToBin(s.locking),
      unlockingBytecode: hexToBin(s.unlocking),
      checkpoint: s.checkpoint,
      grouped: {
        group: s.group,
        index: i - g.lo,
        inputs: inputsByGroup[s.group]!,
        category: CATEGORY,
        inToken: g.inToken ? { capability: g.inToken.capability, commitment: hexToBin(g.inToken.commitment) } : undefined,
        inputTokens: inputTokensByGroup[s.group],
        outToken: g.outToken ? { capability: g.outToken.capability, commitment: hexToBin(g.outToken.commitment) } : undefined,
        outLockingBytecode: g.outLocking ? hexToBin(g.outLocking) : undefined,
      },
    };
  });
};

export const bchGroth16Bls12381GroupedResidue: Implementation = {
  id: 'bch-groth16-bls12381-grouped-residue',
  name: 'BCH BLS12-381 Groth16 grouped quotient-torus verifier (26 inputs, 3 current-policy standard transactions)',
  proofSystem: 'Groth16',
  field: 'BLS12-381',
  structure: 'multi-tx',
  proofBinding: 'runtime',
  // Every group root requires one mutable state NFT at input[0], excludes the same category from
  // siblings, and fixes its input layout. Nonterminal covout equality pins output[0]'s category and
  // mutable capability; the terminal root requires one token-free output and burns the thread.
  tokenSafetyEnforced: true,
  source:
    'BCH-native CashScript: the complete four-pair BLS12-381 Groth16 equation for the same fixed ' +
    'benchmark VK as the published grouped entry, with runtime public inputs and runtime A/B/C. ' +
    'Five shared-table GLV vk_x inputs feed 21 fused prepared-Miller inputs. The fixed ' +
    'e(alpha,beta) Miller value and fixed-G2 gamma/delta line coefficients are ordinary VK ' +
    'preparation; runtime terms are not collapsed using the fixture\'s scalar relations. The ' +
    'accumulator lives in Fp12*/Fp6*, where one canonical six-limb u represents [c]=[1+u*W] and ' +
    'the terminal enforces the exact projective Frobenius relation while rejecting zero. A and C ' +
    'use canonical half-normalized G1 coordinates and are checked on-curve. Their G1 subgroup ' +
    'checks are intentionally omitted because each is paired only with an order-r G2 point, so ' +
    'cofactor components pair trivially and do not change the accepted prime-order equation; ' +
    'encoding uniqueness modulo those components is not claimed. Non-identity B is canonical, ' +
    'on-curve, and checked in G2; all-zero B represents pairing identity. OP_INPUTBYTECODE binds ' +
    'all in-group states and successor lockings. Group roots fix index zero and exact input count. ' +
    'Across groups, mutable NFT commitments bind state, successor locking, category, and capability. ' +
    'Group roots exclude same-category sibling inputs and the terminal root burns the thread; the ' +
    'vectors replay capability stripping, minting-thread, sibling-token, and retained-terminal-token ' +
    'rejections. One fixed 26-locking P2SH32 graph ' +
    'accepted ten measured runtime fixtures plus the separate all-position GLV stress run. Every ' +
    'transaction in that suite passes BCH 2026 consensus and current standard policy, remains under ' +
    '100,000 bytes, and has an exact 1 sat/B fee template; the contracts do not constrain satoshi ' +
    'values. Byte-exact vectors reproduce from groth16_cashscript ' +
    '74c24a1eb8b8d59896c3bdd0fec62b17aa4641dc and CashScript ' +
    '647be955537f0996d3c89184a306ee87848dbc8c. The fixed benchmark key is synthetic and publishes ' +
    'its setup and IC scalars, so these vectors establish complete-equation execution and BCH ' +
    'packaging for that key, not circuit knowledge, secure application public-input binding, ' +
    'arbitrary-VK support, independent-setup interoperability, or a proof-independent standardness ' +
    'ceiling for every possible witness.',
  load: async () => {
    const valid = toRun(v.valid);
    const extraValidProofs = (v.extraValidProofs ?? []).map(toRun);
    const worstCaseProof = v.worstCaseProof ? toRun(v.worstCaseProof) : undefined;
    const invalid = (v.invalid ?? []).map(toRun);
    const invalidInputs = (v.invalidInputs ?? []).map(toRun);
    return { valid, extraValidProofs, worstCaseProof, invalid, invalidInputs };
  },
};
