// PairFold-5 densless with a sound vk_x, SLIM MSM state + malleability pins (kzKallisti).
// Same pairing programs and GLV Straus vk_x MSM as bch-groth16-intratx-pairfold5-densless-msm;
// MSM state layout is slim, and the terminal redeem prepends length/order/sign-bit pins.
// Owning source: chunked/bn254/densless-msm-slim in groth16_cashscript (byte-exact export; SLIM_PINS=full).
//
// Construction / what is enforced:
// - Claimed public inputs n0, n1 are the TERMINAL's own number pushes (input 4, counted backward from the terminal redeem). The
//   terminal range-checks 0 <= n < r and checks the GLV decomposition of the witness bytes w against
//   them (S0 = k10 + lambda*k20 == n0, S1 = k11 + lambda*k21 == n1 mod r).
// - w (64 bytes, one per Straus position) lives only in the terminal's state push (w, X, Y, Z;
//   exactly 160 B, required by the terminal; it is the last push before the terminal redeem, whose
//   length the locking pins). Genesis (input 3, positions 63..31) and the executors (inputs 0, 1, 2;
//   positions by OP_INPUTINDEX, cuts 33,43,54,60) read their witness bytes from that window,
//   located from the end of input 4's unlocking.
// - Each stage pins the next stage's X, Y, Z (96-B executor state push, 160-B terminal push) from the
//   end of the receiver's unlocking; the terminal finishes positions 3..0, adds IC0 - [2^64]G,
//   converts to affine with a witnessed Z inverse and requires the result to equal the genesis vk_x
//   that the Miller loop consumes. Terminal pins input count and all worker lockings.
// - Malleability pins (paid once, prepended to the densless terminal): PUSHDATA2 length pins on the
//   terminal header/quot and each executor quot; canonical non-decreasing order on terminal witness
//   limbs 2..11 (minimally encoded LE numbers); fixed-table sign-bit clear on all three executor
//   tables (OP_DEFINE/INVOKE). Closes the eight witness-malleability findings shared with the parent
//   (see zk-verifier-bench#39).
// Soundness: every stage consumes one w, which the terminal binds to its claimed n0, n1; the X, Y, Z
// chain is pinned stage to stage, so vk_x = IC0 + n0*IC1 + n1*IC2 for the claimed inputs, and the
// pairing check uses that vk_x. A forged claim needs a forged w, which changes vk_x. Length/order/
// sign pins do not change the statement; they reject alternate witnesses for the same statement.
// Finite dense-witness sample: 30/30 deterministic proofs accept on standard BCH2026,
// seed densless-msm-slim-v1; peak budgets 98.1 / 95.7 / 90.2 / 98.3 / 83.8 %.
// The order reader accepts minimally encoded variable-width numbers; default and explicit-full
// exports match. Source regression includes a valid proof with a 31-byte terminal number.
// Exact-byte attack file: the original 36 cases refreshed plus 8 issue39 cases (44 total),
// re-encoded by GPT-6.1 Sol at Kallisti's request; upstream maintainer review remains pending.
// Primary full-pinned score 35,109 = 34,874 script +235 overhead; no universal resource bound claimed.
// Co8 with guarded floating prime caches: 13 MADD sites and six selected DBL sites; full pins, zero padding.
// Optional raw-dbl/raw-madd/raw-both profiles score 35,265 / 35,480 / 35,636 bytes.
// Consensus native costs: 24,822,008 / 24,688,942 / 24,669,602; all keep full pins and zero pads.
// Raw-both alone uses MSM_SPLIT=27 MSM_CUTS=37,43,51,52; default/raw-dbl/raw-madd remain split31.
// Raw DBL profiles retain DBL418; all profiles use compact cleanup and terminal copy; all pre-redeem values fixed.
// Raw-both minimum sampled dense native input margin: 61,094; no changed-range universal cap claimed.
// Each retains five core + short +30 archived dense proofs, 44 attacks and both native modes.
// All cache profiles use the checked executor cleanup and inverse-copy rules.
// Default locking sha256:
//   exec0+vkx-msm           3be8eda70d1eee1b6ab5f2a0bb9c507fca1108519b7f853fe35308c5b8b6e956
//   exec1+vkx-msm           3be8eda70d1eee1b6ab5f2a0bb9c507fca1108519b7f853fe35308c5b8b6e956
//   exec2+vkx-msm           3be8eda70d1eee1b6ab5f2a0bb9c507fca1108519b7f853fe35308c5b8b6e956
//   genesis+vkx-msm         1b317fcbffc4dd638ae4798502da48eb46711ec5a891eb689d23155b4abbe3b4
//   terminal+vkx-msm-final  82bafb56510493f82c1f92e3c043c2299c936dc1b28c9f264db0f18baf077567
import { readFileSync } from 'node:fs';
import { decodeAuthenticationInstructions, hexToBin } from '@bitauth/libauth';

