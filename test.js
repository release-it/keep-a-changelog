import { strict as assert } from 'node:assert';
import test from 'bron';
import fs from 'node:fs';
import { vol } from 'memfs';
import { patchFs } from 'fs-monkey';
import { factory, runTasks } from 'release-it/test/util/index.js';
import sinon from 'sinon';
import Plugin from './index.js';

const initialDryRunFileContents =
  '\n\n## [Unreleased]\n\n* Item A\n* Item B\n\n## [1.0.0] - 2020-05-02\n\n* Item C\n* Item D';

vol.fromJSON({
  './CHANGELOG-FOO.md': '## [FOO]\n\n* Item A\n* Item B',
  './CHANGELOG-MULTIPLE_UNRELEASED.md': '## [Unreleased]\n* Item A\n\n## [Unreleased]* Item B\nB\n* Item C\n* Item D',
  './CHANGELOG-INVALID_ORDER.md': '## [Unreleased]\n\n## [0.2.0]\n* Item A\n\n## [0.3.0]* Item B\nB\n\n## [0.1.0]\n* Item C\n* Item D',
  './CHANGELOG-EMPTY.md': '## [Unreleased]\n\n\n\n## [1.0.0]\n\n* Item A\n* Item B',
  './CHANGELOG-FULL.md':
    '# Changelog\n\n## [Unreleased]\n\n* Item A\n* Item B\n\n## [1.0.0] - 2020-05-02\n\n* Item C\n* Item D',
  './CHANGELOG-DRYRUN.md': initialDryRunFileContents,
  './CHANGELOG-LESS_NEW_LINES.md': '## [Unreleased]\n* Item A\n* Item B\n## [1.0.0] - 2020-05-02\n* Item C\n* Item D',
  './CHANGELOG-EOL.md':
    '\r\n\r\n## [Unreleased]\r\n\r\n* Item A\r\n* Item B\r\n\r\n## [1.0.0] - 2020-05-02\r\n\r\n* Item C\r\n* Item D',
  './CHANGELOG-UNRELEASED.md': '## [Unreleased]\n\n* Item A\n* Item B\n\n## [1.0.0] - 2020-05-02\n\n* Item C\n* Item D',
  './CHANGELOG-VERSION_URL.md':
    '## [Unreleased]\n\n* Item A\n* Item B\n\n## [1.0.0] - 2020-05-02\n\n* Item C\n* Item D\n\n[unreleased]: https://github.com/release-it/release-it/compare/1.0.0..HEAD\n[1.0.0]: https://github.com/release-it/release-it/compare/0.0.0...1.0.0',
  './CHANGELOG-VERSION_URL_FORMATS.md':
    '## [Unreleased]\n\n* Item A\n* Item B\n\n## [1.0.0] - 2020-05-02\n\n* Item C\n* Item D\n\n[unreleased]: https://github.com/_git/release-it/release-it/compareBranch/1.0.0/HEAD\n[1.0.0]: https://github.com/_git/release-it/release-it/compareBranch/0.0.0/1.0.0',
  './CHANGELOG-VERSION_URL_HEAD.md':
    '## [Unreleased]\n\n* Item A\n* Item B\n\n## [1.0.0] - 2020-05-02\n\n* Item C\n* Item D\n\n[unreleased]: https://github.com/release-it/release-it/compare/1.0.0..main\n[1.0.0]: https://github.com/release-it/release-it/compare/0.0.0...1.0.0',
  './CHANGELOG-VERSION_URL_UNRELEASED.md':
    '## [Unreleased]\n\n* Item A\n* Item B\n\n## [1.0.0] - 2020-05-02\n\n* Item C\n* Item D\n\n[unreleased]: https://github.com/user/project/compare/1.0.0..HEAD\n[1.0.0]: https://github.com/user/project/compare/0.0.0...1.0.0',
  './CHANGELOG-VERSION_URL_UNRELEASED_TITLE_CASE.md':
    '## [Unreleased]\n\n* Item A\n* Item B\n\n## [1.0.0] - 2020-05-02\n\n* Item C\n* Item D\n\n[Unreleased]: https://github.com/user/project/compare/1.0.0..HEAD\n[1.0.0]: https://github.com/user/project/compare/0.0.0...1.0.0',
  './CHANGELOG-VERSION_URL_NEW.md': '## [Unreleased]\n\n* Item A\n* Item B\n'
});

