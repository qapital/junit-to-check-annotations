"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const util_1 = require("util");
const testfailure_1 = require("./testfailure");
const xmlParser = __importStar(require("fast-xml-parser"));
const parsing = __importStar(require("./parsing"));
const readdir = util_1.promisify(fs.readdir);
const asyncExec = util_1.promisify(child_process_1.exec);
const { GITHUB_WORKSPACE } = process.env;
// Regex match each line in the output and turn them into annotations
function convertToAnnotations(testFailures) {
    return testFailures.map(function (testFailure) {
        return {
            path: parsing.parsePath(GITHUB_WORKSPACE !== null && GITHUB_WORKSPACE !== void 0 ? GITHUB_WORKSPACE : "", testFailure),
            start_line: parsing.parseStartLine(testFailure),
            end_line: parsing.parseEndLine(testFailure),
            start_column: 1,
            end_column: 1,
            annotation_level: "failure",
            message: `${testFailure.classname}.${testFailure.name}: ${parsing.parseMessage(testFailure)}`,
        };
    });
}
function flatMap(array, callbackfn) {
    return Array.prototype.concat(...array.map(callbackfn));
}
function flatten(array) {
    return flatMap(array, (array) => array);
}
function convertBufferToTestFailures(filename, oneSuitePerBuffer) {
    return __awaiter(this, void 0, void 0, function* () {
        const buffer = yield fs.promises.readFile(filename);
        const parseOptions = {
            attributeNamePrefix: "____",
            ignoreAttributes: false,
            arrayMode: "strict",
        };
        let testResult;
        if (oneSuitePerBuffer) {
            const result = xmlParser.parse(buffer.toString(), parseOptions);
            testResult = [result];
        }
        else {
            const result = xmlParser.parse(buffer.toString(), parseOptions);
            testResult = result.testsuites;
        }
        return convertTestSuitesToTestFailures(testResult);
    });
}
function convertTestSuitesToTestFailures(testsuites) {
    const cases = flatMap(testsuites, (suite) => flatMap(suite.testsuite, (suite) => suite.testcase));
    return cases
        .filter((c) => c.failure)
        .map((c) => {
        var _a, _b, _c;
        (_a = c.failure) === null || _a === void 0 ? void 0 : _a[0].____message;
        return new testfailure_1.TestFailure(c.____classname, c.____name, (_c = (_b = c.failure) === null || _b === void 0 ? void 0 : _b[0].____message) !== null && _c !== void 0 ? _c : "");
    });
}
function parseFileNames(outputFilePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const directory = fs.lstatSync(outputFilePath).isDirectory();
        if (directory) {
            const dir = yield readdir(outputFilePath);
            return dir
                .filter((filename) => path.extname(filename) === ".xml")
                .map((filename) => `${outputFilePath}/${filename}`);
        }
        else {
            return [outputFilePath];
        }
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const oneSuitePerFile = core.getInput("one_suite_per_file") === "true";
            const testResultPath = core.getInput("test_result_path");
            const outputFilePath = `${GITHUB_WORKSPACE}/${testResultPath}`;
            if (!fs.existsSync(outputFilePath)) {
                return;
            }
            const files = yield parseFileNames(outputFilePath);
            const testResultPromises = files.map((file) => convertBufferToTestFailures(file, oneSuitePerFile));
            const testResults = flatten(yield Promise.all(testResultPromises));
            const annotations = convertToAnnotations(testResults);
            annotations.forEach(function (annotation) {
                console.log(`::error file=${annotation.path},line=${annotation.start_line}::${annotation.message}`);
            });
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
