import { Plugin } from 'release-it';
import fs from 'fs';
import path from 'path';
import { detectNewline } from 'detect-newline';
import format from 'string-template';
import semver from "semver";

const pad = num => ('0' + num).slice(-2);

const getFormattedDate = () => {
  const today = new Date();
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
};

/**
 * Default formats used for creating version URLs. Uses GitHub URL formats, e.g.
 *
 * https://github.com/release-it/release-it/compare/1.0.0...HEAD
 * https://github.com/release-it/release-it/compare/0.0.0...1.0.0
 * https://github.com/release-it/release-it/releases/tag/1.0.0
 */
const defaultVersionUrlFormats = {
  repositoryUrl: 'https://{host}/{repository}',
  unreleasedUrl: '{repositoryUrl}/compare/{tagName}...{head}',
  versionUrl: '{repositoryUrl}/compare/{previousTag}...{tagName}',
  firstVersionUrl: '{repositoryUrl}/releases/tag/{tagName}'
};

class KeepAChangelog extends Plugin {
  async init() {
    await super.init();
    const { filename, addUnreleased, keepUnreleased, addVersionUrl, versionUrlFormats, head } = this.options;

    this.filename = filename || 'CHANGELOG.md';
    this.addUnreleased = addUnreleased === undefined ? false : Boolean(addUnreleased);
    this.keepUnreleased = keepUnreleased === undefined ? false : Boolean(keepUnreleased);
    this.addVersionUrl = addVersionUrl === undefined ? false : Boolean(addVersionUrl);
    this.versionUrlFormats = versionUrlFormats
      ? { ...defaultVersionUrlFormats, ...versionUrlFormats }
      : defaultVersionUrlFormats;
    this.head = head || 'HEAD';

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

    const unreleasedTitleRawList = Array.from(this.changelogContent.matchAll(/(?<=## \[)Unreleased(?=])/g)).map(ver => ver?.[0])
    if(unreleasedTitleRawList.length > 1) {
      throw new Error(`Too many "Unreleased" sections in ${this.filename}: ${unreleasedTitleRawList.length}.`)
    }
    const versionTitleRawList = Array.from(this.changelogContent.matchAll(/(?<=## \[)((\d+\.){2}\d+[^\]]*)/g)).map(ver => ver?.[0])
    const badTitleRawList = versionTitleRawList.filter(ver => {
      // invalid: ver > latestVersion
      return !semver.valid(ver) || semver.gt(ver, latestVersion);
    })
    if(badTitleRawList.length > 0) {
      throw new Error(`Invalid versions in ${this.filename}: ${badTitleRawList.join(', ')}. Current: ${latestVersion}.`)
    }
    const unorderedTitleRawList = versionTitleRawList.filter((ver, veri) => {
      const previous = versionTitleRawList[veri - 1];
      const next = versionTitleRawList[veri + 1];

      if(previous) {
        // bad order: ver > previous
        return semver.gt(ver, previous)
      }

      if(next) {
        // bad order: ver < next
        return semver.lt(ver, next)
      }

      return false
    })
    if(unorderedTitleRawList.length > 0) {
      throw new Error(`Invalid sections order in ${this.filename}: ${unorderedTitleRawList.join(', ')}.`)
    }

    const { isIncrement } = this.config;
    // use unreleased if initial release
    const titleToFind = isIncrement || versionTitleRawList.length === 0 ? this.unreleasedTitleRaw : latestVersion;
    const changelogContent = this.getChangelogEntryContent(titleToFind);

    this.setContext({ changelog: changelogContent });
    return changelogContent;
  }

  getChangelogEntryContent(releaseTitleRaw) {
    const { filename, changelogContent, EOL } = this;

    const releaseTitleMarkdown = `## [${releaseTitleRaw}]`;
    const previousReleaseTitle = `## [`;

    const indexOfReleaseTitle = changelogContent.indexOf(releaseTitleMarkdown);

    if (indexOfReleaseTitle === -1) {
      throw Error(`Missing section for previous release ("${releaseTitleRaw}") in ${filename}.`);
    }

    const entryContentStartIndex = changelogContent.indexOf(EOL, indexOfReleaseTitle);
    let entryContentEndIndex = changelogContent.indexOf(previousReleaseTitle, entryContentStartIndex);
    if (entryContentEndIndex === -1) {
      entryContentEndIndex = changelogContent.length;
    }

    const changelogEntryContent = changelogContent.substring(entryContentStartIndex, entryContentEndIndex).trim();
    if (!changelogEntryContent) {
      throw Error(`There are no entries under "${releaseTitleRaw}" section in ${filename}.`);
    }

    return changelogEntryContent;
  }

  bump(version) {
    this.setContext({ version });
  }

  addVersionUrls(changelog) {
    const { version, latestVersion, tagName, latestTag, repo } = this.config.getContext();
    let updatedChangelog = changelog;

    const repositoryUrl = format(this.versionUrlFormats.repositoryUrl, repo);
    const unreleasedLinkRegex = new RegExp(`\\[unreleased\\]\\:.*${this.head}`, 'i');

    // Add or update the Unreleased link
    const unreleasedUrl = format(this.versionUrlFormats.unreleasedUrl, { repositoryUrl, tagName, head: this.head });
    const unreleasedLink = `[unreleased]: ${unreleasedUrl}`;
    if (unreleasedLinkRegex.test(updatedChangelog)) {
      updatedChangelog = updatedChangelog.replace(unreleasedLinkRegex, unreleasedLink);
    } else {
      updatedChangelog = `${updatedChangelog}${this.EOL}${unreleasedLink}`;
    }

    // Add a link for the first tagged version
    if (!latestTag || latestTag === '0.0.0') {
      const firstVersionUrl = format(this.versionUrlFormats.firstVersionUrl, { repositoryUrl, tagName });
      const firstVersionLink = `[${version}]: ${firstVersionUrl}`;
      return `${updatedChangelog}${this.EOL}${firstVersionLink}`;
    }

    // Add a link for the new version
    const latestVersionLink = `[${latestVersion}]:`;
    const versionUrl = format(this.versionUrlFormats.versionUrl, { repositoryUrl, previousTag: latestTag, tagName });
    const versionLink = `[${version}]: ${versionUrl}`;
    if (updatedChangelog.includes(latestVersionLink)) {
      return updatedChangelog.replace(latestVersionLink, `${versionLink}${this.EOL}${latestVersionLink}`);
    } else {
      return `${updatedChangelog}${this.EOL}${versionLink}`;
    }
  }

  beforeRelease() {
    const { addUnreleased, keepUnreleased, addVersionUrl } = this;
    const { isDryRun, isIncrement } = this.config;
    if (isDryRun || keepUnreleased || !isIncrement) return;
    const { version } = this.getContext();
    const formattedDate = getFormattedDate();
    const unreleasedTitle = addUnreleased ? this.unreleasedTitle + this.EOL + this.EOL : '';
    const releaseTitle = `${unreleasedTitle}## [${version}] - ${formattedDate}`;
    let changelog = this.changelogContent.replace(this.unreleasedTitle, releaseTitle);

    if (addVersionUrl) {
      changelog = this.addVersionUrls(changelog);
    }

    fs.writeFileSync(this.changelogPath, changelog.trim() + this.EOL);
  }
}

export default KeepAChangelog;
