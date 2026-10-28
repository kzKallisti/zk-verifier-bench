# wip/leftovers (bench)
Base: origin/main d01ae89.
- [x] 1 singleton-fs header: "161/2^256" replaced by the README section 5 bound in named-term form with the
  singleton's numbers (24 relations, degrees 23/137, q132; N0 < 2^22; q_V = 1,104 per spend, measured
  with an instrumented libauth VM on the shipped locking + committed fixture). review-status.ts reason
  for singleton-fs states the same bound. tsc clean; singleton-fs inputHash unchanged (754e39b5...).

## Finalize
- Applied the reviews' non-blocking wording fixes: the sentence split in verifiers.md, "bare as benchmarked" (P2SH32 adds 1 setup and 2 verifier hashes), a clause on the flat affine PIC factors, and fixed-shape loops for q_V.
