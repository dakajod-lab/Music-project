// Release preflight (docs/06-test-strategy.md §8): version format, no existing tag, release notes with a completed impact analysis.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const version = process.argv[2] ?? '';
const fail = (msg) => {
  console.error(`❌ ${msg}`);
  process.exit(1);
};

if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version))
  fail(`"${version}" is not a valid version (expected e.g. 0.1.0).`);

const tags = execSync('git ls-remote --tags origin', { encoding: 'utf8' });
if (tags.includes(`refs/tags/v${version}`)) fail(`Tag v${version} already exists.`);

const notes = `docs/releases/${version}.md`;
if (!existsSync(notes)) fail(`Missing ${notes}. Copy docs/releases/TEMPLATE.md and fill it in.`);
const text = readFileSync(notes, 'utf8');
if (!/^## Impact analysis/m.test(text)) fail(`${notes} has no "## Impact analysis" section.`);
const open = text.split('\n').filter((l) => /^\s*- \[ \]/.test(l));
if (open.length) fail(`${notes} has ${open.length} unchecked item(s):\n${open.join('\n')}`);

console.log(`✅ v${version}: version valid, tag free, impact analysis complete.`);
