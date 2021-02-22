var express = require("express");
var path = require("path");
var logger = require("morgan");
var bodyParser = require("body-parser");
var util = require("util");
var exec = util.promisify(require("child_process").exec);

var app = express();

app.use(logger("dev"));
app.use(bodyParser.json({ type: "application/json" }));
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res, next) => {
  res.end(
    `<h1 style="margin: 200px auto">Hello, welcome to Slackbot of Isana team</h1>`
  );
});

const GIT_ACCOUNT = 'nguyenxuantien3105:e08afe815abb26a482eb9e58e68fe6f7bea48a1e'
const REPOSITY = 'https://api.github.com/repos/Lighthouse-Inc/isana-android/branches/master'

// POST - request is sent from slack bot
app.post("/api/deploy-isana-android", async (req, res, next) => {
  const { body } = req;
  const curl = `curl -u ${GIT_ACCOUNT} -H "Accept: application/vnd.github.v3+json" ${REPOSITY}`
  try {
    const { stdout } = await exec(curl);
    const SHA  = JSON.parse(stdout || '')['commit'].sha || "";

    const newBranchInfo  = await createGitBranch(`test/${Date.now()}`, SHA);
    console.log({newBranchInfo});

  } catch (err) {
    console.error(err)
  }

  res.json({
    message: "success",
    body,
  });
});


/**
 * 
 * @param {*} newBranchName new branch's name, example test/ABC
 * @param {*} sha 
 * @return object contains info of created branch
 */
const createGitBranch = async (newBranchName = '', sha = '') => {
  if (!newBranchName || !sha ) {
    throw 'branch name or sha is required'
  }

  try {
    const apiRefs = 'https://api.github.com/repos/Lighthouse-Inc/isana-android/git/refs'
    const curl = `curl -u ${GIT_ACCOUNT} -X POST -H "Accept: application/vnd.github.v3+json" ${apiRefs} -d '{"ref":"refs/heads/${newBranchName}","sha":"${sha}"}'`
    const {stdout} = await exec(curl);

    return JSON.parse(stdout);
  } catch(err) {
    console.error(err)
    throw err;
  }
}

module.exports = app;
