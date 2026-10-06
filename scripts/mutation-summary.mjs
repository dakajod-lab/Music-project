// Prints the Stryker result as Markdown (information only, P8): score per file and every surviving mutant.
import { existsSync, readFileSync } from 'node:fs';

const file = 'reports/mutation/mutation.json';
if (!existsSync(file)) {
  console.log('Mutation testing: no report found.');
  process.exit(0);
}
const report = JSON.parse(readFileSync(file, 'utf8'));
const detected = new Set(['Killed', 'Timeout']);
const counted = new Set(['Killed', 'Timeout', 'Survived', 'NoCoverage']);

let killed = 0;
let total = 0;
const rows = [];
const survivors = [];
for (const [path, { mutants }] of Object.entries(report.files)) {
  const k = mutants.filter((m) => detected.has(m.status)).length;
  const t = mutants.filter((m) => counted.has(m.status)).length;
  const ignored = mutants.filter((m) => m.status === 'Ignored').length;
  killed += k;
  total += t;
  rows.push(`| ${path} | ${t ? ((100 * k) / t).toFixed(1) : '–'} % | ${k}/${t} | ${ignored} |`);
  for (const m of mutants.filter((x) => x.status === 'Survived' || x.status === 'NoCoverage')) {
    survivors.push(
      `| ${path}:${m.location.start.line} | ${m.mutatorName} | \`${(m.replacement ?? '').replace(/\|/g, '\\|')}\` | ${m.status} |`,
    );
  }
}

console.log('## Mutation testing (information only, see P8)\n');
console.log(
  `**Score: ${total ? ((100 * killed) / total).toFixed(1) : '–'} %** (${killed} of ${total} mutants detected)\n`,
);
console.log('| File | Score | Detected | Ignored (reviewed equivalent) |\n|---|---|---|---|');
console.log(rows.join('\n'));
if (survivors.length) {
  console.log(
    `\n### Surviving mutants (${survivors.length})\nEach one is either a missing test that matters, or accepted on purpose (see P8).\n`,
  );
  console.log('| Location | Mutator | Replacement | Status |\n|---|---|---|---|');
  console.log(survivors.join('\n'));
}
