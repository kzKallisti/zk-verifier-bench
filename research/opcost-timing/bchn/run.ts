// CLI for the BCHN timing rig. Usage (from the zk-verifier-bench checkout root):
//   research/opcost-timing/bchn/node.sh start NAME CPU      # fresh regtest node, pinned
//   taskset -c <other cpu> npx tsx research/opcost-timing/bchn/run.ts --node NAME \
//       --src <source> [--src <source> ...] [--reps 11] [--target-opcost 2e8] [--max-copies 2000] \
//       [--filter <regex on id/description>] --out results.jsonl
//   research/opcost-timing/bchn/node.sh stop NAME
// Sources:
//   vmb:<file.vmb_tests.json>[@accept|@reject]   libauth VMB vectors (default expect: accept)
//   json:<file.json>                               {"workloads":[{id,description,expect,version,locktime,
//                                                    inputs:[{sourceLockingHex,valueSatoshis,unlockingHex,sequenceNumber}],
//                                                    outputs:[{lockingHex,valueSatoshis}]}]}
//   builtin:baselines | builtin:sound-native
import { appendFileSync, readFileSync } from 'node:fs';
import { Chain, Rpc, fromJson, fromVmb, runWorkload, type Workload } from './rig.js';
import { baselines, soundNative } from './workloads.js';

const args = process.argv.slice(2);
const opt = (k: string, d?: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1]! : d; };
const all = (k: string) => args.flatMap((a, i) => (a === k ? [args[i + 1]!] : []));
const OPCOST_DIR = process.env.OPCOST_DIR ?? '/home/mrzwets/BCH-projects/verifier.cash/work/opcost-timing';
const name = opt('--node', 'a')!;
const out = opt('--out')!;
const reps = +opt('--reps', '11')!;
const filter = opt('--filter') ? new RegExp(opt('--filter')!) : undefined;

const cksumPort = async () => {
  const { execFileSync } = await import('node:child_process');
  const c = +execFileSync('sh', ['-c', `printf '%s' '${name}' | cksum | cut -d' ' -f1`]).toString().trim();
  return 39300 + (c % 500) * 2;
};

const load = (src: string): Workload[] => {
  if (src.startsWith('builtin:')) return src === 'builtin:baselines' ? baselines() : soundNative();
  if (src.startsWith('json:')) return JSON.parse(readFileSync(src.slice(5), 'utf8')).workloads.map(fromJson);
  if (src.startsWith('vmb:')) {
    const [file, exp] = src.slice(4).split('@');
    const group = file!.split('/').slice(-2).join('/');
    const vs = JSON.parse(readFileSync(file!, 'utf8')) as any[][];
    const wls: Workload[] = [];
    for (const v of vs) {
      const w = fromVmb(v, (exp as any) ?? 'accept', group);
      if (typeof w === 'string') { console.error(`skip ${v[0]}: ${w}`); continue; }
      wls.push(w);
    }
    return wls;
  }
  throw new Error('unknown source ' + src);
};

const main = async () => {
  const datadir = `${OPCOST_DIR}/bchn-${name}`;
  const rpc = new Rpc(datadir, await cksumPort());
  const chain = new Chain(rpc, `${datadir}/regtest/debug.log`);
  await chain.init();
  if (chain.height !== 0) throw new Error('rig expects a fresh node (height 0): the OP_1 coinbase pool is tracked in-process');
  await chain.mine(220);
  const wls = all('--src').flatMap(load).filter((w) => !filter || filter.test(w.id + ' ' + w.description));
  console.error(`${wls.length} workloads`);
  for (const wl of wls) {
    try {
      const r = await runWorkload(chain, wl, {
        reps,
        targetOpCost: +opt('--target-opcost', '2e8')!,
        maxCopies: +opt('--max-copies', '2000')!,
        maxBlockBytes: +opt('--max-block-bytes', '8000000')!,
      });
      appendFileSync(out, JSON.stringify(r) + '\n');
      console.error(`${r.asExpected ? 'ok ' : 'BAD'} ${wl.id} K=${r.copies} op/tx=${r.opCostPerTx} verify=${r.verifyStats?.median}ms ns/op=${r.nsPerOpCost?.toFixed(3)} ${r.bchnAccepted ? 'accepted' : 'rejected:' + r.submitResult}`);
    } catch (e) {
      appendFileSync(out, JSON.stringify({ id: wl.id, group: wl.group, description: wl.description, error: String((e as Error).message) }) + '\n');
      console.error(`ERR ${wl.id}: ${(e as Error).message}`);
    }
  }
};
main().catch((e) => { console.error(e); process.exit(1); });
