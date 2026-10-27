import { readFileSync, writeFileSync } from 'node:fs';
import { createVirtualMachineBch2026, createVirtualMachineBchSpec, decodeTransactionBch, decodeTransactionOutputs, hexToBin } from '@bitauth/libauth';
const units = JSON.parse(readFileSync(process.argv[2]!, 'utf8'));
const u = units.find((x: any) => x.name === process.argv[3]);
const vm = u.mode === 'bchspec' ? createVirtualMachineBchSpec(false) : createVirtualMachineBch2026(false);
const tx = decodeTransactionBch(hexToBin(u.txHex)) as any;
const so = decodeTransactionOutputs(hexToBin(u.sourceOutputsHex)) as any;
const states = vm.debug({ inputIndex: u.inputs?.[0] ?? 0, sourceOutputs: so.result ?? so, transaction: tx });
const lines: string[] = [];
let prev = 0, prevH = 0;
for (let i = 1; i < states.length; i++) {
  const s = states[i - 1]!, n = states[i]!;
  const c = n.metrics.operationCost;
  lines.push(`${(s.instructions[s.ip]?.opcode ?? 255).toString(16).padStart(2,'0')} ${c - prev}`);
  prev = c;
}
writeFileSync(process.argv[4]!, lines.join('\n') + '\n');
console.log(states.length, prev);
