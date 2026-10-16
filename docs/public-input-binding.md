# Public-input binding and the maintainer red-team gate

A Groth16 verifier proves a statement: "this proof is valid **for these public
inputs**". Checking the pairing equation is only half of it. The verifier must
also compute, or soundly check, `vk_x = IC0 + n0*IC1 + n1*IC2` from the public
inputs it claims. If `vk_x` is not tied to those inputs, anyone holding one valid
proof can claim it proves any statement they like.

## The PairFold finding (Oct 2026)

The PairFold family does not compute `vk_x` in-script. Its genesis input takes
`vk_x` as a witness, together with a 704-byte auxiliary polynomial blob, and checks
a log-derivative ("rational differential") identity at a Fiat-Shamir point. That
identity holds for **arbitrary multiplicities**, so passing it does not imply that
`vk_x` equals `IC0 + n0*IC1 + n1*IC2` for the claimed `n0, n1`.

kallisti found this while rebuilding the densless entry and withdrew that
submission (bench PR #36, groth16_cashscript PR #17). The merged entries share the
same genesis predicate. On their exact committed bytes, the following transaction is
accepted on the consensus and standard VMs:

- the real proof (A, B, C) and the **true** `vk_x`, so the pairing still holds;
- **forged** claimed public inputs (e.g. `n0 + 2`), with the auxiliary pushes
  rebuilt for them.

| entry | solver | score | forged runs accepted |
|-------|--------|------:|:--------------------:|
| `bch-groth16-intratx-pairfold5-densless` | Toorik | 33,179 | 3/3 |
| `bch-groth16-intratx-pairfold5-pevalfuse` | kallisti (rebuild) | 36,836 | 3/3 |
| `bch-groth16-intratx-pairfold5` | Toorik | 44,968 | 3/3 |
| `bch-groth16-intratx-pairfold7` | Toorik | 54,483 | 3/3 |

As a control, the same claimed inputs with `vk_x` honestly recomputed for them
(which no longer matches the proof) are rejected. So the hole is specifically that
the claimed inputs are not bound to `vk_x`.

These entries now fail the correctness verdict. They stay listed but are
excluded from the frontier and the score history until a fixed revision rejects
the attacks.

## A repaired entry

`bch-groth16-intratx-pairfold5-densless-msm` keeps the reconstructed densless verifier, slices
the dead predicate out of its genesis, and adds two inputs that recompute
`vk_x = IC0 + n0*IC1 + n1*IC2` from the claimed public inputs (GLV Straus); the terminal requires
the genesis `vk_x` to equal their result. Its red-team file (written by the source's
`redteam.mjs`, since the PairFold generator here no longer matches its layout) rejects forged
public inputs, adaptive forgeries with a valid MSM witness for the forged inputs, a pad-shift
forgery found in review, and invalid proof points. Source: `chunked/bn254/densless-msm` in
groth16_cashscript.

## The red-team gate

Submitters write their own `invalid` vectors. That leaves the negative set under
the submitter's control, and weak negatives (such as tampering only the P2SH
redeem push) can make a broken verifier look sound. The red-team gate adds
attacks written by the maintainers:

- `src/bch/redteam/<id>.json` holds concrete attack runs against an entry's exact
  bytes. Each run is the entry's valid run with some unlockings replaced. Every
  run must be **rejected**.
- `src/harness/redteam.ts` evaluates them inside `benchmark()`. Any accepted run
  sets the verdict to `FAIL (maintainer red-team attack accepted)`; in
  `results.json` this shows up as `correctness.verdict: "fail"`, with
  `correctness.redTeam` and a `failures` entry.
- The file pins the `sha256` of every locking it targets. If the entry is
  resubmitted with new lockings, the file is reported **stale** and not counted.
  Regenerate it to re-test the new bytes.

Regenerate the PairFold files (self-contained; finds the genesis input and the
public inputs from the entry's own pushes and checks the honest rebuild first):

```sh
pnpm exec tsx --max-old-space-size=8192 tools/forge-public-inputs.mts [id ...]
```

## For a fixed resubmission

A fix has to make the genesis check imply the group relation for the **claimed**
scalars, for example by explicit scalar multiplication or by a predicate whose
multiplicities are pinned to the claimed inputs. Before opening the PR:

1. regenerate the red-team file for your id with the command above;
2. confirm `pnpm benchmark <id>` reports `red-team: all N maintainer attack
   run(s) rejected`.

If your construction changes the genesis layout so the tool no longer finds the
auxiliary blob, say so in the PR. The maintainers will then write an attack for
the new layout.

## Coverage

Only the entries above have red-team files. The tool also matches
`bch-groth16-intratx-general`, which rejected the forgery during the
investigation; it has no file yet because that result has not been confirmed as
real input binding rather than a layout mismatch. Entries with other `vk_x`
mechanisms (crown8, the residue family, the singletons, BLS12-381) have not been
attacked this way. A missing red-team file means "not attacked", not "proven
sound".
