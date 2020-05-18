# Keep-a-changelog plugin for release-it

This [release-it plugin](https://github.com/release-it/release-it/blob/master/docs/plugins/README.md) maintains your
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
