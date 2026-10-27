// one byte less of pad -> the padded run rejects on the real TXv5 VM (fixture 0, both modes)
import { decodeAuthenticationInstructions, encodeAuthenticationInstruction, encodeDataPush } from '@bitauth/libauth';
import { REGISTRY } from '../src/harness/benchmark.js';
import { createRealVmTxv5, createStandardVmTxv5, evaluatePair } from '../src/harness/vm.js';
for (const id of ['bch-groth16-sound-si-gls-single', 'bch-groth16-bls12381-sound-si-gls-single']) {
  const sc = await REGISTRY.find((i) => i.id === id)!.load();
  const s = sc.txv5Variant!.valid[0]!;
  const ins = decodeAuthenticationInstructions(s.unlockingBytecode);
  const enc = ins.map((i) => encodeAuthenticationInstruction(i));
  const build = (n: number) => { const parts = [...enc.slice(0, 2), encodeDataPush(new Uint8Array(n)), enc[3]!]; const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };
  for (const [mode, vm] of [['consensus', createRealVmTxv5()], ['standard', createStandardVmTxv5()]] as const) {
    let lo = 1, hi = 20000; // smallest accepted pad length
    const ok = (n: number) => evaluatePair(vm, s.lockingBytecode, build(n), s.covenant, { index: 0, inputs: [{ ...s.intraTx!.inputs[0]!, unlockingBytecode: build(n) }] }, s.grouped).accepted;
    while (lo < hi) { const m = (lo + hi) >> 1; if (ok(m)) hi = m; else lo = m + 1; }
    console.log(id, mode, 'min pad data', lo, 'unlocking', build(lo).length, 'ok(min)', ok(lo), 'ok(min-1)', ok(lo - 1));
  }
}
