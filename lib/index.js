"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertTestSuitesToTestFailures = convertTestSuitesToTestFailures;
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const util_1 = require("util");
const testfailure_1 = require("./testfailure");
const fast_xml_parser_1 = require("fast-xml-parser");
const parsing = __importStar(require("./parsing"));
const readdir = (0, util_1.promisify)(fs.readdir);
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
        const parser = new fast_xml_parser_1.XMLParser({
            attributeNamePrefix: "____",
            ignoreAttributes: false,
            isArray: (_name, _jpath, isLeafNode, isAttribute) => !isAttribute,
        });
        let testResult;
        if (oneSuitePerBuffer) {
            const result = parser.parse(buffer.toString());
            testResult = [result];
        }
        else {
            const result = parser.parse(buffer.toString());
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
        return new testfailure_1.TestFailure(c.____classname, c.____name, (_c = (_b = (_a = c.failure) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.____message) !== null && _c !== void 0 ? _c : "");
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
            core.setFailed(error instanceof Error ? error.message : String(error));
        }
    });
}
run();
