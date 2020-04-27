// {
//   "classname": "AmountFormatterTests",
//   "name": "test_shouldFormatToADollarString()",
//   "failure": "expected to equal <validWithChanges(\"$4,0100\")>, got <validWithChanges(\"$4,010\")>  (/Users/vrutberg/code/qapital-iphone/Modules/ViewSupport/Tests/Tests/TextFieldFormatters/AmountFormatterTests.swift#CharacterRangeLen=0&EndingLineNumber=31&StartingLineNumber=31)"
// }
export class TestFailure {
  classname: string;
  name: string;
  failure: string;
  constructor(classname: string, name: string, failure: string) {
    this.classname = classname;
    this.name = name;
    this.failure = failure;
  }
}
