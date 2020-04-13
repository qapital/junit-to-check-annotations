
<p align="center">
  <a href="https://github.com/actions/javascript-action/actions"><img alt="javscript-action status" src="https://github.com/actions/javascript-action/workflows/units-test/badge.svg"></a>
</p>

## Prerequisites

`yq` must be installed: https://github.com/kislyuk/yq

## Packaging for distribution

```bash
$ npm test && npm run build && npm run pack
$ git add dist
$ git commit
$ git push
```

## Usage

```yaml
uses: qapital/junit-to-check-annotations@master
if: failure()
with:
  test_result_path: TestSummaries.xml
  token: ${{ secrets.GITHUB_TOKEN }}
  commit_sha: ${{ github.sha }}
  check_name: "build"
```
