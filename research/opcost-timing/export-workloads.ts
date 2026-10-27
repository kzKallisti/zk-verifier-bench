// Export the verifier workloads as VMB-style records (full tx hex + source outputs hex + input index)
// so non-libauth engines (bchd-fork, BCHN) can evaluate exactly the transactions the harness evaluates.
// Run from the repo root:  tsx research/opcost-timing/export-workloads.ts <out.json>
// Each record is one input evaluation. The transaction is captured from harness/vm.ts evaluatePair (the
// same program the benchmark grades), so multi-input entries keep their real siblings.
import { writeFileSync } from 'node:fs';
import { binToHex, encodeTransactionBch, encodeTransactionOutputs } from '@bitauth/libauth';

import { REGISTRY } from '../../src/harness/benchmark.js';
import { createLoosenedVm, createRealVm, createRealVmSpec, evaluatePair } from '../../src/harness/vm.js';
import type { Step } from '../../src/harness/types.js';

const IDS = (process.env.IDS ??
  [
    'bch-groth16-singleton', 'bch-groth16-singleton-opcode-optimized', 'bch-groth16-singleton-genpow', 'bch-groth16-singleton-minop',
    'bch-groth16-bls12381-singleton', 'bch-groth16-bls12381-singleton-opcode-optimized', 'bch-groth16-bls12381-singleton-genpow', 'bch-groth16-bls12381-singleton-minop',
    'bch-groth16-sound-si-gls-single', 'bch-groth16-bls12381-sound-si-gls-single',
    'bch-groth16-bn254-sound-native', 'bch-groth16-bls12381-sound-native',
  ].join(',')).split(',');

const loose = createLoosenedVm();
const out: unknown[] = [];
for (const id of IDS) {
  const impl = REGISTRY.find((i) => i.id === id);
  if (!impl) throw new Error(`no impl ${id}`);
  const sc = await impl.load();
  const isSpec = impl.vm === 'bch-spec';
  const real = isSpec ? createRealVmSpec() : createRealVm();
  const runs: [string, Step[]][] = [['valid', sc.valid], ...(sc.invalid ?? []).slice(0, 1).map((r) => ['invalid', r] as [string, Step[]])];
  for (const [kind, steps] of runs) {
    steps.forEach((s, stepIdx) => {
      let captured: any;
      const spy = { evaluate: (p: any) => { captured = p; return loose.evaluate(p); } } as any;
      const o = evaluatePair(spy, s.lockingBytecode, s.unlockingBytecode, s.covenant, s.intraTx, s.grouped);
      const r = evaluatePair(real, s.lockingBytecode, s.unlockingBytecode, s.covenant, s.intraTx, s.grouped);
      const p = captured;
      out.push({
        id, kind, step: stepIdx, steps: steps.length, label: s.label, vm: isSpec ? 'bch-spec' : 'bch-2026',
        txHex: binToHex(encodeTransactionBch(p.transaction)),
        sourceOutputsHex: binToHex(encodeTransactionOutputs(p.sourceOutputs)),
        inputIndex: p.inputIndex,
        lockingLen: s.lockingBytecode.length, unlockingLen: s.unlockingBytecode.length,
        expectedAccept: kind === 'valid',
        looseAccepted: o.accepted, looseError: o.error ?? null,
        realAccepted: r.accepted, realError: r.error ?? null,
        opCost: o.operationCost, instructionCount: o.instructionCount, arithmeticCost: o.arithmeticCost,
        stackPushedBytes: o.stackPushedBytes, hashDigestIterations: o.hashDigestIterations,
      });
      console.error(id, kind, stepIdx, 'loose', o.accepted, o.operationCost, 'real', r.accepted, r.error ?? '');
    });
  }
}
writeFileSync(process.argv[2] ?? 'workloads.json', JSON.stringify(out, null, 1));
