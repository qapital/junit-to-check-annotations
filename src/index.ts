import * as core from '@actions/core';
import { Octokit } from '@octokit/rest';
import { exec } from 'child_process';
import * as fs from 'fs';
import { promisify } from 'util';
import { TestFailure } from './testfailure';
import * as parsing from './parsing';

const asyncExec = promisify(exec);
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

async function run() {
  try {
    const testResultPath = core.getInput('test_result_path');
    const outputFilePath = `${GITHUB_WORKSPACE}/${testResultPath}`;

    if (!fs.existsSync(outputFilePath)) {
      return;
    }

    await asyncExec(`cat ${outputFilePath} | xq '[.testsuites.testsuite | if type == "array" then .[] else . end | .testcase | if type == "array" then .[] else . end | select(.failure != null) | { classname: ."@classname", name: ."@name", failure: .failure."@message" }]' > ${GITHUB_WORKSPACE}/result.json`);

    const testResult = await fs.promises.readFile(`${GITHUB_WORKSPACE}/result.json`);
    const parsedTestResult: TestFailure[] = JSON.parse(testResult.toString());

    const annotations = parseOutput(parsedTestResult);

    annotations.forEach(function (annotation) {
      console.log(`::error file=${annotation.path},line=${annotation.start_line}::${annotation.message}`);
    });
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run()