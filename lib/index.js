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
const octokit = __importStar(require("@octokit/rest"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const { GITHUB_TOKEN, GITHUB_WORKSPACE } = process.env;
// Regex match each line in the output and turn them into annotations
function parseOutput(testFailures) {
    let annotations = [];
    for (let i = 0; i < testFailures.length; i++) {
        let error = testFailures[i];
        const annotation = {
            path: "./",
            start_line: 1,
            end_line: 1,
            start_column: 1,
            end_column: 1,
            annotation_level: 'failure',
            message: `${error.classname}.${error.name}: ${error.failure}`,
        };
        annotations.push(annotation);
    }
    return annotations;
}
function createCheck(check_name, title, annotations) {
    return __awaiter(this, void 0, void 0, function* () {
        const gh = new octokit.Octokit({ auth: String(GITHUB_TOKEN) });
        const req = Object.assign(Object.assign({}, github.context.repo), { ref: core.getInput('commit_sha') });
        console.log(req);
        const res = yield gh.checks.listForRef(req);
        console.log(res);
        const check_run_id = res.data.check_runs.filter(check => check.name === check_name)[0].id;
        const update_req = Object.assign(Object.assign({}, github.context.repo), { check_run_id, output: {
                title,
                summary: `${annotations.length} errors(s) found`,
                annotations
            } });
        console.log(update_req);
        yield gh.checks.update(update_req);
    });
}
// most @actions toolkit packages have async methods
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const testResultPath = core.getInput('test_result_path');
            console.log("Reading test result from: ${GITHUB_WORKSPACE}/${testResultPath}");
            child_process_1.exec(`cat ${GITHUB_WORKSPACE}/${testResultPath} | xq '[.testsuites.testsuite.testcase[] | select(.failure != null)]' > ${GITHUB_WORKSPACE}/result.json`);
            console.log("Created result.json file");
            const testResult = yield fs.promises.readFile(`${GITHUB_WORKSPACE}/result.json`);
            const parsedTestResult = JSON.parse(testResult.toString());
            console.log(`Parsed test result: ${parsedTestResult}`);
            const annotations = parseOutput(parsedTestResult);
            if (annotations.length > 0) {
                console.log("===============================================================");
                console.log("| FAILURES DETECTED                                           |");
                console.log("|    You don't need to read this log output.                  |");
                console.log("|    Check the 'Files changed' tab for in-line annotations!   |");
                console.log("===============================================================");
                console.log(annotations);
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
