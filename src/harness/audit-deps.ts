// Audit the input-hash dependency discovery (harness/input-hash.ts) against what the
// implementations ACTUALLY read. Usage: pnpm benchmark:deps
//
// input-hash.ts finds an entry's data files statically (string literals naming 'src/...' or
// 'data/...' files in the implementation module and the local modules it imports). A file read
// through a computed path would escape that scan, and the incremental export would then miss a
// change to it. This script traces every fs read while the registry is imported (module-level
// vector loads) and while each implementation's load() runs, attributes each read to the
// implementation(s) whose module graph made it (by stack trace), and fails if a read file is not
// among those implementations' hashed dependencies.
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const rel = (p: string): string => relative(ROOT, p).split('\\').join('/');
const isCode = (p: string): boolean => /\.(m?[jt]s|cjs)$/.test(p);

interface Read { path: string; frames: string[] }
const reads: Read[] = [];
let current: Read[] = reads;

const framesOf = (): string[] =>
  (new Error().stack ?? '').split('\n').slice(2).map((line) => {
    const m = /(file:\/\/[^\s)]+?|\/[^\s)]+?):\d+:\d+\)?$/.exec(line.trim());
    if (m === null) return '';
    const file = m[1]!.startsWith('file://') ? fileURLToPath(m[1]!) : m[1]!;
    return rel(file);
  }).filter((f) => f.startsWith('src/') && !f.startsWith('src/harness/'));

const trace = (path: unknown) => {
  if (typeof path !== 'string' && !(path instanceof URL)) return;
  const p = rel(path instanceof URL ? fileURLToPath(path) : path);
  if ((p.startsWith('src/') || p.startsWith('data/')) && !isCode(p)) current.push({ path: p, frames: framesOf() });
};
for (const name of ['readFileSync', 'openSync'] as const) {
  const original = fs[name] as (...args: unknown[]) => unknown;
  (fs as unknown as Record<string, unknown>)[name] = (...args: unknown[]) => {
    trace(args[0]);
    return original.apply(fs, args);
  };
}
syncBuiltinESMExports();

const { REGISTRY } = await import('./benchmark.js');
const { dependenciesOf, implementationModules } = await import('./input-hash.js');
const modules = await implementationModules(REGISTRY);
const deps = new Map(REGISTRY.map((impl) => [impl.id, dependenciesOf(impl.id, modules.get(impl.id)!)]));
// which ids have a given module in their (hashed) module graph
const idsOfModule = (module: string): string[] =>
  [...deps].filter(([, d]) => d.some((x) => x.path === module && x.kind !== 'file')).map(([id]) => id);

const problems: string[] = [];
const check = (read: Read, ids: string[], context: string) => {
  if (ids.length === 0) {
    problems.push(`${read.path}: read by ${context} [${read.frames.join(' <- ')}], not attributable to any implementation module`);
    return;
  }
  for (const id of ids) {
    if (!deps.get(id)!.some((d) => d.path === read.path)) problems.push(`${id}: reads ${read.path} (${context}) but it is not in its input hash`);
  }
};

// module-level reads, made while the registry was imported
for (const read of reads) {
  const module = read.frames.find((f) => idsOfModule(f).length > 0);
  check(read, module === undefined ? [] : idsOfModule(module), 'module load');
}
let checked = reads.length;

// reads made inside each implementation's load()
for (const impl of REGISTRY) {
  current = [];
  try {
    await impl.load();
  } catch (error) {
    console.error(`  ${impl.id}: load() failed (${error instanceof Error ? error.message : String(error)}); its reads so far are still checked`);
  }
  for (const read of current) check(read, [impl.id], 'load()');
  checked += current.length;
}

console.log(`audited ${checked} file reads across ${REGISTRY.length} implementations`);
if (problems.length > 0) {
  console.error(`input-hash dependency audit FAILED:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('every file read is covered by its entry\'s input hash');
