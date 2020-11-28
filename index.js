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
    this.unreleasedTitle = `## [${this.unreleasedTitleRaw}]`;

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

  addVersionUrls(changelog) {
    const { version, latestVersion, tagName, latestTag, repo } = this.config.getContext();
    let updatedChangelog = changelog;

    const repositoryUrl = `https://${repo.host}/${repo.repository}`;

    // Add or update the Unreleased link
    const unreleasedUrl = `${repositoryUrl}/compare/${tagName}...HEAD`;
    const unreleasedLink = `[Unreleased]: ${unreleasedUrl}`;
    if (updatedChangelog.includes('[Unreleased]:')) {
      updatedChangelog = updatedChangelog.replace(/\[Unreleased\]\:.*HEAD/, unreleasedLink);
    } else {
      updatedChangelog = `${updatedChangelog}${this.EOL}${this.EOL}${unreleasedLink}`;
    }

    // Add a link for the new version
    const latestVersionLink = `[${latestVersion}]:`;
    const releaseUrl = `${repositoryUrl}/compare/${latestTag}...${tagName}`;
    const releaseLink = `[${version}]: ${releaseUrl}`;
    if (updatedChangelog.includes(latestVersionLink)) {
      return updatedChangelog.replace(latestVersionLink, `${releaseLink}${this.EOL}${latestVersionLink}`);
    } else {
      return `${updatedChangelog}${this.EOL}${versionLink}${this.EOL}`;
    }
  }

  beforeRelease() {
    const { addUnreleased, keepUnreleased, addVersionUrl } = this;
    const { isDryRun } = this.config;
    if (isDryRun || keepUnreleased) return;
    const { version } = this.getContext();
    const formattedDate = getFormattedDate();
    const unreleasedTitle = addUnreleased ? this.unreleasedTitle : '';
    const releaseTitle = `${unreleasedTitle}${this.EOL}${this.EOL}## [${version}] - ${formattedDate}`;
    let changelog = this.changelogContent.replace(this.unreleasedTitle, releaseTitle);

    if (addVersionUrl) {
      changelog = this.addVersionUrls(changelog);
    }

    fs.writeFileSync(this.changelogPath, changelog);
  }
}

module.exports = KeepAChangelog;
