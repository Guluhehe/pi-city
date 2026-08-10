#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, normalize, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { redactPiRecord, type RedactionReport } from '../src/adapters/pi/redact.ts';

function usage(): never {
  console.error(`Usage: npm run redact:fixture -- --input <source.jsonl> --output <fixtures/.../runtime.jsonl>

Writes a redacted JSONL copy. The output path must stay inside fixtures/ and must not equal the input.`);
  process.exit(1);
}

function parseArgs(argv: string[]): { input: string; output: string } {
  let input = '';
  let output = '';
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--input') input = argv[++i] ?? '';
    else if (arg === '--output') output = argv[++i] ?? '';
    else if (arg === '--help' || arg === '-h') usage();
  }
  if (!input || !output) usage();
  return { input, output };
}

function emptyReport(): RedactionReport {
  return { secrets: 0, paths: 0, emails: 0, contents: 0 };
}

function addReports(target: RedactionReport, extra: RedactionReport): void {
  target.secrets += extra.secrets;
  target.paths += extra.paths;
  target.emails += extra.emails;
  target.contents += extra.contents;
}

function assertInsideFixtures(outputPath: string, fixturesRoot: string): void {
  const relativeToFixtures = relative(fixturesRoot, outputPath);
  if (
    !relativeToFixtures ||
    relativeToFixtures.startsWith('..') ||
    isAbsolute(relativeToFixtures)
  ) {
    throw new Error(`Output must be inside fixtures/: got ${outputPath}`);
  }
}

function main(): void {
  const { input, output } = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const fixturesRoot = resolve(cwd, 'fixtures');
  const inputPath = resolve(cwd, input);
  const outputPath = resolve(cwd, output);

  if (normalize(inputPath) === normalize(outputPath)) {
    throw new Error('Refusing to overwrite the source file; choose a different --output path.');
  }

  assertInsideFixtures(outputPath, fixturesRoot);

  const source = readFileSync(inputPath, 'utf8');
  const report = emptyReport();
  const lines = source.split(/\r?\n/);
  const redactedLines: string[] = [];

  for (const line of lines) {
    if (!line.trim()) {
      redactedLines.push(line);
      continue;
    }
    try {
      const parsed = JSON.parse(line) as unknown;
      const result = redactPiRecord(parsed);
      addReports(report, result.report);
      redactedLines.push(JSON.stringify(result.value));
    } catch {
      // Preserve unparsable lines without inventing structure, but still scrub obvious secrets/paths.
      const scrubbed = redactPiRecord(line);
      addReports(report, scrubbed.report);
      redactedLines.push(typeof scrubbed.value === 'string' ? scrubbed.value : line);
    }
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  // One trailing newline after the last record; never an extra blank line (git diff --check).
  const body = redactedLines.filter((line, index, all) => !(line === '' && index === all.length - 1)).join('\n');
  writeFileSync(outputPath, body ? `${body}\n` : '', 'utf8');

  console.log(JSON.stringify({
    input: relative(cwd, inputPath) || inputPath,
    output: relative(cwd, outputPath) || outputPath,
    report,
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href || process.argv[1]?.endsWith('redact_pi_fixture.ts')) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
