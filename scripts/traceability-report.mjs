// Traceability report (docs/06-test-strategy.md §6): every scenario ID in /features → its test result per browser.
// Also lists flaky tests (P7). Prints Markdown to stdout.
// Exit code 1 when REQUIRE_COMPLETE (e.g. "@r0.1") is set and a scenario with that tag has no passing automated test.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ID = /\b((?:[A-Z][A-Z0-9]*-)+\d{3}\.\d+)\b/;
const requireTag = process.env.REQUIRE_COMPLETE?.trim() || '';
const reportFile = process.env.REPORT_FILE || 'reports/acceptance.json';

/** Scenarios from the feature files, with their tags (feature tags are inherited). */
function readScenarios(dir = 'features') {
  const scenarios = new Map();
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.feature'))) {
    let featureTags = [];
    let pendingTags = [];
    for (const raw of readFileSync(join(dir, file), 'utf8').split('\n')) {
      const line = raw.trim();
      if (line.startsWith('@')) pendingTags.push(...line.split(/\s+/));
      else if (line.startsWith('Feature:')) [featureTags, pendingTags] = [pendingTags, []];
      else if (/^Scenario( Outline)?:/.test(line)) {
        const id = line.match(ID)?.[1];
        if (id)
          scenarios.set(id, {
            id,
            title: line.replace(/^Scenario( Outline)?:\s*/, ''),
            file,
            tags: [...featureTags, ...pendingTags],
          });
        pendingTags = [];
      } else if (line && !line.startsWith('#')) pendingTags = line.startsWith('Rule:') ? [] : pendingTags;
    }
  }
  return scenarios;
}

/** Results per scenario ID and project from Playwright's JSON report. */
function readResults() {
  const results = new Map(); // id -> project -> { runs: [statuses], outcome }
  if (!existsSync(reportFile)) return results;
  const report = JSON.parse(readFileSync(reportFile, 'utf8'));
  const walk = (suite, path) => {
    const here = [...path, suite.title];
    for (const spec of suite.specs ?? []) {
      const id = [...here, spec.title].join(' ').match(ID)?.[1];
      if (!id) continue;
      for (const test of spec.tests) {
        const byProject = results.get(id) ?? new Map();
        const entry = byProject.get(test.projectName) ?? { runs: [], outcomes: [] };
        entry.runs.push(...test.results.map((r) => r.status));
        entry.outcomes.push(test.status); // expected | unexpected | flaky | skipped
        byProject.set(test.projectName, entry);
        results.set(id, byProject);
      }
    }
    for (const child of suite.suites ?? []) walk(child, here);
  };
  for (const suite of report.suites ?? []) walk(suite, []);
  return results;
}

function verdict(entry) {
  if (!entry) return 'not run';
  const { outcomes, runs } = entry;
  if (outcomes.every((o) => o === 'skipped')) return 'pending';
  const passed = runs.filter((r) => r === 'passed').length;
  const failed = runs.filter((r) => r === 'failed' || r === 'timedOut').length;
  if (failed && passed) return `flaky (${failed}/${passed + failed} failed)`;
  if (failed) return 'failed';
  return 'passed';
}

/** Requirement IDs from the docs (functional index + NFR tables), with how each one is verified. */
function readRequirements() {
  const requirements = new Map();
  const add = (file, column) => {
    if (!existsSync(file)) return;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const cells = line.split('|').map((c) => c.trim());
      const id = cells[1];
      if (/^(?:[A-Z][A-Z0-9]*-)+\d{3}$/.test(id ?? '')) {
        requirements.set(id, {
          id,
          title: cells[2] ?? '',
          verifiedBy: column ? (cells[column] ?? '') : 'Feature file',
        });
      }
    }
  };
  add('docs/03-requirements.md', null);
  add('docs/04-nfr.md', 4);
  return requirements;
}

const scenarios = readScenarios();
const results = readResults();
const projects = [...new Set([...results.values()].flatMap((m) => [...m.keys()]))].sort();
const icon = (v) =>
  v === 'passed'
    ? '✅ passed'
    : v === 'pending'
      ? '⏳ pending'
      : v.startsWith('flaky')
        ? `⚠️ ${v}`
        : v === 'manual'
          ? '🖐 manual'
          : v === 'not run'
            ? '— not run'
            : `❌ ${v}`;

const rows = [];
const counts = {};
const incomplete = [];
for (const s of [...scenarios.values()].sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))) {
  const manual = s.tags.includes('@manual');
  const cells = projects.map((p) => (manual ? 'manual' : verdict(results.get(s.id)?.get(p))));
  if (projects.length === 0) cells.push(manual ? 'manual' : 'not run');
  for (const c of cells) counts[c.replace(/ \(.*/, '')] = (counts[c.replace(/ \(.*/, '')] ?? 0) + 1;
  if (requireTag && s.tags.includes(requireTag) && !manual && !cells.some((c) => c === 'passed'))
    incomplete.push(s.id);
  rows.push(
    `| ${s.id} | ${s.title.replace(/^\S+\s/, '')} | ${s.tags.join(' ')} | ${cells.map(icon).join(' | ')} |`,
  );
}

const flaky = rows.filter((r) => r.includes('⚠️'));
console.log('## Traceability report\n');
console.log(
  `${scenarios.size} scenarios · ` +
    Object.entries(counts)
      .map(([k, v]) => `${v} ${k}`)
      .join(' · ') +
    '\n',
);
if (flaky.length)
  console.log(
    `### ⚠️ Flaky tests (${flaky.length})\n\nInvestigate the root cause (P7): test, approach or product.\n`,
  );
console.log(`| ID | Scenario | Tags | ${projects.length ? projects.join(' | ') : 'Result'} |`);
console.log(`|----|----------|------|${(projects.length ? projects : ['']).map(() => '---').join('|')}|`);
console.log(rows.join('\n'));
// Requirements that have no scenario at all are invisible above, so list them explicitly.
const withoutScenario = [...readRequirements().values()].filter(
  (r) => ![...scenarios.keys()].some((id) => id.startsWith(`${r.id}.`)),
);
if (withoutScenario.length) {
  console.log(`\n### Requirements without a scenario (${withoutScenario.length})\n`);
  console.log(
    'Not pending, but absent from `/features`. Fine when verified another way (manual, design review); otherwise a gap.\n',
  );
  console.log('| Requirement | Description | Verified by |\n|---|---|---|');
  for (const r of withoutScenario) console.log(`| ${r.id} | ${r.title} | ${r.verifiedBy} |`);
}

if (requireTag) {
  console.log(
    incomplete.length
      ? `\n❌ **${incomplete.length} scenario(s) tagged ${requireTag} have no passing test:** ${incomplete.join(', ')}`
      : `\n✅ All scenarios tagged ${requireTag} have a passing test.`,
  );
}
process.exit(incomplete.length ? 1 : 0);
