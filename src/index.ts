import * as core from  '@actions/core';
import * as github from '@actions/github';
import * as octokit from '@octokit/rest';
import * as fs from 'fs';

const { GITHUB_TOKEN, GITHUB_WORKSPACE } = process.env;

type Annotation = octokit.Octokit.ChecksUpdateParamsOutputAnnotations;

function getAnnotationLevel(): string {
    let val: string = core.getInput('annotation_level');
    if (!val) {
        return <const>'failure';
    } else {
        return val;
    }
}

// Regex match each line in the output and turn them into annotations
function parseOutput(output: string, regex: RegExp): Annotation[] {
  let errors = output.split('\n');
  let annotations: Annotation[] = [];
  for (let i = 0; i < errors.length; i++) {
    let error = errors[i];
    let match = error.match(regex);
    if (match) {
      const groups = match.groups;
      if (!groups) {
        throw "No named capture groups in regex match.";
      }
      // Chop `./` off the front so that Github will recognize the file path
      const normalized_path = groups.filename.replace('./', '');
      const line = parseInt(groups.lineNumber);
      const column = parseInt(groups.columnNumber);
      const annotation_level = (getAnnotationLevel() == 'warning') ?
        <const>'warning' :
        <const>'failure';
      const annotation = {
        path: normalized_path,
        start_line: line,
        end_line: line,
        start_column: column,
        end_column: column,
        annotation_level: annotation_level,
        message: `[${groups.errorCode}] ${groups.errorDesc}`,
      };

      annotations.push(annotation);
    }
  }
  return annotations;
}

async function createCheck(check_name: string, title: string, annotations: Annotation[]) {
  const gh = new octokit.Octokit({ auth: String(GITHUB_TOKEN) });
  const req = {
    ...github.context.repo,
    ref: core.getInput('commit_sha')
  }
  console.log(req)
  const res = await gh.checks.listForRef(req);
  console.log(res)

  const check_run_id = res.data.check_runs.filter(check => check.name === check_name)[0].id

  const update_req = {
    ...github.context.repo,
    check_run_id,
    output: {
      title,
      summary: `${annotations.length} errors(s) found`,
      annotations
    }
  }

  console.log(update_req)
  await gh.checks.update(update_req);
}

// most @actions toolkit packages have async methods
async function run() {
  try { 
    const testResultPath = core.getInput('test_result_path');
    console.log("Reading test result from: ${GITHUB_WORKSPACE}/${testResultPath}");
    const testResult = await fs.promises.readFile(`${GITHUB_WORKSPACE}/${testResultPath}`);
    const annotations = parseOutput(testResult.toString(), new RegExp(""));

    if (annotations.length > 0) {
      console.log("===============================================================")
      console.log("| FAILURES DETECTED                                           |")
      console.log("|    You don't need to read this log output.                  |")
      console.log("|    Check the 'Files changed' tab for in-line annotations!   |")
      console.log("===============================================================")

      console.log(annotations);
      const checkName = core.getInput('check_name');
      await createCheck(checkName, 'failures detected', annotations);
      const annotation_level = getAnnotationLevel();
      if (annotation_level != 'warning') {
        core.setFailed(`${annotations.length} errors(s) found`);
      }
    }
  } 
  catch (error) {
    core.setFailed(error.message);
  }
}

run()
