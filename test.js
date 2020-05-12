const fs = require('fs');
const test = require('bron');
const assert = require('assert').strict;
const mock = require('mock-fs');
const { factory, runTasks } = require('release-it/test/util');
const Plugin = require('.');

mock({
  './CHANGELOG-FOO.md': '\n\n## [FOO]\n\n* Item A\n* Item B',
  './CHANGELOG-UNRELEASED.md': '\n\n## [Unreleased]\n\n* Item A\n* Item B',
  './CHANGELOG-EMPTY.md': '\n\n## [Unreleased]\n\n\n\n## [1.0.0]\n\n* Item A\n* Item B',
  './CHANGELOG-FULL.md': '\n\n## [Unreleased]\n\n* Item A\n* Item B\n\n## [1.0.0] - 2020-05-02\n\n* Item C\n* Item D'
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
