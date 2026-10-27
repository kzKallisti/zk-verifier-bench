// WITHDRAWN (review 2026-10-27; verifier.cash soundness reset) and removed from the default
// REGISTRY (benchmark.ts). This module and its vectors stay on disk as history; the site keeps the
// last results.json row in its withdrawn archive. Owner gap: the tx2/tx3 group roots (graph inputs
// 10 and 19) take their whole incoming Miller state from tx.inputs[0].nftCommitment
// (chunked/intratx/transform.mjs, tokenThreadMode 'continue'/'burn'), but read the token category
// FROM input 0 and check only mutable capability 0x01 and that siblings carry a different category.
// No category constant is pinned in any locking, and nothing ties that NFT to an execution of the
// predecessor group, so the cross-group state is not owned by the on-chain computation. The
// deployment premise in earlier versions of this header ("designate the initial group-0 token UTXO and
// retain the category's minting authority") is not enforced on-chain, and the terminal burns the
// thread, leaving nothing for a consumer to check. Fix route: pin the category constant in every
// group root and hold minting in an on-chain covenant (as the covenant-residue lifecycle does).
// The arithmetic below (quotient torus, G1/G2 domain checks, GLV) was found correct by the same
// review; the withdrawal is about the cross-group hand-off only.
//
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
// packed 10/9/7 into three transactions. The Miller accumulator lives in Q=Fp12*/Fp6*. A
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
// index zero and the exact input count, requires input[0] to carry a mutable NFT, and excludes that
// NFT's 32-byte category (read from input 0, not pinned) from every sibling input. The two
// cross-group hand-offs pin the successor P2SH32 locking and carry hash256(state) in the NFT
// commitment; the outgoing token must keep input 0's category and mutable capability. The terminal
// root requires exactly one token-free output, burning the thread. Committed fixtures reject a
// stripped capability, a minting input/output thread, a same-category sibling token, and a retained
// terminal token. See the withdrawal note above: the incoming category itself is unowned.
//
// Committed measurements (shipped vectors): 201,284 script B; 202,594 verifier.cash score; 3
// transactions of 54,303 / 81,422 / 66,029 B; 158,278,825 op; maximum input 7,904,036 op; maximum
// unlocking 9,854 B. The same 26 lockings accept ten measured runtime fixtures plus a separate valid
// all-position GLV stress run; across that suite the largest transaction is 89,874 B and every
// transaction passes the BCH 2026 consensus and current standard-policy VMs with an exact 1 sat/B
// fee template. The contracts do not constrain satoshi values. The vectors also commit 27 rejecting
// runs and four isolated point/range rejection runs.
//
// The prescribed fixed benchmark key is synthetic and publishes its setup and IC scalars. These
// vectors establish complete-equation execution and BCH transaction packaging for that key; they do
// not establish circuit knowledge, secure application public-input binding, arbitrary-VK support,
// or independent-setup interoperability.
//
// Byte-exact provenance (shipped vectors: bench 2f0a920, the compiler-optimizations-8 recompile;
// the 2026-10-27 review matched them to this source and compiler):
//   source: groth16_cashscript commit e1e322ac4b9575e0cb3dfc47e7594fac0ea46445
//   compiler: mr-zwets/cashscript compiler-optimizations-8 @ dab3f89fb7483372459714d262cbf0ee3debb85d
//   vector sha256: 9f7bb07cdef8af1d0bc20fa6f338cc6840bec0c7677eccf655f39fe3811ebf1d
//   locking graph sha256 (UTF-8 concatenated locking-hex text):
//     a1072d49be0d6eda6445bb177fe55e8cdb68f38299b603bd91aed4a84f8ca203
// Reproduce from the source checkout:
//   VERIFIER_DIR=/path/to/zk-verifier-bench BLS_QUOTIENT_TORUS=1 pnpm vectors:grouped:residue:bls
//
// sha256 of locking bytecode, in graph order:
//   00 8511b19a24a8c7728b09751ed980b0c5153b5901ac88afdaecc5a753611dfccd
//   01 9339996bddb6146d20ee12d5254cc12620ad366c690b1ab23811025f5b05960d
//   02 739ed9a76ec5dbf76c9810ef8b212c190435791c01d81d1089007c494701e018
//   03 c2ea74b9c85a8b58cd17ce6bb3659f11bc0be23769ce63baad02b98e0f963957
//   04 df3767d304fc247e25aa5d2e9afe02e3a547273aca17907795d13b01aeb8b88b
//   05 a00ca5315bcf00ae911f792647b8388604b7e13a0b274ff140986fb277d5bba7
//   06 feadf2839c75ab6b28939df6fda68ef8aaf6d825cd38b41593d8950f9562712f
//   07 ad1ba0235b1766bf1b5b1fd425adb4000b8b6e4d00239c1194fb0a84e27197ab
//   08 1dc0e12ea69d0ed9230c6a765dcd04e9d2bf32c619d1134b4a04126636de8e84
//   09 d264c07e84261c009828b9c75fe36e7fb2695436d193efcbbbb1027804aadf67
//   10 5f108ff40c91d2ad3fe293a73d74314a83dc2e5a9dc5c4e2672fda8175b00301
//   11 3bcf64d771806efd984e581068d5a0f7defa86d84ed9c330c5f87fceec25284d
//   12 ae2e8676f6598f7d9c4664b2f7dc37b7c699202193615d3985753cf20bade2e7
//   13 939cb44ca9a62ca7fc7455abe6f9ba00b271127d1b860d8eaa084e05884c5c58
//   14 da3ff1e7bfcd5adf887aca0776afcef8dbbb7b11de2735311c9101dc5566f13b
//   15 2513b62c78def7e8dc8b7756d7224da26fccfea91ce4a72cb25a0670b39a41a8
//   16 60ac9682856d1cf4c44cd81b56e49b12d877d3ee2341ee54103ca55ab2a4ab61
//   17 b435913f1550db7b0ffe239a6a0682a0d64244148b31342c52773194551bfb32
//   18 b747278b72cac9ebc21fbcac8622ea2a501c85cf8dd53a5b64457393a43af635
//   19 de14088cf1ff7f74ced1397f039c6dad0db6c120f5dea2134246e3905dc5c4f0
//   20 e3ddbf1264a9529f62841d9d2b17e8eae06bda1d2cb73a98bcc177ce4e36d0d3
//   21 7189035ac4b6d133f3a8e891fa89aac2c2d6b72c5f453c497cd7d53e389f13dd
//   22 cdee2c65829a1d007a2b6f91ea676688ae5a532f896e3068be501c725cd998e3
//   23 b78314fe5676bdd2a280111d2bac2840ac7e547bb9f6731e7e2a988d4b53f2c9
//   24 84c7e6beee28784c8edee1039013e6ca821b7487a3df9aaf504be0ac09da8847
//   25 bc30bfb1292177667047a9eb73e2e6a8f291fc751517b17255aea2aea102adad
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
  // where the claimed public inputs live (public-input binding gate, harness/gates.ts): every copy
  // of n0, n1 in the valid run (32-byte fields packed in larger pushes), located by the maintainers
  publicInputs: [
    { input: 0, push: 0, offset: 0, encoding: 'le32', name: 'n0' },
    { input: 0, push: 0, offset: 48, encoding: 'le32', name: 'n1' },
    { input: 0, push: 0, offset: 96, encoding: 'le32', name: 'n0' },
    { input: 0, push: 0, offset: 192, encoding: 'le32', name: 'n1' },
    { input: 1, push: 0, offset: 144, encoding: 'le32', name: 'n0' },
    { input: 1, push: 0, offset: 192, encoding: 'le32', name: 'n1' },
    { input: 1, push: 0, offset: 240, encoding: 'le32', name: 'n0' },
    { input: 1, push: 0, offset: 336, encoding: 'le32', name: 'n1' },
    { input: 2, push: 0, offset: 144, encoding: 'le32', name: 'n0' },
    { input: 2, push: 0, offset: 192, encoding: 'le32', name: 'n1' },
    { input: 2, push: 0, offset: 240, encoding: 'le32', name: 'n0' },
    { input: 2, push: 0, offset: 336, encoding: 'le32', name: 'n1' },
    { input: 3, push: 0, offset: 144, encoding: 'le32', name: 'n0' },
    { input: 3, push: 0, offset: 192, encoding: 'le32', name: 'n1' },
    { input: 3, push: 0, offset: 240, encoding: 'le32', name: 'n0' },
    { input: 3, push: 0, offset: 336, encoding: 'le32', name: 'n1' },
    { input: 4, push: 0, offset: 144, encoding: 'le32', name: 'n0' },
    { input: 4, push: 0, offset: 192, encoding: 'le32', name: 'n1' },
    { input: 4, push: 0, offset: 240, encoding: 'le32', name: 'n0' },
    { input: 4, push: 0, offset: 336, encoding: 'le32', name: 'n1' },
  ],
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
