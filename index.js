const { Plugin } = require('release-it');
const fs = require('fs');
const path = require('path');

const pad = num => ('0' + num).slice(-2);

const getFormattedDate = () => {
  const today = new Date();
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
};

class KeepAChangelog extends Plugin {
  init() {
    const { filename, strictLatest, keepUnreleased } = this.options;

    this.filename = filename || 'CHANGELOG.md';
    this.strictLatest = strictLatest === undefined ? true : Boolean(strictLatest);
    this.keepUnreleased = keepUnreleased === undefined ? false : Boolean(keepUnreleased);

    this.changelogPath = path.resolve(this.filename);
    this.changelogContent = fs.readFileSync(this.changelogPath, 'utf-8');
    this.unreleasedTitleRaw = 'Unreleased';
    this.unreleasedTitle = `\n\n## [${this.unreleasedTitleRaw}]\n`;

    const hasUnreleasedSection = this.changelogContent.includes(this.unreleasedTitle);
    if (!hasUnreleasedSection) {
      throw Error(`Missing "${this.unreleasedTitleRaw}" section in ${filename}.`);
    }
  }

  getChangelog(latestVersion) {
    const { changelog } = this.getContext();
    if (changelog) return changelog;

    const { filename, strictLatest } = this;

    const previousReleaseTitle = strictLatest ? `## [${latestVersion}]` : `## [`;
    const hasPreviouReleaseSection = this.changelogContent.includes(previousReleaseTitle);

    if (strictLatest && !hasPreviouReleaseSection) {
      throw Error(`Missing section for previous release ("${latestVersion}") in ${filename}.`);
    }

    const startIndex = this.changelogContent.indexOf(this.unreleasedTitle) + this.unreleasedTitle.length;
    let endIndex = this.changelogContent.indexOf(previousReleaseTitle, startIndex);
    if (!strictLatest && endIndex === -1) {
      endIndex = this.changelogContent.length
    }

    const changelogContent = this.changelogContent.substring(startIndex, endIndex).trim();
    if (!changelogContent) {
      throw Error(`There are no entries under "${this.unreleasedTitleRaw}" section in ${filename}.`);
    }

    this.setContext({ changelog: changelogContent });
    return changelogContent;
  }

  bump(version) {
    this.setContext({ version });
  }

  beforeRelease() {
    const { keepUnreleased } = this
    const { isDryRun } = this.global;
    if (isDryRun || keepUnreleased) return;
    const { version } = this.getContext();
    const formattedDate = getFormattedDate();
    const releaseTitle = `\n\n## [${version}] - ${formattedDate}\n`;
    const changelog = this.changelogContent.replace(this.unreleasedTitle, releaseTitle);  
    fs.writeFileSync(this.changelogPath, changelog);
  }
}

module.exports = KeepAChangelog;
