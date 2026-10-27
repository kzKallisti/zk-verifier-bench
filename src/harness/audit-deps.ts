// Audit the input-hash dependency discovery (harness/input-hash.ts) against what the
// implementations ACTUALLY read. Usage: pnpm benchmark:deps
//
// input-hash.ts finds an entry's data files statically (string literals naming 'src/...' or
// 'data/...' files in the implementation module and the local modules it imports). A file read
// through a computed path would escape that scan, and the incremental export would then miss a
// change to it. This script traces every fs read while the registry is imported (module-level
// vector loads) and while each implementation's load() runs, attributes each read to the
// implementation(s) whose module graph made it (by stack trace), and fails if a read file is not
// among those implementations' hashed dependencies. Traced: readFileSync, openSync, readFile,
// createReadStream, fs.promises.readFile / open, and directory listings (readdirSync, readdir,
// fs.promises.readdir), since a listing decides which files are read but is never hashed.
// Reads made by the ESM loader itself (e.g. a JSON module import) are not visible here; those are
// covered statically (input-hash.ts hashes a non-code imported module as raw bytes).
// Scope: every read of a repo file under src/ or data/, and EVERY read made from an implementation
// frame (src/... outside src/harness on the stack) of any file outside node_modules, wherever it
// lives (e.g. an absolute or ../groth16_cashscript path) and whatever its type (a .ts / .mjs file
// read as text too). Such a read must be one of the entry's hashed dependencies.
//
// `pnpm benchmark:json` runs this audit first (SKIP_DEPS_AUDIT=1 skips it).
if (process.env.SKIP_DEPS_AUDIT === '1') {
  console.error('dependency audit skipped (SKIP_DEPS_AUDIT=1)');
  process.exit(0);
}
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const rel = (p: string): string => relative(ROOT, p).split('\\').join('/');
const isCode = (p: string): boolean => /\.(m?[jt]s|cjs)$/.test(p);

interface Read { path: string; frames: string[]; listing: boolean }
const reads: Read[] = [];
let current: Read[] = reads;
let tracing = true;

const framesOf = (): string[] =>
  (new Error().stack ?? '').split('\n').slice(2).map((line) => {
    const m = /(file:\/\/[^\s)]+?|\/[^\s)]+?):\d+:\d+\)?$/.exec(line.trim());
    if (m === null) return '';
    const file = m[1]!.startsWith('file://') ? fileURLToPath(m[1]!) : m[1]!;
    return rel(file);
  }).filter((f) => f.startsWith('src/') && !f.startsWith('src/harness/'));

const trace = (path: unknown, listing: boolean) => {
  if (!tracing) return;
  if (typeof path !== 'string' && !(path instanceof URL)) return;
  const p = rel(path instanceof URL ? fileURLToPath(path) : path);
  const frames = framesOf();
  const repoData = (p.startsWith('src/') || p.startsWith('data/')) && (listing || !isCode(p));
  // anything an implementation frame reads directly (not a package's own internal read)
  const fromImplementation = frames.length > 0 && !p.split('/').includes('node_modules');
  if (!repoData && !fromImplementation) return;
  // a listing made by the harness itself (no implementation frame) is the harness's business
  if (listing && frames.length === 0) return;
  current.push({ path: p, frames, listing });
};
const wrap = (target: Record<string, unknown>, names: string[], listing: boolean) => {
  for (const name of names) {
    const original = target[name] as (...args: unknown[]) => unknown;
    target[name] = function (this: unknown, ...args: unknown[]) {
      trace(args[0], listing);
      return original.apply(this, args);
    };
  }
};
wrap(fs as unknown as Record<string, unknown>, ['readFileSync', 'openSync', 'readFile', 'createReadStream', 'open'], false);
wrap(fs as unknown as Record<string, unknown>, ['readdirSync', 'readdir', 'opendirSync', 'opendir'], true);
wrap(fs.promises as unknown as Record<string, unknown>, ['readFile', 'open'], false);
wrap(fs.promises as unknown as Record<string, unknown>, ['readdir', 'opendir'], true);
syncBuiltinESMExports();

const { REGISTRY } = await import('./benchmark.js');
const { dependenciesOf, implementationModules } = await import('./input-hash.js');
// the hash computation's own reads (SHA256SUMS, package.json, sources) are not implementation reads
tracing = false;
const modules = await implementationModules(REGISTRY);
const deps = new Map(REGISTRY.map((impl) => [impl.id, dependenciesOf(impl.id, modules.get(impl.id)!)]));
tracing = true;
// which ids have a given module in their (hashed) module graph
const idsOfModule = (module: string): string[] =>
  [...deps].filter(([, d]) => d.some((x) => x.path === module && x.kind !== 'file')).map(([id]) => id);

const problems: string[] = [];
const check = (read: Read, ids: string[], context: string) => {
  if (read.listing) {
    problems.push(`${read.path}: directory listed by ${context} [${read.frames.join(' <- ')}]; a listing is not part of any input hash, name the files by literal path instead`);
    return;
  }
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
