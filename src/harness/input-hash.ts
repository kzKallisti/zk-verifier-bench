// Per-entry input hash for the incremental results.json export (export-json.ts).
//
// An entry's measured row is a pure function of
//   (a) its implementation module (src/implementations/<id>.ts) and any local module it imports,
//   (b) the vector / data files those modules read (every string literal of the form
//       'src/...' or 'data/...' that names a file, e.g. src/bch/<x>-vectors.json,
//       data/nchain/parent-tx.hex),
//   (c) its maintainer red-team file (src/bch/redteam/<id>.json, keyed by id), and
//   (d) the harness itself: the measurement sources under src/harness (vm, benchmark, gates,
//       red-team, adversarial, tamper, entry, types), and the installed npm packages.
// (a)-(c) are hashed by content. (d) is the HARNESS FINGERPRINT, computed automatically: the
// normalized (comment/format-free) code of every src/harness/*.ts except the files that cannot
// change a row (HARNESS_EXCLUDED below), plus the resolved version of every runtime dependency
// and of typescript (whose printer produces the normalized code), plus HARNESS_VERSION. So any
// harness code edit re-runs every entry; nothing depends on remembering a version bump.
// A data/ file pinned in data/<x>/SHA256SUMS is hashed through its pinned digest, so a missing
// (gitignored, not yet fetched) file still yields the true hash, and a present file must match.
// The export re-runs an entry only when this hash differs from the one stored in its row.
//
// Metadata never enters the hash: in the implementation module the initializers of `name`,
// `source` and `reviewStatus` (in any object literal that also has an `id` property) are replaced
// by a placeholder, and comments / formatting are dropped by printing the TypeScript AST. Review
// status lives in harness/review-status.ts, which is not hashed at all. So editing an entry's
// name, source text, review status or comments re-attaches the new metadata without a re-run.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

import type { Implementation } from './types.js';
import { redTeamPath } from './redteam.js';

/**
 * Manual invalidation knob. Harness CODE edits are detected automatically (harnessFingerprint),
 * so bump this only for a change the fingerprint cannot see that can still change a measured row
 * (e.g. a Node.js upgrade that changes behavior, or an edit to an excluded file that turns out to
 * matter). Bumping it invalidates every stored hash, so the next default export re-runs
 * everything; a SKIP_IMPLS entry then fails the export until re-run with SKIP_IMPLS=''.
 */
export const HARNESS_VERSION = 1;

/** Harness files that cannot change a measured row, kept out of the fingerprint:
 * review-status.ts (metadata, re-stamped on every export), export-json.ts (planning, frontier and
 * history, recomputed from the rows on every export; the row itself is built in entry.ts),
 * input-hash.ts (this file: a change to the hashing changes the hashes anyway) and audit-deps.ts. */
const HARNESS_EXCLUDED = new Set(['review-status.ts', 'export-json.ts', 'input-hash.ts', 'audit-deps.ts']);
const HARNESS_DIR = 'src/harness';

/** Object-literal properties that are presentation metadata, never inputs of a measurement. */
const METADATA_PROPERTIES = new Set(['name', 'source', 'reviewStatus']);

const ROOT = process.cwd();
const IMPLEMENTATIONS_DIR = 'src/implementations';

const sha256 = (data: string | Uint8Array): string => createHash('sha256').update(data).digest('hex');
const rel = (p: string): string => relative(ROOT, p).split('\\').join('/');

/** Resolved (installed) versions of every runtime dependency (libauth, @noble/curves, ...) and of
 * the build tools that shape the hash or the transpiled code (typescript, tsx), from
 * node_modules/<name>/package.json. A lockfile bump of any of them re-runs every entry. */
const packageVersions = ((): string => {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  const names = [...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.devDependencies ?? {}).filter((n) => !n.startsWith('@types/'))].sort();
  return names.map((name) => {
    try {
      const pkg = JSON.parse(readFileSync(join(ROOT, 'node_modules', name, 'package.json'), 'utf8')) as { version?: string };
      return `${name}@${pkg.version ?? 'unknown'}`;
    } catch {
      return `${name}@missing`;
    }
  }).join(',');
})();

const parse = (file: string): ts.SourceFile =>
  ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('.ts') || file.endsWith('.mts') ? ts.ScriptKind.TS : ts.ScriptKind.JS);

const propertyName = (p: ts.ObjectLiteralElementLike): string | undefined =>
  p.name !== undefined && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? p.name.text : undefined;

/**
 * The module's code with comments, formatting and metadata initializers removed: the TypeScript
 * printer re-emits the AST (comment-free), after `name` / `source` / `reviewStatus` values in
 * id-carrying object literals are replaced by the identifier __metadata__.
 */
