// Offline check: which VMB benchmark vectors replay (after re-keying) with libauth on relocated outpoints.
//   npx tsx research/opcost-timing/bchn/check-vmb.ts <file.vmb_tests.json>...
import { readFileSync } from 'node:fs';
import { sha256 } from '@bitauth/libauth';
import { fromVmb, instantiate, libauthOpCost } from './rig.js';
for (const f of process.argv.slice(2)) {
  for (const v of JSON.parse(readFileSync(f, 'utf8'))) {
    const w = fromVmb(v, 'accept', f);
    if (typeof w === 'string') { console.log(`SKIP ${v[0]} ${w}`); continue; }
    const c = instantiate(w, w.inputs.map((_, i) => ({ txid: sha256.hash(Uint8Array.of(i, 9)), vout: i })));
    const oc = libauthOpCost(c.tx, c.sourceOutputs);
    const resigned = w.inputs.filter((i) => i.resign).length;
    console.log(`${oc.ok ? 'OK  ' : 'FAIL'} ${v[0]} resigned=${resigned} op=${oc.total} ${oc.error ?? ''}`);
  }
}
