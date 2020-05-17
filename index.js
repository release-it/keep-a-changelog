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
    const { filename } = this.options;

    this.filename = filename || 'CHANGELOG.md';
    this.changelogPath = path.resolve(this.filename);
    this.changelogContent = fs.readFileSync(this.changelogPath, 'utf-8');
    this.unreleasedTitleRaw = 'Unreleased';
    this.unreleasedTitle = `\n\n## [${this.unreleasedTitleRaw}]\n\n`;

    const hasUnreleasedSection = this.changelogContent.includes(this.unreleasedTitle);
    if (!hasUnreleasedSection) {
      throw Error(`Missing "${this.unreleasedTitleRaw}" section in ${filename}.`);
    }
  }

  getChangelog(latestVersion) {
    const { changelog } = this.getContext();
    if (changelog) return changelog;

    const { filename } = this.options;
    const previousReleaseTitle = `\n\n## [${latestVersion}]`;
    const hasPreviouReleaseSection = this.changelogContent.includes(previousReleaseTitle);
    const startIndex = this.changelogContent.indexOf(this.unreleasedTitle) + this.unreleasedTitle.length;
    const endIndex = this.changelogContent.indexOf(previousReleaseTitle);
    const changelogContent = this.changelogContent.substring(startIndex, endIndex).trim();

    if (!hasPreviouReleaseSection) {
      throw Error(`Missing section for previous release ("${latestVersion}") in ${filename}.`);
    }

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
    const { isDryRun } = this.global;
    if (!isDryRun) {
      const { version } = this.getContext();
      const formattedDate = getFormattedDate();
      const releaseTitle = `\n\n## [${version}] - ${formattedDate}\n\n`;
      const changelog = this.changelogContent.replace(this.unreleasedTitle, releaseTitle);  
      fs.writeFileSync(this.changelogPath, changelog);
    }
  }
}

module.exports = KeepAChangelog;
