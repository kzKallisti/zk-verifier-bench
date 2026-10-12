# BN254 matched cached VerifyScript timing dataset

This directory is the public measured dataset for the reviewed BN254 32774
matched cached VerifyScript run. It contains the unchanged summary, four exact
process stdout JSONL streams, one canonical process-1 corpus, and a
standard-library corpus-order generator. The data is finite and synthetic; it
records one controlled B100/M4 run and does not represent full-node admission,
network behavior, VM memory attribution, cost50/20, fullstock3254, an opcost
optimum, or a worst-case ceiling.

The measured source revision is `a94b0ebbbfac1e025a27e39e27133017fe041ec5` and the measured
benchmark revision is `b1db0e862a95db11332ccd421d841b3c147edeba`. The host was
Darwin `arm64`, Apple M4 Max,
14 logical CPUs and 36 GiB. The
reviewed B100 cached-timing binary is `685390a26a4325198c48f29e8a80c37cd53ff27bcb70f89b44716bf81250338e`. The runtime
uses crypto 3.6.5; the closure records
7103 build/source dependency references,
5 loaded non-system
runtime libraries, and 86 observed
images per process.

The run retained 160 rows and
1600 cached whole-transaction loops:
five evaluations and ten cached loops for each of eight contexts across four
counterbalanced processes. The original corpus orders were:

  1: trxhzt → l0fhm3 → bn254-33003 → bn254-32774
  2: trxhzt → l0fhm3 → bn254-32774 → bn254-33003
  3: bn254-33003 → bn254-32774 → trxhzt → l0fhm3
  4: bn254-32774 → bn254-33003 → trxhzt → l0fhm3

Original corpus hashes, reproduced from the canonical process-1 corpus, are:

  process-1: `e6e11d86e8936210ce98d916438748700d70ddc3762d677da8135fdf807c6ac6`
  process-2: `0f077fc4fe2fbd3d5c9036e1d4e7c65db7c928401f9af2dc62b10ca69b88352a`
  process-3: `44da10d7d812d3a824140a5b24df657e392bda713e4b0a2d893097ffb7fd0af2`
  process-4: `2bdbe167a647ebe78d489ffabb4825ab19e23b36ba3a0e99630479d64589f7a1`

Absolute measured ranges (minimum–maximum across process means) are:

  * `trxhzt:standard`: 366 bytes; 0.05111748–0.0543575 ms; 139.665245902–148.517759563 ns/byte.
  * `trxhzt:consensus`: 366 bytes; 0.0520125–0.0539917 ms; 142.110655738–147.518306011 ns/byte.
  * `l0fhm3:standard`: 99988 bytes; 77.0198–77.44963248 ms; 770.290434852–774.589275513 ns/byte.
  * `l0fhm3:consensus`: 99988 bytes; 77.22305168–77.65813502 ms; 772.323195583–776.674551146 ns/byte.
  * `bn254-33003:standard`: 32828 bytes; 3.31269082–3.7479492 ms; 100.910528208–114.16928232 ns/byte.
  * `bn254-33003:consensus`: 32828 bytes; 3.37043584–3.77556248 ms; 102.66954551–115.010432558 ns/byte.
  * `bn254-32774:standard`: 32599 bytes; 3.63603084–3.74364166 ms; 111.538109758–114.839156416 ns/byte.
  * `bn254-32774:consensus`: 32599 bytes; 3.33683252–3.730565 ms; 102.359965643–114.438019571 ns/byte.

Paired ratios are computed within the same process and mode. Their ranges are:

  * standard: annual time 67.7018656119–71.1308703011, annual ns/byte 0.760111746187–0.798610341735, bare time 0.0471592714618–0.0483364677162, bare ns/byte 0.144647419704–0.148258128593, predecessor time 0.970138773492–1.11091084558, predecessor ns/byte 0.976953761042–1.1187147225.
  * consensus: annual time 61.8877455372–71.1174240807, annual ns/byte 0.694834653413–0.79845937647, bare time 0.0431496830563–0.0480383027359, bare ns/byte 0.132349167442–0.14734359379, predecessor time 0.988081913559–1.00535178913, predecessor ns/byte 0.995022947278–1.0124141395.

Candidate medians are 3.6830054 ms standard and
3.67548001 ms consensus. Both paired predecessor
ranges cross one, so this batch does not establish a consistent speedup or
regression, statistical significance, or a causal opcode effect.

The timed field is `cached_verify_nanoseconds / repetitions`. Corpus read,
JSON decode, admission, cache construction, nested context/precompute setup,
and the explicit warm VerifyScript call are excluded. Setup fields, process
walls, and lifecycle walls remain separately recorded; the warm call is outside
the timer and `cache_total` and is not separately instrumented.

Provenance is in [`provenance.json`](./provenance.json). The raw run manifest is
`3e577dcdb4896e79a9ca839395c7ac10cbb7ada8d8775a94f5570bfb3bd35ea1`; the unchanged summary
file is `db25de736a305de3b43d0c3e82062e4ba78545b0ef0e6e38a3c1ad57c3c979ed` and its manifest is
`f9093640511308e3a0061f4a9f6657e8ae489f530b35af6c749f985a7bf5aa5f`. The completed independent
review verdict is `PASS_COMPLETED_MATCHED_CACHED_TIMING`.

From this directory, reproduce all four corpus files in a fresh output
namespace with:

```text
python3 generate-corpora.py --canonical corpus-process-1.jsonl --output-dir reproduced-corpora
```

The generator refuses an existing output directory and creates each output file
exclusively. It performs no VM, native, compiler, network, or timing work.

Historical source recovery is attributed to **GPT-6 Astra**, directed by
Kallisti. Subsequent source, research, and publication assistance is attributed
to Codex.
