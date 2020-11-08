const { Plugin } = require('release-it');
const fs = require('fs');
const path = require('path');
const detectNewline = require('detect-newline');

const pad = num => ('0' + num).slice(-2);

const getFormattedDate = () => {
  const today = new Date();
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
};

class KeepAChangelog extends Plugin {
  async init() {
    await super.init();
    const { filename, strictLatest, addUnreleased, keepUnreleased, addVersionUrl } = this.options;

    this.filename = filename || 'CHANGELOG.md';
    this.strictLatest = strictLatest === undefined ? true : Boolean(strictLatest);
    this.addUnreleased = addUnreleased === undefined ? false : Boolean(addUnreleased);
    this.keepUnreleased = keepUnreleased === undefined ? false : Boolean(keepUnreleased);
    this.addVersionUrl = addVersionUrl === undefined ? false : Boolean(addVersionUrl);

    this.changelogPath = path.resolve(this.filename);
    this.changelogContent = fs.readFileSync(this.changelogPath, 'utf-8');
    this.EOL = detectNewline(this.changelogContent);
    this.unreleasedTitleRaw = 'Unreleased';
    this.unreleasedTitle = `${this.EOL}${this.EOL}## [${this.unreleasedTitleRaw}]${this.EOL}`;

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
      endIndex = this.changelogContent.length;
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

  updateChangelogVersionUrls(changelog, repositoryUrl) {
    const { version, latestVersion, tagName, latestTag, tagTemplate } = this.config.getContext();
    let updatedChangelog = changelog;

    // Add or update the Unreleased link
    const unreleasedVersionLink = `[Unreleased]:`;
    const unreleasedVersionUrl = `[Unreleased]: ${repositoryUrl}/compare/${tagName}...HEAD`;
    if (updatedChangelog.includes(unreleasedVersionLink)) {
      updatedChangelog = updatedChangelog.replace(/\[Unreleased\]\:.*HEAD/, unreleasedVersionUrl);
    } else {
      updatedChangelog = `${updatedChangelog}${this.EOL}${this.EOL}${unreleasedVersionUrl}`;
    }

    // Add a link for the new version
    const latestVersionLink = `[${latestVersion}]:`;
    const newVersionUrl = `[${version}]: ${repositoryUrl}/compare/${latestTag}...${tagName}`;
    if (updatedChangelog.includes(latestVersionLink)) {
      updatedChangelog = updatedChangelog.replace(latestVersionLink, `${newVersionUrl}${this.EOL}${latestVersionLink}`)
    } else {
      updatedChangelog = `${updatedChangelog}${this.EOL}${newVersionUrl}${this.EOL}`;
    }
    return updatedChangelog;
  }

  beforeRelease() {
    const { addUnreleased, keepUnreleased, addVersionUrl } = this;
    const { isDryRun } = this.config;
    if (isDryRun || keepUnreleased) return;
    const { version } = this.getContext();
    const formattedDate = getFormattedDate();
    const releaseTitle = `${addUnreleased ? this.unreleasedTitle : this.EOL}${this.EOL}## [${version}] - ${formattedDate}${this.EOL}`;
    let changelog = this.changelogContent.replace(this.unreleasedTitle, releaseTitle);

    if (addVersionUrl) {
      const gitRemote = this.config.getContext("repo");
      if (gitRemote && gitRemote.host && gitRemote.repository) {
        const repositoryUrl = `https://${gitRemote.host}/${gitRemote.repository}`;
        changelog = this.updateChangelogVersionUrls(changelog, repositoryUrl)
      }
    }

    fs.writeFileSync(this.changelogPath, changelog);
  }
}

module.exports = KeepAChangelog;
