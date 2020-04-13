"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function parsePath(workspacePath, testFailure) {
    let path = new RegExp(".+\\(" + workspacePath + "\\/([\\/\\w\\s-.]+).+\\)$");
    let matches = path.exec(testFailure.failure);
    return matches == null ? testFailure.failure : matches[1];
}
exports.parsePath = parsePath;
function parseMessage(testFailure) {
    let message = /(.+)\(.+\)$/;
    let matches = message.exec(testFailure.failure);
    return matches == null ? testFailure.failure : matches[1];
}
exports.parseMessage = parseMessage;
function parseStartLine(testFailure) {
    let startingLineNumber = /StartingLineNumber=(\d+)/;
    let matches = startingLineNumber.exec(testFailure.failure);
    return matches == null ? 1 : parseInt(matches[1]);
}
exports.parseStartLine = parseStartLine;
function parseEndLine(testFailure) {
    let endingLineNumber = /EndingLineNumber=(\d+)/;
    let matches = endingLineNumber.exec(testFailure.failure);
    return matches == null ? 1 : parseInt(matches[1]);
}
exports.parseEndLine = parseEndLine;