const normalizedCode = (file: string, harness = false): string => {
  const source = parse(file);
  const strip: ts.TransformerFactory<ts.SourceFile> = (context) => {
    const visit = (node: ts.Node): ts.Node | undefined => {
      if (harness) {
        // benchmark.ts: the implementation imports and the REGISTRY list are not harness logic
        // (each entry's own module is hashed per entry), so registering an entry re-runs only it
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text.includes('/implementations/')) return undefined;
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'REGISTRY' && node.initializer !== undefined) {
          return ts.factory.updateVariableDeclaration(node, node.name, node.exclamationToken, node.type, ts.factory.createIdentifier('__registry__'));
        }
      }
      if (ts.isObjectLiteralExpression(node) && node.properties.some((p) => propertyName(p) === 'id')) {
        const properties = node.properties.map((p) => {
          const name = propertyName(p);
          if (name === undefined || !METADATA_PROPERTIES.has(name)) return ts.visitNode(p, visit) as ts.ObjectLiteralElementLike;
          return ts.factory.createPropertyAssignment(name, ts.factory.createIdentifier('__metadata__'));
        });
        return ts.factory.updateObjectLiteralExpression(node, properties);
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (sf) => ts.visitNode(sf, visit) as ts.SourceFile;
  };
  const result = ts.transform(source, [strip]);
  // (the printer output depends on the typescript version, which is part of the hash preamble)
  const printed = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed }).printFile(result.transformed[0]!);
  result.dispose();
  return printed;
};

/** Relative module specifiers (static import/export-from, dynamic import()) and repo file paths
 * ('src/...', 'data/...') named by string literals in the module. */
