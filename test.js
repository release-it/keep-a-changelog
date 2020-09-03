const fs = require('fs');
const test = require('bron');
const assert = require('assert').strict;
const mock = require('mock-fs');
const { factory, runTasks } = require('release-it/test/util');
const Plugin = require('.');

const initialDryRunFileContents =
  '\n\n## [Unreleased]\n\n* Item A\n* Item B\n\n## [1.0.0] - 2020-05-02\n\n* Item C\n* Item D';

mock({
  './CHANGELOG-FOO.md': '\n\n## [FOO]\n\n* Item A\n* Item B',
  './CHANGELOG-UNRELEASED.md': '\n\n## [Unreleased]\n\n* Item A\n* Item B',
  './CHANGELOG-EMPTY.md': '\n\n## [Unreleased]\n\n\n\n## [1.0.0]\n\n* Item A\n* Item B',
  './CHANGELOG-FULL.md': '\n\n## [Unreleased]\n\n* Item A\n* Item B\n\n## [1.0.0] - 2020-05-02\n\n* Item C\n* Item D',
  './CHANGELOG-DRYRUN.md': initialDryRunFileContents,
  './CHANGELOG-LESS_NEW_LINES.md':
    '\n\n## [Unreleased]\n* Item A\n* Item B\n## [1.0.0] - 2020-05-02\n* Item C\n* Item D',
  './CHANGELOG-EOL.md':
    '\r\n\r\n## [Unreleased]\r\n\r\n* Item A\r\n* Item B\r\n\r\n## [1.0.0] - 2020-05-02\r\n\r\n* Item C\r\n* Item D'
});

const readFile = file => fs.readFileSync(file).toString().trim();

const namespace = 'keep-a-changelog';

test('should throw for missing changelog file', async t => {
  const options = { [namespace]: {} };
  const plugin = factory(Plugin, { namespace, options });
  await assert.rejects(runTasks(plugin), /ENOENT: no such file or directory/);
});

test('should throw for missing "unreleased" section', async t => {
  const options = { [namespace]: { filename: 'CHANGELOG-FOO.md' } };
  const plugin = factory(Plugin, { namespace, options });
  await assert.rejects(runTasks(plugin), /Missing "Unreleased" section in CHANGELOG-FOO.md/);
});

test('should throw for empty "unreleased" section', async t => {
  const options = { [namespace]: { filename: 'CHANGELOG-EMPTY.md' } };
  const plugin = factory(Plugin, { namespace, options });
  await assert.rejects(runTasks(plugin), /There are no entries under "Unreleased" section in CHANGELOG-EMPTY\.md/);
});

test('should throw for missing section for previous release', async t => {
  const options = { [namespace]: { filename: 'CHANGELOG-UNRELEASED.md' } };
  const plugin = factory(Plugin, { namespace, options });
  await assert.rejects(
    runTasks(plugin),
    /Missing section for previous release \("1\.0\.0"\) in CHANGELOG-UNRELEASED\.md/
  );
});

test('should find very first changelog with disabled strict latest option', async t => {
  const options = { [namespace]: { filename: 'CHANGELOG-UNRELEASED.md', strictLatest: false } };
  const plugin = factory(Plugin, { namespace, options });
  await runTasks(plugin);
  assert.equal(plugin.getChangelog(), '* Item A\n* Item B');
});

test('should write changelog', async t => {
  const options = { [namespace]: { filename: 'CHANGELOG-FULL.md' } };
  const plugin = factory(Plugin, { namespace, options });
  await runTasks(plugin);
  assert.equal(plugin.getChangelog(), '* Item A\n* Item B');
  assert.match(
    readFile('./CHANGELOG-FULL.md'),
    /## \[1\.0\.1\] - [0-9]{4}-[0-9]{2}-[0-9]{2}\n\n\* Item A\n\* Item B\n\n## \[1\.0\.0\] - 2020-05-02\n\n\* Item C\n*\* Item D/
  );
});

test('should write changelog even with disabled strict latest option', async t => {
  const options = { [namespace]: { filename: 'CHANGELOG-FULL.md', strictLatest: false } };
  const plugin = factory(Plugin, { namespace, options });
  await runTasks(plugin);
  assert.equal(plugin.getChangelog(), '* Item A\n* Item B');
  assert.match(
    readFile('./CHANGELOG-FULL.md'),
    /## \[1\.0\.1\] - [0-9]{4}-[0-9]{2}-[0-9]{2}\n\n\* Item A\n\* Item B\n\n## \[1\.0\.0\] - 2020-05-02\n\n\* Item C\n*\* Item D/
  );
});

test('should not write changelog in dry run', async t => {
  const options = { 'dry-run': true, [namespace]: { filename: 'CHANGELOG-DRYRUN.md' } };
  const plugin = factory(Plugin, { namespace, options });
  await runTasks(plugin);
  assert.equal(fs.readFileSync('./CHANGELOG-DRYRUN.md').toString(), initialDryRunFileContents);
});

test('should not write changelog with keep unreleased option', async t => {
  const options = { [namespace]: { filename: 'CHANGELOG-DRYRUN.md', keepUnreleased: true } };
  const plugin = factory(Plugin, { namespace, options });
  await runTasks(plugin);
  assert.equal(fs.readFileSync('./CHANGELOG-DRYRUN.md').toString(), initialDryRunFileContents);
});

test('should find changelog even if less new lines is used', async t => {
  const options = { [namespace]: { filename: 'CHANGELOG-LESS_NEW_LINES.md' } };
  const plugin = factory(Plugin, { namespace, options });
  await runTasks(plugin);
  assert.equal(plugin.getChangelog(), '* Item A\n* Item B');
});

test('should write changelog (with different EOL)', async t => {
  const options = { [namespace]: { filename: 'CHANGELOG-EOL.md' } };
  const plugin = factory(Plugin, { namespace, options });
  await runTasks(plugin);
  assert.equal(plugin.getChangelog(), '* Item A\r\n* Item B');
  assert.match(
    readFile('./CHANGELOG-EOL.md'),
    /## \[1\.0\.1\] - [0-9]{4}-[0-9]{2}-[0-9]{2}\r\n\r\n\* Item A\r\n\* Item B\r\n\r\n## \[1\.0\.0\] - 2020-05-02\r\n\r\n\* Item C\r\n*\* Item D/
  );
});
