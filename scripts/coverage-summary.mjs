// Prints the coverage summary as Markdown (information only, P8).
import { existsSync, readFileSync } from 'node:fs';

const file = 'coverage/coverage-summary.json';
if (!existsSync(file)) {
  console.log('Coverage: no report found.');
  process.exit(0);
}
const { total } = JSON.parse(readFileSync(file, 'utf8'));
console.log('## Coverage (information only, see P8)\n');
console.log('| Metric | Covered | Total | % |\n|---|---|---|---|');
for (const key of ['lines', 'branches', 'functions', 'statements']) {
  const m = total[key];
  console.log(`| ${key} | ${m.covered} | ${m.total} | ${m.pct} |`);
}