import type { Implementation, Step } from '../harness/types.js';

interface RawStep {
  label: string;
  locking: string;
  unlocking: string;
  checkpoint?: string;
}

interface Vectors {
  steps: RawStep[];
  extraValidProofs?: RawStep[][];
  worstCaseProof?: RawStep[];
  invalid?: RawStep[][];
  invalidInputs?: RawStep[][];
}

const toRun = (raw: RawStep[]): Step[] => {
  const inputs = raw.map((step) => ({
    lockingBytecode: hexToBin(step.locking),
    unlockingBytecode: hexToBin(step.unlocking),
    valueSatoshis: 1000n,
    sequenceNumber: 0,
  }));
  return raw.map((step, index) => ({
    label: step.label,
    lockingBytecode: inputs[index]!.lockingBytecode,
    unlockingBytecode: inputs[index]!.unlockingBytecode,
    checkpoint: step.checkpoint,
    valueSatoshis: 1000n,
    sequenceNumber: 0,
    intraTx: { index, inputs },
  }));
};

const slim = (id: string, name: string, path: string): Implementation => {
  const vectors = JSON.parse(readFileSync(path, 'utf8')) as Vectors;
  const terminalPushes = decodeAuthenticationInstructions(hexToBin(vectors.steps[4]!.unlocking)).length;
  return {
    id,
    // where the claimed public inputs live (public-input binding gate, harness/gates.ts)
    publicInputs: [{ input: 4, push: terminalPushes - 4, name: 'n0' }, { input: 4, push: terminalPushes - 5, name: 'n1' }],
    name,
    proofSystem: 'Groth16',
    field: 'BN254',
    structure: 'single-tx',
    proofBinding: 'runtime',
    source:
      'PairFold-5 densless (chunked/bn254/densless-recovered) with the GLV Straus vk_x MSM in a slim state layout ' +
      '(chunked/bn254/densless-msm-slim): claimed inputs are terminal pushes, witness bytes live only in the terminal state, ' +
      'executors carry X, Y, Z. Five P2SH32 inputs, one standard transaction; the terminal pins input count and all worker lockings.',
    load: async () => ({
      valid: toRun(vectors.steps),
      extraValidProofs: (vectors.extraValidProofs ?? []).map(toRun),
      worstCaseProof: vectors.worstCaseProof ? toRun(vectors.worstCaseProof) : undefined,
      invalid: (vectors.invalid ?? []).map(toRun),
    }),
  };
};

const id = 'bch-groth16-intratx-pairfold5-densless-msm-slim';
const name = 'BCH Groth16 intra-tx PairFold-5 densless with sound vk_x MSM (slim MSM state)';
export const bchGroth16IntratxPairfold5DenslessMsmSlim = slim(
  id, name, 'src/bch/groth16-intratx-pairfold5-densless-msm-slim-vectors.json',
);

// Raw helpers lower native cost; orbit compresses tables at higher native cost.
// Orbit:34,685bytes /25,263,604cons /25,331,060std; split37/cuts27,36,47,55.
// Fullpins/zeropads; archived36proofs/bothmodes minimum margin104,025.
// Source-generated XYZ seams are independently bound; proof/witness/scalars fixed.
// Retained orbit:34,631bytes /25,317,261cons /25,384,589std; same cuts.
// Both lookup bodies747; minimum sampled native input margin93,286.
// GPT-6.1 Sol follow-up at Kallisti's request; Grothy/Grok attribution retained.
export const bchGroth16IntratxPairfold5DenslessMsmSlimCacheProfiles =
  ['raw-dbl', 'raw-madd', 'raw-both', 'orbit', 'orbit-retained'].map(profile => slim(
    `${id}-${profile}`, `${name} (${profile})`,
    `src/bch/groth16-intratx-pairfold5-densless-msm-slim-${profile}-vectors.json`,
  ));

