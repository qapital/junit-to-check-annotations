"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function path(workspacePath, testFailure) {
    let path = new RegExp(".+\\(" + workspacePath + "\\/([\\/\\w\\s-.]+).+\\)$");
    let matches = path.exec(testFailure.failure);
    return matches == null ? testFailure.failure : matches[1];
}
exports.path = path;
function message(testFailure) {
    let message = /(.+)\(.+\)$/;
    let matches = message.exec(testFailure.failure);
    return matches == null ? testFailure.failure : matches[1];
}
exports.message = message;
function start_line(testFailure) {
    let startingLineNumber = /StartingLineNumber=(\d+)/;
    let matches = startingLineNumber.exec(testFailure.failure);
    return matches == null ? 1 : parseInt(matches[1]);
}
exports.start_line = start_line;
function end_line(testFailure) {
    let endingLineNumber = /EndingLineNumber=(\d+)/;
    let matches = endingLineNumber.exec(testFailure.failure);
    return matches == null ? 1 : parseInt(matches[1]);
}
exports.end_line = end_line;