patchFs(vol);

const readFile = file => fs.readFileSync(file).toString();

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

test('should throw for missing "unreleased" section when no-increment flag is set if changelog is misformatted', async t => {
  const options = { increment: false, [namespace]: { filename: 'CHANGELOG-FOO.md' } };
  const plugin = factory(Plugin, { namespace, options });
  await assert.rejects(runTasks(plugin), /Missing "Unreleased" section in CHANGELOG-FOO.md/);
});

test('should throw for multiple "unreleased" sections', async t => {
  const options = { [namespace]: { filename: 'CHANGELOG-MULTIPLE_UNRELEASED.md' } };
  const plugin = factory(Plugin, { namespace, options });
  await assert.rejects(runTasks(plugin), /Too many "Unreleased" sections in CHANGELOG-MULTIPLE_UNRELEASED.md: \d+./);
});
test('should throw for invalid order', async t => {
  const options = { [namespace]: { filename: 'CHANGELOG-INVALID_ORDER.md' } };
  const plugin = factory(Plugin, { namespace, options });
  await assert.rejects(runTasks(plugin), /Invalid sections order in CHANGELOG-INVALID_ORDER.md: 0.2.0, 0.3.0./);
});

test('should find "1.0.0" section when no-increment flag is set when items under version', async t => {
  const options = { increment: false, [namespace]: { filename: 'CHANGELOG-EMPTY.md' } };
  const plugin = factory(Plugin, { namespace, options });
  await runTasks(plugin);
  assert.equal(plugin.getChangelog('1.0.0'), '* Item A\n* Item B');
});

test('should find "1.0.0" section when no-increment flag is set when items under unreleased and version', async t => {
  const options = { increment: false, [namespace]: { filename: 'CHANGELOG-FULL.md' } };
  const plugin = factory(Plugin, { namespace, options });
  await runTasks(plugin);
  assert.equal(plugin.getChangelog('1.0.0'), '* Item C\n* Item D');
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
    /^# Changelog\n\n## \[1\.0\.1] - [0-9]{4}-[0-9]{2}-[0-9]{2}\n\n\* Item A\n\* Item B\n\n## \[1\.0\.0] - 2020-05-02\n\n\* Item C\n*\* Item D\n$/
  );
});

test('should not write changelog in dry run', async t => {
  const options = { 'dry-run': true, [namespace]: { filename: 'CHANGELOG-DRYRUN.md' } };
  const plugin = factory(Plugin, { namespace, options });
  await runTasks(plugin);
  assert.equal(readFile('./CHANGELOG-DRYRUN.md'), initialDryRunFileContents);
});

test('should not write changelog with keep unreleased option', async t => {
  const options = { [namespace]: { filename: 'CHANGELOG-DRYRUN.md', keepUnreleased: true } };
  const plugin = factory(Plugin, { namespace, options });
  await runTasks(plugin);
  assert.equal(readFile('./CHANGELOG-DRYRUN.md'), initialDryRunFileContents);
});

test('should find changelog even if less new lines is used', async t => {
  const options = { [namespace]: { filename: 'CHANGELOG-LESS_NEW_LINES.md' } };
  const plugin = factory(Plugin, { namespace, options });
  await runTasks(plugin);
  assert.equal(plugin.getChangelog(), '* Item A\n* Item B');
});

test('should write changelog with different EOL', async t => {
  const options = { [namespace]: { filename: 'CHANGELOG-EOL.md' } };
  const plugin = factory(Plugin, { namespace, options });
  await runTasks(plugin);
  assert.equal(plugin.getChangelog(), '* Item A\r\n* Item B');
  assert.match(
    readFile('./CHANGELOG-EOL.md'),
    /^## \[1\.0\.1] - [0-9]{4}-[0-9]{2}-[0-9]{2}\r\n\r\n\* Item A\r\n\* Item B\r\n\r\n## \[1\.0\.0] - 2020-05-02\r\n\r\n\* Item C\r\n*\* Item D\r\n/
  );
});

