jest.mock("@actions/core", () => ({
  getInput: jest.fn(() => "missing-test-results"),
  setFailed: jest.fn(),
}));

import { convertTestSuitesToTestFailures } from "../src/index";

test("reads failure messages emitted with strict XML array parsing", () => {
  const failures = convertTestSuitesToTestFailures([
    {
      ____name: "wrapper",
      testsuite: [
        {
          ____name: "suite",
          testcase: [
            {
              ____classname: "ExampleTests",
              ____name: "fails",
              failure: [{ ____message: "expected true" }],
            },
          ],
        },
      ],
    },
  ]);

  expect(failures).toEqual([
    {
      classname: "ExampleTests",
      name: "fails",
      failure: "expected true",
    },
  ]);
});
