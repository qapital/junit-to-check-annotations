import * as core from "@actions/core";
import { Octokit } from "@octokit/rest";
import { exec } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { TestFailure } from "./testfailure";
import * as xmlParser from "fast-xml-parser";
import * as parsing from "./parsing";
import { TestResult, TestSuiteWrapper } from "./testresult";

const readdir = promisify(fs.readdir);
const asyncExec = promisify(exec);
const { GITHUB_WORKSPACE } = process.env;

type Annotation = Octokit.ChecksUpdateParamsOutputAnnotations;

// Regex match each line in the output and turn them into annotations
function convertToAnnotations(testFailures: TestFailure[]): Annotation[] {
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

function flatMap<T, U>(
  array: T[],
  callbackfn: (value: T, index: number, array: T[]) => U[]
): U[] {
  return Array.prototype.concat(...array.map(callbackfn));
}

function flatten<T>(array: T[][]): T[] {
  return flatMap(array, (array) => array);
}

async function convertBufferToTestFailures(
  filename: string,
  oneSuitePerBuffer: boolean
): Promise<TestFailure[]> {
  const buffer = await fs.promises.readFile(filename);

  const parseOptions: Partial<xmlParser.X2jOptions> = {
    attributeNamePrefix: "____",
    ignoreAttributes: false,
    arrayMode: "strict",
  };

  let testResult: Array<TestSuiteWrapper>;
  if (oneSuitePerBuffer) {
    const result: TestSuiteWrapper = xmlParser.parse(
      buffer.toString(),
      parseOptions
    );
    testResult = [result];
  } else {
    const result: TestResult = xmlParser.parse(buffer.toString(), parseOptions);
    testResult = result.testsuites;
  }

  return convertTestSuitesToTestFailures(testResult);
}

function convertTestSuitesToTestFailures(testsuites: Array<TestSuiteWrapper>) {
  const cases = flatMap(testsuites, (suite) =>
    flatMap(suite.testsuite, (suite) => suite.testcase)
  );

  return cases
    .filter((c) => c.failure)
    .map((c) => {
      c.failure?.[0].____message;
      return new TestFailure(
        c.____classname,
        c.____name,
        c.failure?.[0].____message ?? ""
      );
    });
}

async function parseFileNames(outputFilePath: string) {
  const directory = fs.lstatSync(outputFilePath).isDirectory();
  if (directory) {
    const dir = await readdir(outputFilePath);
    return dir
      .filter((filename) => path.extname(filename) === ".xml")
      .map((filename) => `${outputFilePath}/${filename}`);
  } else {
    return [outputFilePath];
  }
}

async function run() {
  try {
    const oneSuitePerFile = core.getInput("one_suite_per_file") === "true";

    const testResultPath = core.getInput("test_result_path");
    const outputFilePath = `${GITHUB_WORKSPACE}/${testResultPath}`;

    if (!fs.existsSync(outputFilePath)) {
      return;
    }

    const files = await parseFileNames(outputFilePath);

    const testResultPromises = files.map((file) =>
      convertBufferToTestFailures(file, oneSuitePerFile)
    );

    const testResults = flatten(await Promise.all(testResultPromises));
    const annotations = convertToAnnotations(testResults);

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
