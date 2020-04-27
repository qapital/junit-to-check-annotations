import * as core from "@actions/core";
import { Octokit } from "@octokit/rest";
import { exec } from "child_process";
import * as fs from "fs";
import { promisify } from "util";
import { TestFailure } from "./testfailure";
import * as xmlParser from "fast-xml-parser";
import * as parsing from "./parsing";
import { TestResult } from "./testresult";

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
      annotation_level: <const>"failure",
      message: `${testFailure.classname}.${
        testFailure.name
      }: ${parsing.parseMessage(testFailure)}`,
    };
  });
}

export function flatMap<T, U>(
  array: T[],
  callbackfn: (value: T, index: number, array: T[]) => U[]
): U[] {
  return Array.prototype.concat(...array.map(callbackfn));
}

async function run() {
  try {
    const testResultPath = core.getInput("test_result_path");
    const outputFilePath = `${GITHUB_WORKSPACE}/${testResultPath}`;

    if (!fs.existsSync(outputFilePath)) {
      return;
    }

    const file = await fs.promises.readFile(outputFilePath);
    const testResult: TestResult = xmlParser.parse(file.toString(), {
      attributeNamePrefix: "____",
      ignoreAttributes: false,
      arrayMode: "strict",
    });

    const cases = flatMap(testResult.testsuites, (suite) =>
      flatMap(suite.testsuite, (suite) => suite.testcase)
    );

    const parsedTestResult: TestFailure[] = cases
      .filter((c) => c.failure)
      .map((c) => {
        c.failure?.[0].____message;
        return new TestFailure(
          c.____classname,
          c.____name,
          c.failure?.[0].____message ?? ""
        );
      });

    const annotations = parseOutput(parsedTestResult);

    annotations.forEach(function (annotation) {
      console.log(
        `::error file=${annotation.path},line=${annotation.start_line}::${annotation.message}`
      );
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
