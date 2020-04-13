import * as core from '@actions/core';
import * as github from '@actions/github';
import { Octokit } from '@octokit/rest';
import { exec } from 'child_process';
import * as fs from 'fs';
import { promisify } from 'util';

const asyncExec = promisify(exec);
const AUTH_TOKEN = core.getInput('token');
const { GITHUB_WORKSPACE } = process.env;

type Annotation = Octokit.ChecksUpdateParamsOutputAnnotations;

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

function path(workspacePath: string, testFailure: TestFailure): string {
  let path = new RegExp(".+\\(" + workspacePath + "\\/([\\/\\w\\s-.]+).+\\)$");
  let matches = path.exec(testFailure.failure);
  return matches == null ? testFailure.failure : matches[1];
}

function message(testFailure: TestFailure): string {
  let message = /(.+)\(.+\)$/;
  let matches = message.exec(testFailure.failure);
  return matches == null ? testFailure.failure : matches[1];
}

function start_line(testFailure: TestFailure): number {
  let startingLineNumber = /StartingLineNumber=(\d+)/;
  let matches = startingLineNumber.exec(testFailure.failure);
  return matches == null ? 1 : parseInt(matches[1]);
}

function end_line(testFailure: TestFailure): number {
  let endingLineNumber = /EndingLineNumber=(\d+)/;
  let matches = endingLineNumber.exec(testFailure.failure);
  return matches == null ? 1 : parseInt(matches[1]);
}

// Regex match each line in the output and turn them into annotations
function parseOutput(testFailures: TestFailure[]): Annotation[] {
  return testFailures.map(function (testFailure: TestFailure): Annotation {
    return {
      path: path(GITHUB_WORKSPACE ?? "", testFailure),
      start_line: start_line(testFailure),
      end_line: end_line(testFailure),
      start_column: 1,
      end_column: 1,
      annotation_level: <const>'failure',
      message: `${testFailure.classname}.${testFailure.name}: ${message(testFailure)}`,
    };
  });
}

async function createCheck(check_name: string, title: string, annotations: Annotation[]) {
  const gh = new Octokit({ auth: AUTH_TOKEN });
  const req = {
    ...github.context.repo,
    ref: core.getInput('commit_sha'),
  };

  const res = await gh.checks.listForRef(req);

  res.data.check_runs.forEach(check_run => console.log(check_run));

  const check_run_id = res.data.check_runs.filter(check => check.name === check_name)[0].id;

  const update_req: (Octokit.RequestOptions & Octokit.ChecksUpdateParams) = {
    ...github.context.repo,
    check_run_id,
    output: {
      title,
      summary: `${annotations.length} errors(s) found`,
      annotations
    }
  };

  await gh.checks.update(update_req);
}

// most @actions toolkit packages have async methods
async function run() {
  try {
    const testResultPath = core.getInput('test_result_path');

    await asyncExec(`cat ${GITHUB_WORKSPACE}/${testResultPath} | xq '[.testsuites.testsuite.testcase | if type == "array" then .[] else . end | select(.failure != null) | { classname: ."@classname", name: ."@name", failure: .failure."@message" }]' > ${GITHUB_WORKSPACE}/result.json`);

    const testResult = await fs.promises.readFile(`${GITHUB_WORKSPACE}/result.json`);
    const parsedTestResult: TestFailure[] = JSON.parse(testResult.toString());

    const annotations = parseOutput(parsedTestResult);

    if (annotations.length > 0) {
      console.log("===============================================================")
      console.log("| FAILURES DETECTED                                           |")
      console.log("|    You don't need to read this log output.                  |")
      console.log("|    Check the 'Files changed' tab for in-line annotations!   |")
      console.log("===============================================================")

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
