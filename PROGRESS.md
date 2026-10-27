# txv5-pad — PROGRESS (wip/txv5-pad in groth16_cashscript and zk-verifier-bench; NOT merged)

Goal: a measured TXv5-as-written figure for bch-groth16-sound-si-gls-single (BN) and
bch-groth16-bls12381-sound-si-gls-single (BLS) without touching the reviewed bch-spec artifacts.

## Done
- groth16_cashscript f87758d: chunked/txv5-pad/{derive.mjs, README.md, bn254/bls12-381 .redeem.hex + .json}.
  Variant = reviewed redeem with entry `74 52 9d` (DEPTH <2> NUMEQUALVERIFY) -> `74 53 9d 75`
  (DEPTH <3> NUMEQUALVERIFY DROP); unlocking <WQ> <WS> <pad> <redeem'>. derive.mjs asserts the
  single instruction-level edit, no introspection in code/function bodies, honest runs accepted
  (bch-spec, both modes), pad independence (len 0..20,000, zero vs random: same op-cost/iters),
  rejection tests (no pad / two pads / pad below WQ + all carried reviewed invalid vectors).
  BN redeem 11,182 -> 11,183 (sha 881ee04a...); BLS 12,793 -> 12,794 (sha a570e257...).
- bench: src/bch/*-txv5pad-vectors.json (copied from derive.mjs output), Scenario.txv5Variant,
  txv5Grade grades the variant when present (Txv5Grade.variant {description, invalidRejected,
  invalid}; Txv5Summary.variant), CLI line, docs/benchmark.md + README. tsc clean.

## Numbers (pnpm txv5, measured on the variant)
- BN: fixture 0 padded 29,294 std (+7,376) / 29,238 cons; worst = worst-case proof 29,307 std;
  all 5 honest runs standard; variant invalid 18/18 rejected (TXv5, budget lifted).
- BLS: fixture 0 padded 32,721 std (+6,234) / 32,654 cons; worst = extra proof #2 34,994 std;
  all 7 honest runs standard; variant invalid 19/19 rejected.
- Equal to the previous estimates (the estimate rule was exact here: size is set by op-cost).
- Minimality (scratch/minimal.ts): one pad byte less rejects on real TXv5 (both modes, both curves).
- bch-spec score unchanged (21,915 BN).

## Next (Apply step, not this task)
- Regenerate (ONLY_IMPLS for the two ids: their inputHash changes via the new vectors file).
- Site: status becomes 'padded' / estimated false automatically; mention the variant in the
  tooltip (summary.variant), update solutions.tsx comments (lines ~27-36: "also an estimate
  (DEPTH == 2 pins ...)") and TXV5_BEYOND_SHIPPED notes (sweep maxima are still estimate-rule
  figures; BN 29,515 / BLS 35,273 could now be measured on the variant via sweep witnesses).
