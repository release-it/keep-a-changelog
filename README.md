# Keep-a-changelog plugin for release-it

This [release-it plugin](https://github.com/release-it/release-it/blob/master/docs/plugins.md) maintains your
CHANGELOG.md file according to the [Keep A Changelog](https://keepachangelog.com/) standards.

The idea and initial implementation comes [from @eMarek](https://github.com/release-it/release-it/issues/662).

```
npm install --save-dev @release-it/keep-a-changelog
```

In [release-it](https://github.com/release-it/release-it) config:

```json
"plugins": {
  "@release-it/keep-a-changelog": {
    "filename": "CHANGELOG.md"
  }
}
```

## Options

| option            | default value    | description                                                                                                                                      |
| ----------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| filename          | `'CHANGELOG.md'` | File with changelogs.                                                                                                                            |
| strictLatest      | `true`           | Entry of latest version must be present in order to get correct changelog. Set this option to `false` if you expect latest version without logs. |
| addUnreleased     | `false`          | It leaves "Unreleased" title row if set to `true`.                                                                                               |
| keepUnreleased    | `false`          | It leaves "Unreleased" title row unchanged if set to `true`.                                                                                     |
| addVersionUrl     | `false`          | Links the version to the according changeset. Uses GitHub-compatible URLs by default, see other options to configure the URL format.             |
| versionUrlFormats | See below.       | Determines the version URL format when `addVersionUrl` is set to `true`. Uses GitHub-compatible URLs by default.                                 |
| head              | `'HEAD'`         | The git revision the new version tag is compared to in the Unreleased URL.                                                                       |

### versionUrlFormats

The URL formats used when `addVersionUrl` is set to `true`. Example configuration for a repository in Azure DevOps:

```json
"plugins": {
  "@release-it/keep-a-changelog": {
    "filename": "CHANGELOG.md",
    "head": "main",
    "addVersionUrl": true,
    "versionUrlFormats": {
      "repositoryUrl": "https://dev.azure.com/...",
      "unreleasedUrl": "{repositoryUrl}/branchCompare?baseVersion=GT{tagName}&targetVersion=GB{head}",
      "versionUrl": "{repositoryUrl}/branchCompare?baseVersion=GT{previousTag}&targetVersion=GT{tagName}",
      "firstVersionUrl": "{repositoryUrl}?version=GT{tagName}"
    }
  }
}
```

| option          | default value                                         | description                                                                                 |
| --------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| repositoryUrl   | `'https://{host}/{repository}'`                       | The format of the repository URL.                                                           |
| unreleasedUrl   | `'{repositoryUrl}/compare/{tagName}...{head}'`        | The format of the `[unreleased]` section URL.                                               |
| versionUrl      | `'{repositoryUrl}/compare/{previousTag}...{tagName}'` | The format of a release version URL.                                                        |
| firstVersionUrl | `'{repositoryUrl}/releases/tag/{tagName}'`            | The format of the first release version URL, i.e. when no previous tags have been released. |
