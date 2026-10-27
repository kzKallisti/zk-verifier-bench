// Gate for the two covenant-residue entries: valid runs accept on the BCH 2026 standard and consensus
// VMs; every isolated invalid-input run accepts its prefix and rejects exactly at its last step;
// every tamper run rejects.   npx tsx tools/check-covenant-residue.mts
import { REGISTRY } from '../src/harness/benchmark.js';
import { createRealVm, createStandardVm, evaluatePair } from '../src/harness/vm.js';
import type { Step } from '../src/harness/types.js';

const vms = { standard: createStandardVm(), consensus: createRealVm() };
const ok = (vm: ReturnType<typeof createRealVm>, s: Step) =>
  evaluatePair(vm, s.lockingBytecode, s.unlockingBytecode, s.covenant, s.intraTx, s.grouped).accepted;
let failures = 0;
const fail = (m: string) => { failures++; console.log('FAIL', m); };
for (const id of ['bch-groth16-chunked-covenant-residue', 'bch-groth16-bls12381-chunked-covenant-residue']) {
  const impl = REGISTRY.find((i) => i.id === id)!;
  const sc = await impl.load();
  for (const [vmName, vm] of Object.entries(vms)) {
    const runs: [string, Step[]][] = [['valid', sc.valid], ...(sc.extraValidProofs ?? []).map((r, k): [string, Step[]] => [`extra#${k + 1}`, r])];
    for (const [name, run] of runs) {
      const bad = run.findIndex((s) => !ok(vm, s));
      if (bad >= 0) fail(`${id} ${vmName} ${name} rejected at step ${bad} (${run[bad]!.label})`);
    }
    (sc.invalid ?? []).forEach((run, k) => { if (run.every((s) => ok(vm, s))) fail(`${id} ${vmName} tamper run ${k} accepted`); });
    const inputs = sc.invalidInputs ?? [];
    inputs.forEach((run, k) => {
      const res = run.map((s) => ok(vm, s));
      const last = res.length - 1;
      if (res[last]) fail(`${id} ${vmName} invalidInput ${k} last step accepted`);
      const early = res.slice(0, last).findIndex((a) => !a);
      if (early >= 0) fail(`${id} ${vmName} invalidInput ${k} rejected early at ${early} (prefix should accept)`);
    });
    console.log(`${id} ${vmName}: valid+extra ${1 + (sc.extraValidProofs?.length ?? 0)}, tamper ${(sc.invalid ?? []).length}, invalidInputs ${inputs.length}`);
  }
}
console.log(failures === 0 ? 'ALL GATES PASS' : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
