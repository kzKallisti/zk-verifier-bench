// BLS12-381 Groth16 genpow singleton, recovered symbolic source, compact IDs, SZ-a1, SM-a2, SV-a2, TB-a3, TJ-a2, TR-a2, and TW-a1..a4, UE-a1..a4.
//
// Oct 16, 2026: main is prefixed with a public-input range check, 0 <= n0, n1 < r with
// r = x^4 - x^2 + 1 from curveSeedAndScalarMinusOne (+17 bytes, 3,432-byte locking, sha256
// b994fd7c4646465636bb88a9ff0f4437bb744758d94fd734b90e2b9429d34e46). Without it the
// public-input gate accepted n0 + r and n1 + r. SZ-a1 keeps this guard and emits 3,422 bytes;
// SM-a2 outlines six repeated stack sequences and emits 3,414 bytes; SV-a2 swaps the
// raw IDs of that helper and decompressG2 and emits 3,412 bytes; TB-a3 outlines 41
// repeated field multiplication/modulo sequences as mulFp and emits 3,341 bytes.
// TJ-a2 outlines ten two-roll sequences and swaps its helper with fp6Mul, emitting 3,333 bytes;
// TR-a2 outlines nine six/seven-roll sequences and swaps its helper with fp2Scale, emitting 3,328 bytes;
// TW-a1..a4 add four measured outlines; UE-a1..a3 add three further stack outlines, emitting 3,310 bytes.
//
// Full final exponentiation f^E == Fp12.ONE, E = (p^12-1)/r, over the raw
// four-pair Miller product. vk_x is recomputed on-chain. The unlocking carries
// compressed proof coordinates and two public inputs; no residue witness or
// Fiat-Shamir polynomial-identity test is introduced.
//
// The current range-closed baseline is 3,432 bytes; SZ-a1 inlines four low-fanout helpers
// after compact IDs and the range guard, then SM-a2 outlines a repeated stack sequence.
// SV-a2 swaps the raw IDs of stackSequence52 and decompressG2 and produces 3,412 bytes;
// TB-a3 outlines 41 repeated field multiplication/modulo sequences as mulFp and swaps
// mulFp with fp6Add, producing 3,341 bytes; TJ-a2 adds stackSequence53=-1 and
// moves fp6Mul to 19, producing 3,333 bytes; TR-a2 adds stackSequence54=14 and
// moves fp2Scale to 31, producing 3,328 bytes with 51 candidate functions. TW-a1..a4
// produce 3,315 bytes with 55 candidate functions; UE-a4 produces 3,310 bytes with 58. The
// selected candidate's operation cost is reported
// separately by the release gate.
// Official operation-cost qualification is recorded separately by the release gate.
// The historical compact baseline was 3,415 bytes; operation-cost qualification is reported
// separately by the release gate for the selected candidate.
// The pinned vectors contain four supplied proofs and the official changed-input mutation;
// UE-a4 acceptance/cost gates are reported separately.
// No dense fixture or isolated input-validation fixtures are supplied.
// Current-BCH compatibility and standardness remain false: this is a singleton
// byte-footprint result evaluated with the official resource ceilings lifted.
//
// The recovered original source declares all 51 function bodies and the main program;
// it builds the original locking byte-for-byte. Compact output reassigns
// fieldPrime 1->0, fp6Add 17->1 and fp6Mul 18->-1, rebuilding every immediate
// call, then SZ-a1 inlines stackSequence33, negFp, inverseFp, and fp2Sqr, and SM-a2 outlines
// stackSequence52. SV-a2 assigns stackSequence52 ID 7 and decompressG2 ID 17. TB-a3 adds
// mulFp at ID 1 and demotes fp6Add from ID 1 to ID 18. TJ-a2 outlines ten
// OP_7/OP_ROLL/OP_7/OP_ROLL sites as stackSequence53=-1 and demotes fp6Mul to 19. TR-a2
// outlines nine OP_6/OP_ROLL/OP_7/OP_ROLL sites as stackSequence54=14 and demotes fp2Scale to 31. All remaining
// calls are static and the range guard is unchanged.
// Function-table keys are raw
// bytes; empty and 0x81 keys are valid.
//
// Recovered program source:
//   singleton/bls12-381/leader-recovered/program.mjs
// Candidate builder/exporter: compact.mjs / export.mjs in the same directory.
// Source candidate revision: 326ec4acc00e9589b4ebd7bcb7c25c5640b3d12e
// Recovered program origin revision: da85bde1a3918e653e545e3d588f8e3c7a58cd0f
// This is recovered symbolic Script source. The original CashScript compiler
// revision, search witness, replay and stackcert pipeline remain unavailable.
// The supplied witness/public-input bytes are unchanged from the original
// official genpow vectors. The source exporter records their hashes and the
// recovered-source hashes in both vector files.
//
// The original entry omits G1/G2 subgroup checks and declares cofactor-equivalent
// proof semantics. This recovered-source transformation preserves that posture; it does
// not establish a new malformed-point theorem or an input-validation grade.
//
// Current range-closed baseline locking SHA256:
//   b994fd7c4646465636bb88a9ff0f4437bb744758d94fd734b90e2b9429d34e46
// SZ-a1 candidate locking SHA256:
//   f765c89b1e98342ab58bdb80eb36b643c972346fe98c11cb36d45bd2242f8eaa
// SM-a2 candidate locking SHA256:
//   5863870d053b3ba98bf14798227baaa6d48cbd72084498a6a97b12b3e8af5ccb
// SV-a2 candidate locking SHA256:
//   5a3f91a1d952faee50eef13401fcdeb46b2bbe7bd88c15379013cdbade30cad0
// TB-a3 candidate locking SHA256:
//   167e1ab1647f8b41b12bcde2cbf17068671192d56a11be68d105254a4a28515a
// TJ-a2 candidate locking SHA256:
//   ed8909fd0ed4f6ca058eb0144eac660741bea1e5b55d0f97b6506bfe44212eaf
// TR-a2 candidate locking SHA256:
//   d0dc12d1b7ac3d50c0ba0b07462ec8b63cf9f813d0107b3c0102f5c81f695118
// UE-a4 candidate locking SHA256:
//   24f462b2345f79354be7ea5aa0ec70deb28282001eb6efe53fd7e955accdf360
// The exporter records the post-export hashes in both vector files.
import { readFileSync } from 'node:fs';
import { hexToBin } from '@bitauth/libauth';