// Shared-prime packed GLV components; source fa3167c70bebff30fcc860b2b71b7557c1f488ed.
// MSM_SIGNED_RR=1 removes OVER ADD: rr=s2-aY, congruent to old s2+P-aY.
// For canonical field inputs, nx dividend>=3 and existing signed ny normalization
// yields identical canonical XYZ; h/nz/u2!=aX and caller/state guards unchanged.
// Exact145B MADD fingerprint; output143B. No arbitrary noncanonical-helper claim.
// Compiler efc6ab80d9cbbea06c3c364b8fd5e915b9da84b4; MSM_CASHC, RESCHEDULE=on.
// MSM_CONSTANT_HOISTING=all, MSM_PACKED_DIGITS=1, MSM_GLV_COMPONENTS=1, MSM_GLV_PAIRS=0.
// SLIM_COMMUTATIVE_MUL=1, SLIM_CACHE=orbit-retained, SHARED_PRIME_PROFILE=orbit-retained.
// MSM_SIGNED_RESIDUE=madd-ny; split37/cuts27,36,47,55/fullpins; GENESIS_PAD=0/STAGE_PADS=0,0,0,0.
// 33313 script +235 overhead =33548bytes; spend wire33373bytes.
// Primary native24870745consensus/24935641standard.
// Max sampled native25673140/25738036; minimum margins17240/5080.
// Full36fixedproofs passbothmodes; eachmatchedcontext saves12B and3561..33796nativeunits.
// Primary saving30547; component cost varies and can increase; finite corpus only.
// Native208contexts84accept/124reject/420prices; fresh owning100contexts12accept/88reject.
// All proof/witness/public/aux/quotient/MSM values and44retained malformed cases fixed.
// Empty unused genesis argument OP_0 remains; no nonempty zero-padding payload.
// DisableMSM_SIGNED_RR andrestoreGENESIS_PAD=10 to reproduce prior33560bytepoint.
// Sixothernative, BNsingletons/spec and BLS artifacts unchanged. No universalresource/theorem claim.
// Locking SHA256 input0..4:
// 0: c226a4c1cab05853074a39b1076c7b8e04a3a5928172ef4d45da3d869ff9a8dc
// 1: c226a4c1cab05853074a39b1076c7b8e04a3a5928172ef4d45da3d869ff9a8dc
// 2: c226a4c1cab05853074a39b1076c7b8e04a3a5928172ef4d45da3d869ff9a8dc
// 3: 6da87fba54a0dd79d9db4db7e6da528a65cde14848ebad05d4f484818e357528
// 4: bef8bbccff22e4c376c47c8cc4078402b006b99b982e665eb8f0ea35976dd941
export const bchGroth16IntratxPairfold5DenslessMsmSlimSharedPrime = slim(
  `${id}-shared-prime`, `${name} (shared-prime orbit-retained companion)`,
  'src/bch/groth16-intratx-pairfold5-densless-msm-slim-shared-prime-vectors.json',
);

// Folded GLV pairs; source fa3167c70bebff30fcc860b2b71b7557c1f488ed.
// MSM_SIGNED_RR=1 removes OVER ADD: rr=s2-aY, congruent to old s2+P-aY.
// For canonical field inputs, nx dividend>=3 and existing signed ny normalization
// yields identical canonical XYZ; h/nz/u2!=aX and caller/state guards unchanged.
// Exact145B MADD fingerprint; output143B. No arbitrary noncanonical-helper claim.
// Compiler efc6ab80d9cbbea06c3c364b8fd5e915b9da84b4; MSM_CASHC, RESCHEDULE=on.
// MSM_CONSTANT_HOISTING=all, MSM_PACKED_DIGITS=1, MSM_GLV_COMPONENTS=1, MSM_GLV_PAIRS=1.
// SLIM_COMMUTATIVE_MUL=1, SLIM_CACHE=orbit-retained, SHARED_PRIME_PROFILE=orbit-retained.
// MSM_SIGNED_RESIDUE=madd-ny; split37/cuts27,36,47,55/fullpins; GENESIS_PAD=0/STAGE_PADS=0,0,0,0.
// 33318 script +235 overhead =33553bytes; spend wire33378bytes.
// Primary native24851001consensus/24915897standard.
// Max sampled native25654082/25718978; minimum margins17220/5060.
// Full36fixedproofs passbothmodes; eachmatchedcontext saves12B and3561..33796nativeunits.
// Primary saving30547; component cost varies and can increase; finite corpus only.
// Native208contexts84accept/124reject/420prices; fresh owning100contexts12accept/88reject.
// All proof/witness/public/aux/quotient/MSM values and44retained malformed cases fixed.
// Empty unused genesis argument OP_0 remains; no nonempty zero-padding payload.
// DisableMSM_SIGNED_RR andrestoreGENESIS_PAD=10 to reproduce prior33565bytepoint.
// Sixothernative, BNsingletons/spec and BLS artifacts unchanged. No universalresource/theorem claim.
// Locking SHA256 input0..4:
// 0: 19b23fdc2d6fb347f43d9b6d7f79dced7d9ee2919f99d1f02ca627be85b5b1f1
// 1: 19b23fdc2d6fb347f43d9b6d7f79dced7d9ee2919f99d1f02ca627be85b5b1f1
// 2: 19b23fdc2d6fb347f43d9b6d7f79dced7d9ee2919f99d1f02ca627be85b5b1f1
// 3: 81861ef0ff302501b971dfa82520c353f105db2589d4f76be5fec370de75f9d2
// 4: c3348644b1fb8c6aef092ef4fbebf3cc7a71e0aa5b99cb65277ef236378e2a02
export const bchGroth16IntratxPairfold5DenslessMsmSlimGlvPairs = slim(
  id+'-glv-pairs', name+' (folded GLV pairs)',
  'src/bch/groth16-intratx-pairfold5-densless-msm-slim-glv-pairs-vectors.json',
);