const referencesOf = (file: string): { modules: string[]; files: string[] } => {
  const source = parse(file);
  const modules: string[] = [];
  const files: string[] = [];
  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier !== undefined && ts.isStringLiteral(node.moduleSpecifier)) {
      // type-only imports carry no runtime code (harness/types.js is covered by HARNESS_VERSION anyway)
      const typeOnly = ts.isImportDeclaration(node) ? node.importClause?.isTypeOnly === true : node.isTypeOnly;
      if (!typeOnly && node.moduleSpecifier.text.startsWith('.')) modules.push(node.moduleSpecifier.text);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const arg = node.arguments[0];
      if (arg !== undefined && ts.isStringLiteralLike(arg) && arg.text.startsWith('.')) modules.push(arg.text);
    } else if (ts.isStringLiteralLike(node) && /^(src|data)\/[\w./-]+\.\w+$/.test(node.text)) {
      files.push(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { modules, files };
};

/** Resolve a relative specifier the way tsx does ('./x.js' may be './x.ts'). */
const resolveModule = (from: string, specifier: string): string | undefined => {
  const base = resolve(dirname(from), specifier);
  const stem = base.replace(/\.(m?js|cjs)$/, '');
  for (const candidate of [base, `${stem}.ts`, `${stem}.mts`, `${stem}.mjs`, `${stem}.js`, join(base, 'index.ts')]) {
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
};

/** The harness fingerprint (see the header): computed once per process. */
let harnessFingerprintCache: string | undefined;
export const harnessFingerprint = (): string => {
  if (harnessFingerprintCache !== undefined) return harnessFingerprintCache;
  const h = createHash('sha256');
  const files = readdirSync(join(ROOT, HARNESS_DIR)).filter((f) => /\.(m?ts)$/.test(f) && !HARNESS_EXCLUDED.has(f)).sort();
  for (const name of files) h.update(`${name}\0${sha256(normalizedCode(join(ROOT, HARNESS_DIR, name), true))}\0`);
  harnessFingerprintCache = h.digest('hex');
  return harnessFingerprintCache;
};

/** Pinned digests of fetched data files: data/<x>/SHA256SUMS (sha256sum format), path -> hex. */
const pinnedDigests = new Map<string, string>();
const pinnedDigestOf = (path: string): string | undefined => {
  const sums = `${dirname(path)}/SHA256SUMS`;
  if (!pinnedDigests.has(`#${sums}`)) {
    pinnedDigests.set(`#${sums}`, '');
    if (existsSync(join(ROOT, sums))) {
      for (const line of readFileSync(join(ROOT, sums), 'utf8').split('\n')) {
        const m = /^([0-9a-f]{64})\s+\*?(\S+)$/.exec(line.trim());
        if (m !== null) pinnedDigests.set(`${dirname(path)}/${m[2]}`, m[1]!);
      }
    }
  }
  return pinnedDigests.get(path);
};

/** Module files whose code is parsed for further references and hashed as printed AST; anything
 * else that is imported (e.g. a JSON module) is hashed as raw bytes like a data file. */
const isCodeModule = (abs: string): boolean => /\.(m?ts|tsx|m?js|cjs)$/.test(abs);

/** True for modules owned by the harness (covered by the harness fingerprint instead). */
const isHarnessModule = (abs: string): boolean => rel(abs).startsWith('src/harness/');

export interface InputDependency {
  /** repo-relative path */
  path: string;
  /** 'entry' = the implementation module (metadata-stripped), 'code' = an imported local module
   * (comment-stripped), 'file' = a data/vector/red-team file (raw bytes) */
  kind: 'entry' | 'code' | 'file';
  /** the file does not exist (yet); a missing data/ file is a fetchable artifact (pnpm fetch) */
  missing: boolean;
  /** a data file whose digest is pinned in data/<x>/SHA256SUMS (hashed through the pin) */
  pinned: boolean;
}

/** Every input of one implementation: its module, the local modules it imports (transitively,
 * excluding the harness), the files they name, and its red-team file. Sorted by path. */
export const dependenciesOf = (id: string, implementationFile: string): InputDependency[] => {
  const deps = new Map<string, InputDependency>();
  const add = (path: string, kind: InputDependency['kind']) => {
    if (!deps.has(path)) deps.set(path, { path, kind, missing: !existsSync(join(ROOT, path)), pinned: kind === 'file' && pinnedDigestOf(path) !== undefined });
  };
  const queue = [resolve(ROOT, implementationFile)];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (seen.has(file)) continue;
    seen.add(file);
    add(rel(file), seen.size === 1 ? 'entry' : 'code');
    const { modules, files } = referencesOf(file);
    for (const path of files) add(path, 'file');
    for (const specifier of modules) {
      const target = resolveModule(file, specifier);
      if (target === undefined) throw new Error(`${rel(file)}: cannot resolve import '${specifier}'`);
      if (isHarnessModule(target)) continue;
      if (isCodeModule(target)) queue.push(target);
      else add(rel(target), 'file'); // e.g. import x from './v.json' with { type: 'json' }: raw bytes
    }
  }
  add(redTeamPath(id), 'file');
  return [...deps.values()].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
};

const contentHash = (dep: InputDependency): string => {
  const pinned = dep.kind === 'file' ? pinnedDigestOf(dep.path) : undefined;
  if (pinned !== undefined) {
    if (!dep.missing) {
      const actual = sha256(readFileSync(join(ROOT, dep.path)));
      if (actual !== pinned) throw new Error(`${dep.path}: sha256 ${actual} differs from the digest pinned in ${dirname(dep.path)}/SHA256SUMS; re-fetch it (pnpm fetch) or update the pin deliberately`);
    }
    return pinned;
  }
  if (dep.missing) return 'missing';
  const abs = join(ROOT, dep.path);
  if (dep.kind === 'entry') return sha256(normalizedCode(abs));
  // imported helper modules: comment/format-insensitive when they are TS/JS we can parse
  if (dep.kind === 'code') return sha256(normalizedCode(abs));
  return sha256(readFileSync(abs));
};

/** The input hash stored in each results.json row (`inputHash`). */
export const inputHashOf = (id: string, deps: InputDependency[]): string => {
  const h = createHash('sha256');
  h.update(`zk-verifier-bench/input-hash/v2\0harness=${HARNESS_VERSION}\0harnessSources=${harnessFingerprint()}\0packages=${packageVersions}\0id=${id}\0`);
  // the red-team file is part of the hash even when absent ('missing'), so adding one re-runs the entry
  for (const dep of deps) h.update(`${dep.kind}\0${dep.path}\0${contentHash(dep)}\0`);
  return `sha256:${h.digest('hex')}`;
};

/**
 * Map every registered implementation id to the module that exports it, by importing each
 * src/implementations/*.ts (already loaded by benchmark.ts, so this is a cache hit) and matching
 * exported objects by identity against the registry.
 */
export const implementationModules = async (registry: Implementation[]): Promise<Map<string, string>> => {
  const byObject = new Map<Implementation, string>(registry.map((impl) => [impl, impl.id]));
  const out = new Map<string, string>();
  for (const name of readdirSync(join(ROOT, IMPLEMENTATIONS_DIR)).filter((f) => f.endsWith('.ts')).sort()) {
    const path = `${IMPLEMENTATIONS_DIR}/${name}`;
    const mod = (await import(pathToFileURL(join(ROOT, path)).href)) as Record<string, unknown>;
    for (const value of Object.values(mod)) {
      const id = byObject.get(value as Implementation);
      if (id !== undefined) {
        const prior = out.get(id);
        if (prior !== undefined && prior !== path) throw new Error(`implementation ${id} is exported by both ${prior} and ${path}`);
        out.set(id, path);
      }
    }
  }
  const unmapped = registry.filter((impl) => !out.has(impl.id)).map((impl) => impl.id);
  if (unmapped.length > 0) throw new Error(`no module under ${IMPLEMENTATIONS_DIR} exports registered implementation(s): ${unmapped.join(', ')}`);
  return out;
};
