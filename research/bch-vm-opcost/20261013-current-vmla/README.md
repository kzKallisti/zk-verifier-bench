# Experimental current-rules VMLA timing

This companion study examines useful verifier contracts and the validation work admitted by BCH VM accounting. Base 100 remains the deployment reference; 50 and 20 remain experimental. This dataset recalculates recorded base-100 measurements of the complete VMLA registration corpus under the pinned current standard and consensus script modes. It supplements the [selected BLS study](../20261012-bls/README.md).

Both modes retain all 3,254 original registrations and their supplemental annual references. All 117,234 emitted rows are supplied, including script failures and 2,700 standard policy-rejection receipts with null script timing. Policy rejection is not recorded as zero verification time.

On the shared M4 Max, accepted 1-of-3 bare-multisig cases had the largest median process-mean time per byte among the original script registrations in each mode:

| Mode / original case | Cached VerifyScript ms | ns per spending byte |
|---|---:|---:|
| standard / 2025 `l0fhm3_S_S` | 67.469 (64.138–68.562) | 674.771 (641.459–685.703) |
| consensus / 2026 `l0fhm3_S_S` | 67.842 (64.795–68.656) | 678.500 (648.027–686.639) |

Each transaction has 99,988 spending bytes. Values are median (minimum–maximum) of six process means. These are finite cohort observations, not a global accepted-work ceiling. The two modes were measured separately.

The [detailed study](package/study.md) gives the same cases' matched annual, current `trxhzt` and accepted-bare ratios, their absolute denominators, flags and observed ranges. It also explains the real-signature cached `VerifyScript` boundary, three evaluations × two all-input passes per process, counterbalanced registration order, and separate setup and process wall times. No replacement schedule, VM memory requirement, full-block performance or safety conclusion follows from this dataset.

## Recalculate the recorded results

The [package manifest](package/package-manifest.json) authenticates 61 stored calculation files: 34,173,488 bytes compressed/copied, expanding to 666,339,638 bytes. The largest stored file is 5,659,209 bytes. Python's standard library is sufficient; neither the original private workspace nor a native benchmark executable is used by these commands.

Verify the package manifest's SHA-256 is `65f86ce2021f97d9dd537e337f1c101775caed807e73c0d25cd283ac0ccf6fbf` and the bundled unpacker's is `2713124caaac97068712258d4738a7c611a0bb3c1ea6c98208fc07f3273cf587`. From this directory, use fresh absolute output paths and an empty Python cache prefix:

```sh
PYTHONPYCACHEPREFIX=/absolute/fresh/import-cache python3 -B package/unpack.py \
  --package "$PWD/package" \
  --manifest-sha256 65f86ce2021f97d9dd537e337f1c101775caed807e73c0d25cd283ac0ccf6fbf \
  --output /absolute/fresh/unpacked

PYTHONPYCACHEPREFIX=/absolute/fresh/import-cache python3 -B /absolute/fresh/unpacked/parser/portable.py reparse \
  --catalog /absolute/fresh/unpacked/catalogs/standard \
  --catalog-manifest-sha256 16dca2ae2381bdd0b15c5ac37ffbb076d7d9cb3eccb845e3d9574a460a19a819 \
  --timing-dir /absolute/fresh/unpacked/raw/standard \
  --output /absolute/fresh/standard-report

PYTHONPYCACHEPREFIX=/absolute/fresh/import-cache python3 -B /absolute/fresh/unpacked/parser/portable.py reparse \
  --catalog /absolute/fresh/unpacked/catalogs/consensus \
  --catalog-manifest-sha256 dfdd0047f1254322a2f8b7004ce6c9d13f88dd9f875ae72ec07cc094a7722210 \
  --timing-dir /absolute/fresh/unpacked/raw/consensus \
  --output /absolute/fresh/consensus-report
```

The exact bundled functions were executed under a reviewed, bounded runner with no private reference-report input. Both generated reports matched the previously independently reviewed reports byte for byte: standard `c820156038ac2d25df1f7e1b50bf73a7014832da6d87453591cc77c716479d74` and consensus `51b82ff7d2b664c72fda8d037a007d11f21e1d2d35e5a23ed04667f484eb6d55`. The [receipt](publication-evidence/public-replay-receipt.json) and [completed review](publication-evidence/public-replay-output-review.json) retain this verification. The 31.112-second reproduction process wall is an offline calculation diagnostic.

The frozen package's README, study and receipts retain their earlier preparation-state wording. This page records the subsequent completed reproduction. Review manifests preserve original evidence indexes; some private members are deliberately absent. Loader stderr and host process censuses are omitted and identified explicitly, so the package does not replace complete native provenance. Native rebuilds and new measurements remain separate unvalidated procedures; see [source mapping](package/native-source-map.json). An additive timestamp erratum preserves and qualifies incorrect historical review metadata.

Original research and implementation: **GPT-6 Astra**, directed by Kallisti. Full-cohort analysis, calculation packaging and publication continuation: **GPT-6.1 Sol**, directed by Kallisti. All findings remain experimental.