test('should write changelog and add unreleased section', async t => {
  const options = { [namespace]: { filename: 'CHANGELOG-UNRELEASED.md', addUnreleased: true } };
  const plugin = factory(Plugin, { namespace, options });
  await runTasks(plugin);
  assert.equal(plugin.getChangelog(), '* Item A\n* Item B');
  assert.match(
    readFile('./CHANGELOG-UNRELEASED.md'),
    /^## \[Unreleased]\n\n## \[1\.0\.1] - [0-9]{4}-[0-9]{2}-[0-9]{2}\n\n\* Item A\n\* Item B\n\n## \[1\.0\.0] - 2020-05-02\n\n\* Item C\n*\* Item D/
  );
});

test('should add links to the end of the file', async t => {
  const options = { [namespace]: { filename: 'CHANGELOG-VERSION_URL.md', addVersionUrl: true } };
  const plugin = factory(Plugin, { namespace, options });
  plugin.config.setContext({
    latestTag: '1.0.0',
    repo: {
      host: 'github.com',
      repository: 'release-it/release-it'
    }
  });
  await runTasks(plugin);
  assert.equal(plugin.getChangelog(), '* Item A\n* Item B');
  assert.match(
    readFile('./CHANGELOG-VERSION_URL.md'),
    /^## \[1\.0\.1] - [0-9]{4}-[0-9]{2}-[0-9]{2}\n\n\* Item A\n\* Item B\n\n## \[1\.0\.0] - 2020-05-02\n\n\* Item C\n*\* Item D\n\n\[unreleased]: https:\/\/github\.com\/release-it\/release-it\/compare\/1\.0\.1\.\.\.HEAD\n\[1\.0\.1]: https:\/\/github\.com\/release-it\/release-it\/compare\/1\.0\.0\.\.\.1\.0\.1\n\[1\.0\.0]: https:\/\/github\.com\/release-it\/release-it\/compare\/0\.0\.0\.\.\.1\.0\.0\n$/
  );
});

test('should add links with custom URL formats to the end of the file', async t => {
  const options = {
    [namespace]: {
      filename: 'CHANGELOG-VERSION_URL_FORMATS.md',
      addVersionUrl: true,
      versionUrlFormats: {
        repositoryUrl: 'https://{host}/_git/{repository}',
        unreleasedUrl: '{repositoryUrl}/compareBranch/{tagName}/{head}',
        versionUrl: '{repositoryUrl}/compareBranch/{previousTag}/{tagName}'
      }
    }
  };
  const plugin = factory(Plugin, { namespace, options });
  plugin.config.setContext({
    latestTag: '1.0.0',
    repo: {
      host: 'github.com',
      repository: 'release-it/release-it'
    }
  });
  await runTasks(plugin);
  assert.equal(plugin.getChangelog(), '* Item A\n* Item B');
  assert.match(
    readFile('./CHANGELOG-VERSION_URL_FORMATS.md'),
    /^## \[1\.0\.1] - [0-9]{4}-[0-9]{2}-[0-9]{2}\n\n\* Item A\n\* Item B\n\n## \[1\.0\.0] - 2020-05-02\n\n\* Item C\n*\* Item D\n\n\[unreleased]: https:\/\/github\.com\/_git\/release-it\/release-it\/compareBranch\/1\.0\.1\/HEAD\n\[1\.0\.1]: https:\/\/github\.com\/_git\/release-it\/release-it\/compareBranch\/1\.0\.0\/1\.0\.1\n\[1\.0\.0]: https:\/\/github\.com\/_git\/release-it\/release-it\/compareBranch\/0\.0\.0\/1\.0\.0\n$/
  );
});

test('should add links with custom head to the end of the file', async t => {
  const options = { [namespace]: { filename: 'CHANGELOG-VERSION_URL_HEAD.md', addVersionUrl: true, head: 'main' } };
  const plugin = factory(Plugin, { namespace, options });
  plugin.config.setContext({
    latestTag: '1.0.0',
    repo: {
      host: 'github.com',
      repository: 'release-it/release-it'
    }
  });
  await runTasks(plugin);
  assert.equal(plugin.getChangelog(), '* Item A\n* Item B');
  assert.match(
    readFile('./CHANGELOG-VERSION_URL_HEAD.md'),
    /^## \[1\.0\.1] - [0-9]{4}-[0-9]{2}-[0-9]{2}\n\n\* Item A\n\* Item B\n\n## \[1\.0\.0] - 2020-05-02\n\n\* Item C\n*\* Item D\n\n\[unreleased]: https:\/\/github\.com\/release-it\/release-it\/compare\/1\.0\.1\.\.\.main\n\[1\.0\.1]: https:\/\/github\.com\/release-it\/release-it\/compare\/1\.0\.0\.\.\.1\.0\.1\n\[1\.0\.0]: https:\/\/github\.com\/release-it\/release-it\/compare\/0\.0\.0\.\.\.1\.0\.0\n$/
  );
});

