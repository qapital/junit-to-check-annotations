export interface TestResult {
  testsuites: Array<TestSuiteWrapper>;
}

export interface TestSuiteWrapper {
  ____name: string;
  testsuite: Array<TestSuite>;
}

export interface TestSuite {
  ____name: string;
  testcase: Array<TestCase>;
}

export interface TestCase {
  ____classname: string;
  ____name: string;
  failure?: Failure;
}

export interface Failure {
  ____message: string;
}
