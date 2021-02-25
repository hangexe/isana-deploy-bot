var express = require("express");
var path = require("path");
var logger = require("morgan");
var bodyParser = require("body-parser");
var util = require("util");
var exec = util.promisify(require("child_process").exec);
var { parse } = require("envfile");

var app = express();

app.use(logger("dev"));
app.use(bodyParser.json({ type: "application/json" }));
app.use(bodyParser.urlencoded({ extended: false }));

const GIT_TOKEN = "nguyenxuantien3105:e08afe815abb26a482eb9e58e68fe6f7bea48a1e";
const REPOSITY =
  "https://api.github.com/repos/Lighthouse-Inc/isana-android/branches/master";

// POST - request is sent from slack bot
app.post("/api/deploy-isana-android", async (req, res, next) => {
  const { body } = req;
  const {text } = body;
  console.log({body})
  const curl = `curl -u ${GIT_TOKEN} -H "Accept: application/vnd.github.v3+json" ${REPOSITY}`;
  try {
    const { stdout } = await exec(curl);
    const SHA = JSON.parse(stdout || "")["commit"].sha || "";

    // const newBranchInfo  = await createGitBranch(`test/${Date.now()}`, SHA);
    // console.log({newBranchInfo});

    const { versionCode, versionName } = await getCurrentVersion();
    increaseVersion({ versionCode, versionName });
  } catch (err) {
    console.error(err);
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
const createGitBranch = async (newBranchName = "", sha = "") => {
  if (!newBranchName || !sha) {
    throw "branch name or sha is required";
  }

  try {
    const apiRefs =
      "https://api.github.com/repos/Lighthouse-Inc/isana-android/git/refs";
    const curl = `curl -u ${GIT_TOKEN} -X POST -H "Accept: application/vnd.github.v3+json" ${apiRefs} -d '{"ref":"refs/heads/${newBranchName}","sha":"${sha}"}'`;
    const { stdout } = await exec(curl);
    return JSON.parse(stdout);
  } catch (err) {
    console.error(err);
    throw err;
  }
};

/**
 * @return base64 string of version content
 */
const getCurrentVersion = async () => {
  let version;
  try {
    const apiRefs =
      "https://api.github.com/repos/Lighthouse-Inc/isana-android/contents/versionApp.properties?ref=master";
    const curl = `curl -u ${GIT_TOKEN} -H "Accept: application/vnd.github.v3+json" ${apiRefs}`;
    const { stdout } = await exec(curl);
    const { content } = JSON.parse(stdout);
    const data = new Buffer.from(content, "base64").toString("ascii");
    version = parse(data);
  } catch (err) {
    console.error(err);
    throw err;
  }
  return version;
};

const increaseVersion = ({
  versionCode,
  versionName,
  versioning = "patch",
}) => {
  let [major, minor, patch ] = versionName.split(".");
  console.log({ patch, minor, major });
  switch (versioning) {
    case "patch":
      patch = +patch+1;
      break;
    case "minor":
      minor = +minor+1;
      patch = 0;
      break;
    case "major":
      major = +major+1;
      minor = 0;
      patch = 0;
      break;
    default:
      patch = +patch++;
      break;
  }
  versionName = `${major}.${minor}.${patch}`
  console.log({versionName})
  // console.log({ versionCode, versionName, versioning });
};

module.exports = app;
