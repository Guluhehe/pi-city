/**
 * Export declarative experience data for Python visual checks and static prototypes.
 * Run: npx tsx scripts/export_experience_data.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CANONICAL_FRAMES } from '../src/experience/canonical-frames';
import { DISTRICT_MODELS, DISTRICT_POSITIONS } from '../src/experience/districts';
import { LESSON_SCENARIOS, scenarioDurationMs } from '../src/experience/scenarios';
import { EVENT_SHOT, SHOTS } from '../src/experience/shots';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const payload = {
  schemaVersion: 1,
  districts: DISTRICT_POSITIONS,
  models: DISTRICT_MODELS,
  shots: SHOTS,
  eventShot: EVENT_SHOT,
  canonicalFrames: CANONICAL_FRAMES,
  scenarios: {
    auth: {
      ...LESSON_SCENARIOS.auth,
      totalDurationMs: scenarioDurationMs(LESSON_SCENARIOS.auth),
    },
    multi: {
      ...LESSON_SCENARIOS.multi,
      totalDurationMs: scenarioDurationMs(LESSON_SCENARIOS.multi),
    },
  },
};

const outDir = join(root, 'public', 'experience');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'library.json');
writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`wrote ${outPath}`);
