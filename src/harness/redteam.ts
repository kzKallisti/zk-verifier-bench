// Maintainer red-team gate (a soundness gate the submitter does not control).
//
// Submitters ship their own `invalid` vectors, so a weak negative set (e.g. tampering only
// the P2SH redeem push) can make a broken verifier look sound. Red-team files are written by
// the maintainers, not the submitter: each one is a set of concrete attacks on an entry's
// EXACT committed bytes, every one of which a sound verifier must REJECT. Any accepted run
// fails the entry (see correctnessOf in export-json.ts and verdictOf in benchmark.ts).
//
// File: src/bch/redteam/<implementation id>.json
//   {
//     id, description, generator,
//     lockingSha256: string[],          // sha256 of every input's locking the attack targets
//     runs: [{ label, kind, patches: [{ input, unlocking }] }]
//   }
// A run is the entry's valid run with the listed inputs' unlockings replaced (lockings and all
// other inputs unchanged). Only intra-transaction (single-tx, linked-input) entries are modeled.
//
// Staleness: if the entry's current lockings no longer hash to `lockingSha256` (the entry was
// resubmitted), the attacks target bytes that are gone. The file is then reported STALE and
// not counted; regenerate it (see tools/forge-public-inputs.mts) to re-test the new bytes.
import { existsSync, readFileSync } from 'node:fs';
import { binToHex, hexToBin, sha256 } from '@bitauth/libauth';

import type { Scenario, Step } from './types.js';
import { evaluatePair, type Bch2026Vm } from './vm.js';

export const REDTEAM_DIR = 'src/bch/redteam';

interface RedTeamRun {
  label: string;
  kind: string;
  patches: { input: number; unlocking: string }[];
}
interface RedTeamFile {
  id: string;
  description: string;
  lockingSha256: string[];
  runs: RedTeamRun[];
}

export interface RedTeamResult {
  /** a red-team file exists for this entry */
  present: boolean;
  /** the file targets lockings the entry no longer ships (not counted) */
  stale: boolean;
  /** attack runs evaluated */
  tested: number;
  /** attack runs the verifier ACCEPTED (each one is a soundness hole) */
  accepted: number;
  firstAccepted?: string;
  kinds: string[];
}

const NONE: RedTeamResult = { present: false, stale: false, tested: 0, accepted: 0, kinds: [] };

export const redTeamPath = (id: string): string => `${REDTEAM_DIR}/${id}.json`;

/** Build one attack run from the valid run: same lockings, patched unlockings. */
const patchedRun = (valid: Step[], run: RedTeamRun): Step[] => {
  const unlockings = valid.map((s) => s.unlockingBytecode);
  for (const p of run.patches) {
    if (p.input < 0 || p.input >= valid.length) throw new Error(`red-team "${run.label}": input ${p.input} out of range`);
    unlockings[p.input] = hexToBin(p.unlocking);
  }
  const inputs = valid.map((s, i) => ({ ...s.intraTx!.inputs[i]!, unlockingBytecode: unlockings[i]! }));
  return valid.map((s, i) => ({ ...s, unlockingBytecode: unlockings[i]!, intraTx: { index: i, inputs } }));
};

export const redTeam = (vm: Bch2026Vm, id: string, scenario: Scenario, bsv: boolean): RedTeamResult => {
  const path = redTeamPath(id);
  if (!existsSync(path)) return NONE;
  const file = JSON.parse(readFileSync(path, 'utf8')) as RedTeamFile;
  const valid = scenario.valid;
  const kinds = [...new Set(file.runs.map((r) => r.kind))];
  if (!valid.every((s) => s.intraTx !== undefined)) {
    throw new Error(`red-team ${path}: only intra-tx entries are supported`);
  }
  const current = valid.map((s) => binToHex(sha256.hash(s.lockingBytecode)));
  const stale = current.length !== file.lockingSha256.length || current.some((h, i) => h !== file.lockingSha256[i]);
  if (stale) {
    console.error(`red-team ${path} is STALE (entry lockings changed); not counted - regenerate it`);
    return { present: true, stale: true, tested: 0, accepted: 0, kinds };
  }
  let accepted = 0;
  let firstAccepted: string | undefined;
  for (const run of file.runs) {
    const steps = patchedRun(valid, run);
    const rejected = steps.some((s) => {
      const o = evaluatePair(vm, s.lockingBytecode, s.unlockingBytecode, s.covenant, s.intraTx, s.grouped);
      return !(bsv ? o.bsvAccepted : o.accepted);
    });
    if (!rejected) {
      accepted += 1;
      firstAccepted ??= run.label;
    }
  }
  return { present: true, stale: false, tested: file.runs.length, accepted, firstAccepted, kinds };
};
