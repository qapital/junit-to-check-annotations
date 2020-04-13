
<p align="center">
  <a href="https://github.com/actions/javascript-action/actions"><img alt="javscript-action status" src="https://github.com/actions/javascript-action/workflows/units-test/badge.svg"></a>
</p>

## Packaging for distribution

```bash
$ npm run build && npm run pack
$ git add dist lib
$ git commit
$ git push
```

## Usage

You can now consume the action by referencing the v1 branch

```yaml
uses: qapital/junit-to-check-annotations@master
if: failure()
with:
  test_result_path: TestSummaries.xml
  token: ${{ secrets.GITHUB_TOKEN }}
  commit_sha: ${{ github.sha }}
  check_name: "build"
```
