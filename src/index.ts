import * as core from '@actions/core';
import * as github from '@actions/github';
import { Octokit } from '@octokit/rest';
import { exec } from 'child_process';
import * as fs from 'fs';
import { promisify } from 'util';
import { TestFailure } from './testfailure';
import * as parsing from './parsing';

const asyncExec = promisify(exec);
const AUTH_TOKEN = core.getInput('token');
const { GITHUB_WORKSPACE } = process.env;

type Annotation = Octokit.ChecksUpdateParamsOutputAnnotations;

// Regex match each line in the output and turn them into annotations
function parseOutput(testFailures: TestFailure[]): Annotation[] {
  return testFailures.map(function (testFailure: TestFailure): Annotation {
    return {
      path: parsing.parsePath(GITHUB_WORKSPACE ?? "", testFailure),
      start_line: parsing.parseStartLine(testFailure),
      end_line: parsing.parseEndLine(testFailure),
      start_column: 1,
      end_column: 1,
      annotation_level: <const>'failure',
      message: `${testFailure.classname}.${testFailure.name}: ${parsing.parseMessage(testFailure)}`,
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

  console.log("request", req);
  console.log("response", res);

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

    await asyncExec(`cat ${GITHUB_WORKSPACE}/${testResultPath} | xq '[.testsuites.testsuite | if type == "array" then .[] else . end | .testcase | if type == "array" then .[] else . end | select(.failure != null) | { classname: ."@classname", name: ."@name", failure: .failure."@message" }]' > ${GITHUB_WORKSPACE}/result.json`);

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