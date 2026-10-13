# Experimental current-rules VMLA calculation package

This package supports offline calculation of the recorded base100 current-standard and current-consensus results. It preserves every original registration, supplemental reference and emitted row, including script rejection and null policy timing. It does not execute a VM or replace the complete private native-provenance archive.

Verify `package-manifest.json` against the hash supplied with the eventual published release. Verify the bundled `unpack.py` hash against its entry in that authenticated manifest before executing it. Unpack into a fresh absolute directory:

```sh
python3 -B unpack.py --package /absolute/downloaded/package \
  --manifest-sha256 PUBLISHED_PACKAGE_MANIFEST_SHA256 \
  --output /absolute/fresh/unpacked
```

The unpack result prints the two original catalog manifest hashes. Use the corresponding hash for each mode:

```sh
python3 -B /absolute/fresh/unpacked/parser/portable.py reparse \
  --catalog /absolute/fresh/unpacked/catalogs/standard \
  --catalog-manifest-sha256 STANDARD_CATALOG_MANIFEST_SHA256 \
  --timing-dir /absolute/fresh/unpacked/raw/standard \
  --output /absolute/fresh/standard-report
```

Repeat for consensus. No `--reference-report`, private workspace or original benchmark executable is required for this public calculation path. A root-side original-report comparison is a distinct prepublication check; the public-only commands must also actually pass on the staged package before publication. No actual download location or completed public reproduction is claimed by this source template.

Each mode contains six processes, each with three evaluations of two cached all-input passes. Read `study.md` for absolute ms/ns-per-byte, same-case annual/current/bare ratios, denominator ranges and the exact timer boundary. Complete pre/post outcome vectors and all observations remain in the raw streams. Source code and raw metadata retain historical local paths as provenance only; the calculation code does not execute those paths.

Raw loader stderr and unrelated host process-census files are intentionally omitted. Their original hashes remain in the authenticated raw/archive inventories; omitted bytes have not been revalidated by this subset. Published job receipts retain relevant own-process library paths, flags, process walls and lifecycle summaries. The smaller package does not independently re-establish runtime loading, host isolation or full native provenance.

`native-source-map.json` identifies the exact measured driver/harness and build receipts. Clean native rebuilds, relocated source wrappers and new measurements remain separate unvalidated procedures requiring fresh build/library/source controls and readiness. No new measurement or memory, global-ceiling, whole-transaction/network or50/20-safety conclusion follows from offline reproduction.

Original research: GPT-6 Astra. Current calculation packaging: GPT-6.1 Sol, directed by Kallisti.

The included historical review manifests reference some private evidence members that are deliberately absent. They are preserved indexes, not a claim that this package supplies every native-provenance byte.

The included offline-review creation timestamp is incorrect author metadata (midnight precedes its source replay after05:43Z); the actual replay receipt owns its stage times. Its exact evidence hashes and reviewed results are preserved.

The primary package manifest, like its stored members, must be a regular nonsymlink file contained in the package directory. The included `evidence/offline-review-timestamp-erratum/` preserves the exact additive timestamp correction; it changes no result or original review bytes.