test('should add unreleased section and links to the end of the file', async t => {
  const options = {
    [namespace]: { filename: 'CHANGELOG-VERSION_URL_UNRELEASED.md', addVersionUrl: true, addUnreleased: true }
  };
  const plugin = factory(Plugin, { namespace, options });
  plugin.config.setContext({
    latestTag: '1.0.0',
    repo: {
      host: 'github.com',
      repository: 'user/project'
    }
  });
  await runTasks(plugin);
  assert.equal(plugin.getChangelog(), '* Item A\n* Item B');
  assert.match(
    readFile('./CHANGELOG-VERSION_URL_UNRELEASED.md'),
    /^## \[Unreleased]\n\n## \[1\.0\.1] - [0-9]{4}-[0-9]{2}-[0-9]{2}\n\n\* Item A\n\* Item B\n\n## \[1\.0\.0] - 2020-05-02\n\n\* Item C\n*\* Item D\n\n\[unreleased]: https:\/\/github\.com\/user\/project\/compare\/1\.0\.1\.\.\.HEAD\n\[1\.0\.1]: https:\/\/github\.com\/user\/project\/compare\/1\.0\.0\.\.\.1\.0\.1\n\[1\.0\.0]: https:\/\/github\.com\/user\/project\/compare\/0\.0\.0\.\.\.1\.0\.0\n/
  );
});

test('should match an existing unreleased link in title case', async t => {
  const options = {
    [namespace]: { filename: 'CHANGELOG-VERSION_URL_UNRELEASED_TITLE_CASE.md', addVersionUrl: true, addUnreleased: true }
  };
  const plugin = factory(Plugin, { namespace, options });
  plugin.config.setContext({
    latestTag: '1.0.0',
    repo: {
      host: 'github.com',
      repository: 'user/project'
    }
  });
  await runTasks(plugin);
  assert.equal(plugin.getChangelog(), '* Item A\n* Item B');
  assert.match(
    readFile('./CHANGELOG-VERSION_URL_UNRELEASED_TITLE_CASE.md'),
    /^## \[Unreleased]\n\n## \[1\.0\.1] - [0-9]{4}-[0-9]{2}-[0-9]{2}\n\n\* Item A\n\* Item B\n\n## \[1\.0\.0] - 2020-05-02\n\n\* Item C\n*\* Item D\n\n\[unreleased]: https:\/\/github\.com\/user\/project\/compare\/1\.0\.1\.\.\.HEAD\n\[1\.0\.1]: https:\/\/github\.com\/user\/project\/compare\/1\.0\.0\.\.\.1\.0\.1\n\[1\.0\.0]: https:\/\/github\.com\/user\/project\/compare\/0\.0\.0\.\.\.1\.0\.0\n/
  );
});

test('should add links to the end of a new changelog', async t => {
  const options = {
    [namespace]: { filename: 'CHANGELOG-VERSION_URL_NEW.md', addVersionUrl: true, strictLatest: false }
  };
  const plugin = factory(Plugin, { namespace, options });
  sinon.stub(plugin, 'getLatestVersion').returns('0.0.0');
  plugin.config.setContext({
    latestTag: undefined,
    increment: 'major',
    repo: {
      host: 'github.com',
      repository: 'user/project'
    }
  });
  await runTasks(plugin);
  assert.equal(plugin.getChangelog(), '* Item A\n* Item B');
  assert.match(
    readFile('./CHANGELOG-VERSION_URL_NEW.md'),
    /^## \[1\.0\.0] - [0-9]{4}-[0-9]{2}-[0-9]{2}\n\n\* Item A\n\* Item B\n\n\[unreleased]: https:\/\/github\.com\/user\/project\/compare\/1\.0\.0\.\.\.HEAD\n\[1\.0\.0]: https:\/\/github\.com\/user\/project\/releases\/tag\/1\.0\.0\n$/
  );
});
