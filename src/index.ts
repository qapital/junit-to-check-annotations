import * as core from '@actions/core';
import * as github from '@actions/github';
import * as octokit from '@octokit/rest';
import * as fs from 'fs';
import { execSync } from 'child_process';

const { GITHUB_TOKEN, GITHUB_WORKSPACE } = process.env;

type Annotation = octokit.Octokit.ChecksUpdateParamsOutputAnnotations;

// {
//   "classname": "AmountFormatterTests",
//   "name": "test_shouldFormatToADollarString()",
//   "failure": "expected to equal <validWithChanges(\"$4,0100\")>, got <validWithChanges(\"$4,010\")>  (/Users/vrutberg/code/qapital-iphone/Modules/ViewSupport/Tests/Tests/TextFieldFormatters/AmountFormatterTests.swift#CharacterRangeLen=0&EndingLineNumber=31&StartingLineNumber=31)"
// }
interface TestFailure {
  classname: string;
  name: string;
  failure: string;
}

// Regex match each line in the output and turn them into annotations
function parseOutput(testFailures: TestFailure[]): Annotation[] {
  let annotations: Annotation[] = [];
  for (let i = 0; i < testFailures.length; i++) {
    let error = testFailures[i];

    const annotation = {
      path: "./",
      start_line: 1,
      end_line: 1,
      start_column: 1,
      end_column: 1,
      annotation_level: <const>'failure',
      message: `${error.classname}.${error.name}: ${error.failure}`,
    };

    annotations.push(annotation);
  }
  return annotations;
}

async function createCheck(check_name: string, title: string, annotations: Annotation[]) {
  const gh = new octokit.Octokit({ auth: String(GITHUB_TOKEN) });
  const req = {
    ...github.context.repo,
    ref: core.getInput('commit_sha')
  }
  console.log(req)
  const res = await gh.checks.listForRef(req);
  console.log(res)

  const check_run_id = res.data.check_runs.filter(check => check.name === check_name)[0].id

  const update_req = {
    ...github.context.repo,
    check_run_id,
    output: {
      title,
      summary: `${annotations.length} errors(s) found`,
      annotations
    }
  }

  console.log(update_req)
  await gh.checks.update(update_req);
}

// most @actions toolkit packages have async methods
async function run() {
  try {
    const testResultPath = core.getInput('test_result_path');
    console.log(`Reading test result from: ${GITHUB_WORKSPACE}/${testResultPath}`);

    console.log("About to parse rest results and create result.json file...");
    let millis = new Date().getTime();

    execSync(`cat ${GITHUB_WORKSPACE}/${testResultPath} | xq '[.testsuites.testsuite.testcase[] | select(.failure != null)]' > ${GITHUB_WORKSPACE}/result.json`);
    let result = new Date().getTime() - millis;
    console.log(`Created result.json file! (took: ${result} milliseconds)`);

    const testResult = await fs.promises.readFile(`${GITHUB_WORKSPACE}/result.json`);
    const parsedTestResult: TestFailure[] = JSON.parse(testResult.toString());

    console.log(`Parsed test result: ${parsedTestResult}`);

    const annotations = parseOutput(parsedTestResult);

    if (annotations.length > 0) {
      console.log("===============================================================")
      console.log("| FAILURES DETECTED                                           |")
      console.log("|    You don't need to read this log output.                  |")
      console.log("|    Check the 'Files changed' tab for in-line annotations!   |")
      console.log("===============================================================")

      console.log(annotations);
      const checkName = core.getInput('check_name');
      await createCheck(checkName, 'failures detected', annotations);

      core.setFailed(`${annotations.length} errors(s) found`);
    }
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run()
