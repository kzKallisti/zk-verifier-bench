# Benchmark harness

Goal: compare verifier implementations on a level field, including ones that
span **multiple inputs and transactions**. The unit of execution is a **Step**
(one locking + unlocking pair = one input's script evaluation). A single-tx
verifier is one Step; every other structure is an ordered list of Steps whose
cross-step continuity the harness reproduces faithfully (see *Structures*
below).

For each implementation the harness:

1. **proves correctness** — the valid run is fully ACCEPTED and every invalid
   run REJECTED, on the BCH 2026 VM with limits loosened (so even oversized
   verifiers run to completion);
   maintainer red-team attacks from `src/bch/redteam/<id>.json` (when present)
   must be rejected too, see [public-input-binding.md](public-input-binding.md);
   an entry that declares where its public inputs live (`publicInputs`) must
   reject the transaction when they are re-encoded with other values (+1, -1, 0,
   swapped, n + r); every shipped valid proof, not only the primary one, must
   pass the standard VM for the entry to count as standard; and intra-tx entries
   get a layout review that lengthens every zero pad and reports siblings that
   break (a fixed-offset read past a free-length push, see
   [public-input-binding.md](public-input-binding.md#layout-review));
2. **measures cost** — per-step and aggregate bytes, op-cost, padding, and
   serialized-tx overhead; and
3. **checks deployability** — replays the valid run on the real consensus VM
   (`bchCompatible`) and the standard/relay VM (`fitsBchStandardness`).

Correctness gates the cost numbers. Results are grouped into separate
leaderboards by category (`full` / `partial` / `spec` / `demo`) and curve; the
score is total on-chain bytes.

Run it: `pnpm benchmark`. Positional args are substring filters on the entry id
(`pnpm benchmark genpow`, `pnpm benchmark singleton chunked`); `--demos`
includes demo entries. The JSON exporter (`pnpm benchmark:json`) intentionally
takes no filter: `results.json` and `score-history.json` are complete
artifacts.

## The VMs

The VM constructors in `src/harness/vm.ts`:

| VM | used for |
|----|----------|
| `createLoosenedVm` | correctness + op-cost measurement (every ceiling lifted, so oversized entries run to completion) |
| `createRealVm` | consensus limits → the `BCH compatible` verdict |
| `createStandardVm` | mempool-relay policy → the `fitsBchStandardness` verdict |
| `createRealVmSpec` / `createStandardVmSpec` | the proposed **bch-spec** VM (100,000-byte scripts, op-cost budget `(10,000 + len) × 800`); grades `vm: 'bch-spec'` entries |
| `createRealVmTxv5` / `createStandardVmTxv5` | **TXv5 as written** (CHIP-2025-01 v1.0.0): BCH 2026 rules with 100,000-byte scripts and stack elements, density base still 41, so the op-cost budget is `(41 + len) × 800`; the standard unlocking cap of 100,000 B is an assumption. Adds the `txv5` grade to `vm: 'bch-spec'` entries (bench issue #35) |

`no (reason; ~N steps by op-cost)` on the compatibility column gives the first
consensus limit hit (`script-size`, `op-cost`, `stack-depth`, ...) and how many
standard inputs the op-cost alone implies (`ceil(maxStepOpCost / 8,032,800)`,
one input's budget at the 10,000-byte unlocking cap).

## The contract

An implementation is an `Implementation` (see `src/harness/types.ts`) whose
`load()` returns a `Scenario`:

```ts
export const myImpl: Implementation = {
  id: 'my-impl',
  name: 'My verifier',
  proofSystem: 'Groth16',
  field: 'BN254',              // or 'BLS12-381', '-'
  structure: 'multi-tx',       // 'single-tx' | 'multi-tx'
  source: 'generated | txid | repo',
  proofBinding: 'runtime',     // or 'baked' (proof compiled into the chunks)
  vm: 'bch-2026',              // or 'bch-spec' (graded on the spec VM instead)
  load: async () => ({
    valid: [ /* ordered steps; ALL must be accepted */ ],
    extraValidProofs: [ /* distinct proofs vs the SAME locking (generality) */ ],
    worstCaseProof: [ /* dense near-r inputs; op-cost recorded separately */ ],
    invalid: [ /* full step-lists that MUST fail */ ],
    invalidInputs: [ /* off-curve / out-of-subgroup points; MUST fail */ ],
    tamperable: true,          // else: derive invalid runs by bit-flipping witnesses
  }),
};
```

Register it in `REGISTRY` in `src/harness/benchmark.ts`.

- **Correctness.** The valid run must have every step accept. Invalid runs are
  given explicitly and/or, if `tamperable`, derived by flipping a bit in each
  step's witness (works when witnesses are push-only data). A run is "rejected"
  if any of its steps fails.
- **Proof-generality.** `proofBinding: 'runtime'` claims one deployed program
  verifies any proof for its VK; where `extraValidProofs` are supplied the
  harness proves it (N/N distinct proofs accepted against the one fixed
  locking). See `docs/proof-generality.md`.
- **Worst case.** Op-cost is proof-dependent for the chunked verifiers, so the
  committed proof alone understates it; `worstCaseProof` runs dense inputs
  through the same locking and the result is reported as `worstCase`.
- **Input validation.** `invalidInputs` carry well-formed witnesses with
  structurally invalid curve points (off-curve, or on-curve but outside the
  order-r subgroup); EIP-197-style validation must reject them all.

## Structures

A step optionally carries one of three deployment contexts (`Step` in
`types.ts`), and the harness builds the matching synthetic transaction:

- **`covenant`** — token-threading covenant chain: the running state lives in
  the spent/created NFT commitment; one fixed program per chunk, one 1-in/1-out
  token transaction per step. `tokenSafetyEnforced` reports whether the
  covenant actually pins category/capability continuity.
- **`intraTx`** — all chunks are inputs of ONE shared transaction, binding each
  other by reading sibling unlocking bytecode via `OP_INPUTBYTECODE`. State
  passes as raw byte blobs — no 128-byte commitment limit, no hashing.
- **`grouped`** — the hybrid: intra-tx binding within each of a handful of
  standard (<100,000 B) transactions, NFT-commitment hand-off between them.

Bare steps (no context) are evaluated standalone; cross-step continuity is
whatever the scripts enforce (e.g. the hash256 chain in the demo).

## Metrics

(For why op-cost and the consensus/standard/bch-spec gaps are measured at
all, see *Why these measures* in the README.)

- **score** = total on-chain bytes: locking + unlocking + per-structure
  serialized-tx overhead (`txOverheadBytes` — envelope, outpoints, varints,
  CashToken output prefixes), so single-tx, covenant-chain, and grouped entries
  compare fairly. All-zero padding pushes that exist only to buy op-cost budget
  are counted in the score but surfaced separately (`padBytes`).
- **op-cost** is read from the loosened VM; `worstCase` op-cost from the dense
  proof run. For `vm: 'bch-spec'` entries the budget uses the spec formula.
- **BCH compatible** = every step of the valid run validates on the real VM
  for the entry's target (`bch-2026` or `bch-spec`).
- **txv5** (bch-spec entries only) = the same transaction graded on TXv5 as
  written. libauth's `BCH_SPEC` also raises the density-control base from 41 to
  10,000, which TXv5 does not propose, so a bch-spec entry can be valid on
  `BCH_SPEC` and refused on TXv5. The grade records whether the shipped
  transaction validates (consensus and standard) and, if not, the minimal zero
  padding that makes every input fit both the op-cost limit `(41 + len) × 800`
  and the hash-iteration limit `floor(f × (41 + len))` (f = 0.5 standard, 3.5
  consensus), and the padded score. Padding follows the `padBytes` convention:
  one all-zero push at the pad position (before the redeem script under P2SH,
  last otherwise) is lengthened, or a new one is inserted there; an all-zero
  push anywhere else is never treated as a pad. The scripts do not check the
  pad's content (any bytes of the same length are accepted); the grade uses
  zeros. The padding is a least fixpoint measured on a TXv5 VM with the budget
  lifted, then replayed on the real TXv5 VM. An entry whose script rejects any
  pad push (a pinned push layout, e.g. `DEPTH == 2`) is reported as not
  paddable as shipped, with an estimate for a pad slot: the measured op-cost
  plus one push and one `OP_DROP`. The estimate leaves out the few bytes of
  script a pad slot needs (an `OP_DROP` or a changed `DEPTH` constant) and,
  for multi-input entries, the extra introspection cost of a larger sibling.
  Every honest run is graded (fixture 0, each extra valid proof, the
  worst-case proof). On TXv5 a padded run's size is set by its op-cost (each
  padded input ends near `ceil(op / 800) − 41` bytes whatever its shipped
  length) and a run that validates as shipped costs its shipped size, so the
  TXv5 worst case is the honest run with the largest TXv5 figure, which need
  not be the bch-spec worst-case witness. `txv5.honest` lists each run's
  figure (score, mode, and the `txBytes` of the same mode) and `txv5.summary`
  gives fixture 0's figure, the TXv5 worst case (`worst`: an invalid run if
  any, else the largest figure over ALL honest runs, as-shipped ones
  included), `worstPadded` (the heaviest run that needs padding, when it is
  not `worst`), `mixed` when honest runs fall on both sides of the budget,
  and `standard`, which is true only if every honest run's figure is
  standard. The worst case is over the shipped honest proofs only; an honest
  witness outside them can be heavier (e.g. intratx-residue-large's
  max-density GLV witness, which is not shipped). Current not-paddable
  entries: both `sound-si-gls-single` builds (BN254 and BLS12-381) pin
  `DEPTH == 2` at entry, so their TXv5 figure is "not paddable as shipped;
  estimate X"; the reviewed artifacts are left as shipped. The
  residue-large max-density GLV witness (all four decomposition scalars
  2^128 − 1, ≈104,860 B consensus on TXv5 against 101,215 B for the heaviest
  shipped proof) is not exported as its `worstCaseProof`: a full honest proof
  for it exists (`groth16-singleton-multiproof-vectors.json`
  `glvDensityProof`, same public input `(s + s·λ) mod r`), but shipping it
  means rebuilding the entry's vectors with `build_vectors_residue_large.mjs`
  (the compiler-fork build and the entry's gates), and it would also change
  the entry's bch-spec worst case, which is a builder change for that entry,
  not a grading change. The site carries the measured bound instead
  (`TXV5_BEYOND_SHIPPED`). Transaction sizes use the
  harness's v1/v2 serialization; TXv5's v5 encoding is a few bytes smaller
  per input and output, so the figures slightly overstate a v5 transaction
  (no current standardness verdict is within that margin). Assumptions: the standard unlocking cap is 100,000 B (TXv5's
  rationale, not its text), and the VM number limit stays 10,000 B because
  TXv5 v1.0.0 does not mention it (`BCH_SPEC` uses 100,000); no current grade
  depends on the latter. `pnpm txv5 [id ...]` prints the grade without
  touching `results.json`.
- **standardness** = every complete transaction also passes the standard/relay
  VM. An intra-tx bundle can be standard when its total transaction size remains
  below policy limits; grouped entries report standardness for every group.
- **secure packaging** — P2SH20 packaging is flagged (collision-attack
  surface).
- **Checkpoint cost.** Tag a step with `checkpoint: "<label>"` and the
  benchmark reports the cumulative op-cost + bytes to reach it, printed under
  the row — implementations compete per-milestone, not just on the total. See
  `docs/checkpoints.md`.

## Entries

~40 entries are registered across two curves (BN254, BLS12-381), five
structures (singleton, chunked, covenant chain, intra-tx, grouped), the
optimization variants (`-opcode-optimized`, `-genpow`, `-minop`, `-residue`,
GLV vk_x), the `bch-spec` 100 kB builds, the `vkx-*` / `pairing-*` partial
milestones, and the two BSV reference baselines (`nchain`, `scrypt-bn256`).
See the family table in the top-level README; current scores live in
`results.json`.
