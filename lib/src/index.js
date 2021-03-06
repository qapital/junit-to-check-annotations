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
const github = __importStar(require("@actions/github"));
const rest_1 = require("@octokit/rest");
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const util_1 = require("util");
const parsing = __importStar(require("./parsing"));
const asyncExec = util_1.promisify(child_process_1.exec);
const AUTH_TOKEN = core.getInput('token');
const { GITHUB_WORKSPACE } = process.env;
// Regex match each line in the output and turn them into annotations
function parseOutput(testFailures) {
    return testFailures.map(function (testFailure) {
        return {
            path: parsing.path(GITHUB_WORKSPACE !== null && GITHUB_WORKSPACE !== void 0 ? GITHUB_WORKSPACE : "", testFailure),
            start_line: parsing.start_line(testFailure),
            end_line: parsing.end_line(testFailure),
            start_column: 1,
            end_column: 1,
            annotation_level: 'failure',
            message: `${testFailure.classname}.${testFailure.name}: ${parsing.message(testFailure)}`,
        };
    });
}
function createCheck(check_name, title, annotations) {
    return __awaiter(this, void 0, void 0, function* () {
        const gh = new rest_1.Octokit({ auth: AUTH_TOKEN });
        const req = Object.assign(Object.assign({}, github.context.repo), { ref: core.getInput('commit_sha') });
        const res = yield gh.checks.listForRef(req);
        res.data.check_runs.forEach(check_run => console.log(check_run));
        const check_run_id = res.data.check_runs.filter(check => check.name === check_name)[0].id;
        const update_req = Object.assign(Object.assign({}, github.context.repo), { check_run_id, output: {
                title,
                summary: `${annotations.length} errors(s) found`,
                annotations
            } });
        yield gh.checks.update(update_req);
    });
}
// most @actions toolkit packages have async methods
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const testResultPath = core.getInput('test_result_path');
            yield asyncExec(`cat ${GITHUB_WORKSPACE}/${testResultPath} | xq '[.testsuites.testsuite.testcase | if type == "array" then .[] else . end | select(.failure != null) | { classname: ."@classname", name: ."@name", failure: .failure."@message" }]' > ${GITHUB_WORKSPACE}/result.json`);
            const testResult = yield fs.promises.readFile(`${GITHUB_WORKSPACE}/result.json`);
            const parsedTestResult = JSON.parse(testResult.toString());
            const annotations = parseOutput(parsedTestResult);
            if (annotations.length > 0) {
                console.log("===============================================================");
                console.log("| FAILURES DETECTED                                           |");
                console.log("|    You don't need to read this log output.                  |");
                console.log("|    Check the 'Files changed' tab for in-line annotations!   |");
                console.log("===============================================================");
                const checkName = core.getInput('check_name');
                yield createCheck(checkName, 'failures detected', annotations);
                core.setFailed(`${annotations.length} errors(s) found`);
            }
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