import type { Implementation, Step } from '../harness/types.js';

const v = JSON.parse(readFileSync('src/bch/groth16-bls12381-singleton-genpow-vectors.json', 'utf8')) as {
  lockingOK: string;
  unlocking: string;
  invalidUnlocking: string;
};

// Extra DISTINCT proofs minted under the SAME VK (same locking), to confirm this
// verifier is runtime-general (one program verifies many proofs). committed:true is
// the primary vector already in `v`; the rest are the extra runtime proofs.
const mp = JSON.parse(readFileSync('src/bch/groth16-bls12381-singleton-genpow-multiproof-vectors.json', 'utf8')) as {
  proofs: { publicInputs: string[]; unlocking: string; invalidUnlocking: string; committed: boolean }[];
};

export const bchGroth16Bls12381SingletonGenpow: Implementation = {
  id: 'bch-groth16-bls12381-singleton-genpow',
  // where the claimed public inputs live (public-input binding gate, harness/gates.ts)
  publicInputs: [{ input: 0, push: 1, name: 'n0' }, { input: 0, push: 0, name: 'n1' }],
  name: 'BCH Groth16 verifier singleton, BLS12-381 genpow (full final-exp, range-checked inputs, 3,310 B, UE-a4 recovered symbolic source)',
  proofSystem: 'Groth16',
  field: 'BLS12-381',
  structure: 'single-tx',
  proofBinding: 'runtime',
  source:
    'BLS12-381 Groth16 genpow singleton with on-chain vk_x, the raw four-pair Miller ' +
    'product, and full final exponentiation f^((p^12-1)/r) == Fp12.ONE. SZ-a1 inlines ' +
    'four low-fanout static helpers after compact IDs and the range guard, then SM-a2 outlines ' +
    'six repeated stack moves. SV-a2 assigns stackSequence52 ID 7 and decompressG2 ID 17; TB-a3 ' +
    'outlines 41 repeated field multiplication/modulo sequences as mulFp and swaps mulFp with fp6Add. TJ-a2 ' +
    'outlines ten two-roll sequences as stackSequence53=-1 and moves fp6Mul to 19; TR-a2 outlines nine ' +
    'six/seven-roll sequences as stackSequence54=14 and moves fp2Scale to 31; TW-a1..a4 add ' +
    'four measured static outlines with scoped ID packing; UE-a1..a3 add three further static outlines and emit 3,310 bytes. The unlocking ' +
    'contains compressed proof coordinates and two public inputs; no residue witness ' +
    'or Fiat-Shamir PIT is added. Recovered symbolic Script source reproduces the ' +
    'original 3,425-byte leader exactly; the range-closed baseline is 3,432 bytes, SZ-a1 is ' +
    '3,422 bytes, SM-a2 is 3,414 bytes, SV-a2 is 3,412 bytes, TB-a3 is 3,341 bytes, TJ-a2 is 3,333 bytes, TR-a2 is 3,328 bytes, and TW-a1..a4 is 3,315 bytes and UE-a4 is 3,310 bytes ' +
    'with 58 candidate functions (51 in the recovered original; operation cost reported separately). ' +
    'All four supplied proof witnesses are unchanged; UE-a4 acceptance/cost gates are reported separately. The original CashScript ' +
    'compiler/search-witness/replay pipeline remains unavailable. Current BCH and ' +
    'standardness limits are exceeded. The original no-G1/G2-subgroup-check and ' +
    'cofactor-equivalent proof posture is preserved; no new malformed-point theorem ' +
    'or isolated input-validation grade is claimed.',
  load: async () => {
    const valid: Step[] = [
      {
        label: 'full BLS12-381 Groth16 verify (genpow): vk_x on-chain + finalExpPow(e(-A,B)*e(a,b)*e(vk_x,g)*e(C,d))==Fp12.ONE (single tx)',
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
