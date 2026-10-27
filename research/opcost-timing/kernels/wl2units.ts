// Convert rig JSON workloads (single- or multi-input, no signatures) to bchd/libauth units (fake outpoints).
// Usage: tsx wl2units.ts <workloads.json> <units.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { binToHex, encodeTransactionBch, encodeTransactionOutputs, hexToBin, sha256 } from '@bitauth/libauth';
const [inp, outp] = process.argv.slice(2) as [string, string];
const units = (JSON.parse(readFileSync(inp, 'utf8')).workloads as any[]).map((w) => {
  const transaction = { version: w.version ?? 2, locktime: w.locktime ?? 0,
    inputs: w.inputs.map((i: any, k: number) => ({ outpointTransactionHash: sha256.hash(hexToBin(i.sourceLockingHex)), outpointIndex: k, sequenceNumber: i.sequenceNumber ?? 0, unlockingBytecode: hexToBin(i.unlockingHex) })),
    outputs: w.outputs.map((o: any) => ({ lockingBytecode: hexToBin(o.lockingHex), valueSatoshis: BigInt(o.valueSatoshis ?? 0) })) };
  const sourceOutputs = w.inputs.map((i: any) => ({ lockingBytecode: hexToBin(i.sourceLockingHex), valueSatoshis: BigInt(i.valueSatoshis ?? 1000) }));
  return { name: w.id, group: w.group ?? 'wl', mode: 'bch2026', txHex: binToHex(encodeTransactionBch(transaction as any)), sourceOutputsHex: binToHex(encodeTransactionOutputs(sourceOutputs as any)),
    inputs: w.inputs.map((_: any, k: number) => k), expectAccept: w.expect === 'accept', expectOpCost: w.inputs.map(() => -1) };
});
writeFileSync(outp, JSON.stringify(units, null, 1));
