import { TestFailure } from './testfailure';

export function parsePath(workspacePath: string, testFailure: TestFailure): string {
    let path = new RegExp(".+\\(" + workspacePath + "\\/([\\/\\w\\s-.]+).+\\)$");
    let matches = path.exec(testFailure.failure);
    return matches == null ? testFailure.failure : matches[1];
}

export function parseMessage(testFailure: TestFailure): string {
    let message = /(.+)\(.+\)$/;
    let matches = message.exec(testFailure.failure);
    return matches == null ? testFailure.failure : matches[1];
}

export function parseStartLine(testFailure: TestFailure): number {
    let startingLineNumber = /StartingLineNumber=(\d+)/;
    let matches = startingLineNumber.exec(testFailure.failure);
    return matches == null ? 1 : parseInt(matches[1]);
}

export function parseEndLine(testFailure: TestFailure): number {
    let endingLineNumber = /EndingLineNumber=(\d+)/;
    let matches = endingLineNumber.exec(testFailure.failure);
    return matches == null ? 1 : parseInt(matches[1]);
}
