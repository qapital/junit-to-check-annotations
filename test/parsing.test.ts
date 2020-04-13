import * as parsing from '../src/parsing';
import { TestFailure } from '../src/testfailure';

const aTestFailure: TestFailure = {
    classname: "SomeClass",
    name: "Some name",
    failure: "XCTAssertEqual failed: (\"1\") is not equal to (\"2\") (/Users/jenkins/iphone-actions-runner/_work/ios-annotations-test-build/ios-annotations-test-build/AnnotationsTestTests/AnnotationsTestTests.swift#CharacterRangeLen=0&EndingLineNumber=22&StartingLineNumber=62)"
};

test('parsing path', () => {
    expect(parsing.parsePath("/Users/jenkins/iphone-actions-runner/_work/ios-annotations-test-build/ios-annotations-test-build", aTestFailure))
        .toEqual("AnnotationsTestTests/AnnotationsTestTests.swift");
});

test('parsing message', () => {
    expect(parsing.parseMessage(aTestFailure))
        .toEqual("XCTAssertEqual failed: (\"1\") is not equal to (\"2\") ");
});

test('parsing end line', () => {
    expect(parsing.parseEndLine(aTestFailure))
        .toEqual(22);
});

test('parsing start line', () => {
    expect(parsing.parseStartLine(aTestFailure))
        .toEqual(62);
});