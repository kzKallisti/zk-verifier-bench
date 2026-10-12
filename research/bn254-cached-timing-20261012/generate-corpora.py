#!/usr/bin/env python3
"""Recreate the four reviewed cached-timing corpora from process 1.

This is a data-only generator. It performs no native, VM, compiler, network,
or timing work. The canonical rows are parsed and keyed before their reviewed
counterbalanced order is emitted byte-for-byte.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

ORDERS = (
    ("trxhzt", "l0fhm3", "bn254-33003", "bn254-32774"),
    ("trxhzt", "l0fhm3", "bn254-32774", "bn254-33003"),
    ("bn254-33003", "bn254-32774", "trxhzt", "l0fhm3"),
    ("bn254-32774", "bn254-33003", "trxhzt", "l0fhm3"),
)
MODES = ("standard", "consensus")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_canonical(path: Path) -> dict[tuple[str, str], str]:
    rows = {}
    for line in path.read_text().splitlines(keepends=True):
        if not line.strip():
            continue
        row = json.loads(line)
        key = (row["name"], row["mode"])
        if key in rows:
            raise ValueError(f"duplicate canonical context: {key}")
        rows[key] = line
    expected = {(name, mode) for name in ORDERS[0] for mode in MODES}
    if set(rows) != expected:
        raise ValueError(f"canonical contexts differ: {sorted(rows)}")
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--canonical", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    rows = read_canonical(args.canonical)
    # A reproduction must target a fresh namespace.  Refuse both an existing
    # directory and existing output files so frozen vectors cannot be replaced.
    args.output_dir.mkdir(parents=True, exist_ok=False)
    for index, order in enumerate(ORDERS, 1):
        output = args.output_dir / f"corpus-process-{index}.jsonl"
        with output.open("x", encoding="utf-8", newline="") as handle:
            for name in order:
                for mode in MODES:
                    handle.write(rows[(name, mode)])
        print(f"{output}: {sha256(output)}")


if __name__ == "__main__":
    main()
