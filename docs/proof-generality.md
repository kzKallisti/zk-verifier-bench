# Proof generality: runtime-general vs instance-specific

A Groth16 verifier on-chain can bind the proof to the program in one of two ways,
and the difference matters more than raw byte counts:

- **runtime-general** — the proof `(A, B, C)` and public inputs arrive *push-only*
  in the unlocking (witness) script at spend time. One deployed locking script
  is intended to verify any valid proof in its declared verifying-key (VK) and
  input domain. This is how the
  references (`nchain`, `scrypt-bn256`) and our **singleton** verifiers work.
- **instance-specific** — the proof is **baked into the locking program**. Some
  chunked constructions commit each step's carried state (`hash256` of the
  intermediate Miller / final-exp values) into the chunk scripts, so the program is
  specialized to one proof; a different proof needs the chunks regenerated.

Deployment structure alone does not determine this property: chunked,
intra-transaction and grouped constructions may also be runtime-general.
Read the entry's `proofBinding` and its exact construction argument.

Both can verify on-chain under their declared equations and assumptions. A
soundness argument, rather than the fixture sweep alone, establishes what an
invalid proof cannot satisfy. The deployment models differ, so their byte
totals are not directly comparable — see
"Not every Groth16 is alike" in the [README](../README.md).

The benchmark **reports this distinction empirically** instead of treating the
fixture sweep as a universal theorem. Multiproof coverage demonstrates the
declared runtime behavior for the supplied proofs; it does not replace the
written equation argument and independent review for the exact artifact. A
dense `worstCaseProof` is likewise a measured valid case, not a universal
resource bound. See the [submission claim sheet](submission-claims.md).

## How the harness checks it

Each `Implementation` declares a `proofBinding: 'runtime' | 'baked'`
(`src/harness/types.ts`). For verifiers whose trusted setup we control, the
scenario also carries `extraValidProofs: Step[][]` — additional *distinct* valid
proofs intended to run against the **same** ordered programs. The harness
(`src/harness/benchmark.ts`):

1. runs the main valid proof (proof #0),
2. executes each supplied `extraValidProofs` run using that run's own steps,
3. reports `proofsTested` / `proofsPassed` and a one-line verdict:
   - `runtime` + N/N pass → **"runtime-general — one fixed locking verifies N/N
     distinct proofs"** (a coverage label for those supplied proofs),
   - `runtime` + only 1 proof available → **"runtime-general by construction"**
     (the references; we cannot mint proofs for a VK whose setup we do not hold;
     this label is a declared construction property, not a review status or a
     universal conclusion from one run),
   - `baked` → **"instance-specific — the proof is baked into the program"** (the
     supplied per-step tamper test checks the committed witness path).

A program that *claimed* runtime-generality but had the proof baked in would be
exposed by this supplied sweep if it accepted only 1 of N. That result is
coverage, not a universal theorem. The `generality` block is also emitted into
`results.json` (`src/harness/export-json.ts`) for the website.

**Current implementation limit:** the harness does not compare extra runs'
locking bytecode, step counts or proof distinctness with the primary run. The
same-program/distinct-proof conditions are requirements of the scenario
contract, which submitters and reviewers must check separately. The displayed
counts alone do not establish even that finite fixed-program coverage. The
same identity check is needed for a supplied `worstCaseProof`.

## How the extra proofs are minted

The generators are
`groth16_contract/singleton/bn254/gen_multiproof.mjs` (BN254) and
`groth16_contract/singleton/bls12-381/gen_multiproof.mjs` (BLS12-381).

The key idea: **hold the VK fixed so the locking is unchanged, and only vary the
proof.** Because the singleton locking bakes the VK (`alpha, beta, gamma, delta,
IC`) and nothing else, every minted proof reuses the *byte-for-byte same*
`lockingOK` — only the unlocking witness (`A, B, C, in0, in1`) differs. That is
exactly the runtime-general property under test.

We do not need a real circuit or prover, because we know the trusted-setup scalars
(the same ones `src/checkpoints/gen-pairing-vectors.ts` / the BLS `bls_instance.mjs`
used to construct the committed instance). These are synthetic equation-valid
fixtures, not application-circuit proofs. They establish no circuit knowledge,
setup integrity, or application-level zero-knowledge claim. The Groth16 pre-final-exp product is

```
e(-A,B)·e(alpha,beta)·e(vk_x,gamma)·e(C,delta)
  = e(g1,g2) ^ ( -a·b + alpha·beta + vkx·gamma + c·delta )      (scalars mod r)
```

so `finalExponentiate(product) == 1` iff that exponent ≡ 0 (mod r). To mint a fresh
valid proof under the fixed VK we pick new public inputs and a new random `a, b`,
then **solve for the one remaining scalar** in the exponent so the sum is zero:

- **BN254** (`gen_multiproof.mjs`): pick `in0, in1, a, b`; with
  `vkx = ic0 + in0·ic1 + in1·ic2`, solve
  `c = (a·b − alpha·beta − vkx·gamma) · delta⁻¹ (mod r)`.
  Materialize `A = [a]G1, B = [b]G2, C = [c]G1`.
- **BLS12-381** (`gen_multiproof.mjs`): the committed instance fixes `B = 1·G2`, so
  we pick `in0, in1, c` and solve `A` instead:
  `A = alpha·beta + vkx·gamma + c·delta (mod r)`, with `B = G2`, `C = [c]G1`.

Each minted proof is checked **two ways** before it is written:

1. in `@noble/curves` (the oracle) — `pairingBatch(..., true) == Fp12.ONE`, and the
   tampered variant (`in1 + 1`) must *not* verify;
2. on the **loosened BCH 2026 VM**, executed against the actual committed
   `lockingOK` — the witness must be ACCEPTED and the tampered witness REJECTED.

The generators also re-derive the VK from the scalars and assert it equals the
committed VK, so a mismatch (which would mean the locking is for a different VK)
fails loudly rather than silently producing a proof the locking can't verify.

Output (read by the singleton implementations):
`src/bch/groth16-singleton-multiproof-vectors.json` and
`src/bch/groth16-bls12381-singleton-multiproof-vectors.json` — each a shared
`lockingOK` plus a `proofs[]` array (`proofs[0]` is the committed instance;
`proofs[1..]` the minted extras). PRNGs are seeded deterministically, so the output
is reproducible.

## Regenerating

```sh
# from the groth16_contract repo (writes into ../verifier/src/bch/)
node singleton/bn254/gen_multiproof.mjs              # EXTRA_PROOFS=3 by default
node singleton/bls12-381/gen_multiproof.mjs

# then, from the verifier repo
pnpm benchmark          # see the "proof generality" lines
pnpm benchmark:json     # refresh results.json (adds the generality block)
```

Set `EXTRA_PROOFS=N` to mint more/fewer (each extra proof is a full singleton VM
evaluation, ~3.5–4 s, so the default of 3 keeps the benchmark snappy while still
demonstrating N≥2 coverage).
