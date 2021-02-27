var express = require("express");
var logger = require("morgan");
var bodyParser = require("body-parser");
var util = require("util");
var exec = util.promisify(require("child_process").exec);
var { parse } = require("envfile");

var app = express();

app.use(logger("dev"));
app.use(bodyParser.json({ type: "application/json" }));
app.use(bodyParser.urlencoded({ extended: false }));

const GIT_TOKEN = "hangexe:50a7f6ef21cc261ffd28a2ac0b78313b8c56be3d";
const REPOSITY =
  "https://api.github.com/repos/Lighthouse-Inc/isana-android/branches/master";

const ANDROID_RELEASE = "android release";
const ANDROID_RELEASE_PATCH = "android release patch";
const ANDROID_RELEASE_MAJOR = "android release major";
const ANDROID_RELEASE_MINOR = "android release minor";

// POST - request is sent from slack bot
app.post("/api/deploy-isana-android", async (req, res, next) => {
  const { body } = req;
  console.log({ body });
  // Check for 1st time verify the API endpoint only
  const challenge = body.challenge;
  if (challenge) {
    return res.status(200).json({ challenge });
  }

  let text = body?.event?.text || "";
  txtPattern = /^(\<\@)([A-Z0-9]{11})(\>)/;
  text = text.replace(txtPattern, "").trim();
  versioning = text.toString().split(" ");
  versioning = versioning[versioning.length - 1];

  try {
    // STEP 1: get currcent version and up verison, get new SHA
    const { currentVersion, sha } = await getCurrentVersion();

    // STEP 2: increase current version
    let { versionCode, versionName } = increaseVersion(
      text,
      currentVersion.versionCode,
      currentVersion.versionName
    );

    // STEP 3: update version content of version file in remote reposity
    let newVersionStr = `versionCode=${versionCode}\nversionName=${versionName}`;
    let newVersionBase64 = encodeBase64(newVersionStr);
    let updateSHA = await updateVersionFileContent(
      versionCode,
      versionName,
      newVersionBase64,
      sha
    );

    // STEP 4: create new branch
    // TODO: change folder value on prod
    const folder = "test";
    const branch = `v${versionName}`;
    const creationRes = await createBranch(`${folder}/${branch}`, updateSHA);
    const branchCreationSHA = creationRes?.object?.sha;

    // STEP 5: crate tag
    await createReleaseTag(branch, branchCreationSHA);

    await dispatchMessageToSlack("release success");
    return res.status(200).json({ message: "OK" });
  } catch (err) {
    await dispatchMessageToSlack(err.message || "Error");
    return res.status(400).json({ message: "FAILED" });
  }
});

const decodeBase64 = (base64str) => {
  const data = new Buffer.from(base64str, "base64").toString("ascii");
  return parse(data);
};

const encodeBase64 = (data) => {
  return new Buffer.from(data.toString()).toString("base64");
};

/**
 *
 * @param {*} versionCode
 * @param {*} versionName
 * @param {*} base64Content
 * @param {*} currentSha
 */
const updateVersionFileContent = async (
  versionCode,
  versionName,
  base64Content,
  currentSha
) => {
  const fileUrl =
    "https://api.github.com/repos/Lighthouse-Inc/isana-android/contents/versionApp.properties";
  const curl = `curl -u ${GIT_TOKEN} -X PUT -H "Accept: application/vnd.github.v3+json" ${fileUrl} -d '{"message":"SLACK BOT increased versionCode to ${versionCode}, versionName to ${versionName}","content":"${base64Content}","sha":"${currentSha}","branch":"master"}'`;
  try {
    const { stdout } = await exec(curl);
    const { sha } = JSON.parse(stdout)["commit"];
    return sha;
  } catch (err) {
    console.log(err);
    throw new Error("Could not update version file");
  }
};

/**
 *
 * @param {*} tag
 * @param {*} sha
 */
const createReleaseTag = async (tag, sha) => {
  const apiRefs =
    "https://api.github.com/repos/Lighthouse-Inc/isana-android/git/refs";
  const curl = `curl -u ${GIT_TOKEN} -X POST -H "Accept: application/vnd.github.v3+json" ${apiRefs} -d '{"ref":"refs/tags/${tag}","sha":"${sha}"}'`;

  try {
    const { stdout } = await exec(curl);
  } catch (err) {
    console.log(err);
    throw new Error("create tag failure");
  }
};

/**
 *
 * @param {*} newBranchName new branch's name, example test/ABC
 * @param {*} sha
 * @return object contains info of created branch
 * @return {*} sha
 */
const createBranch = async (newBranchName, sha) => {
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
 * @return current SHA
 */
const getCurrentVersion = async () => {
  let currentVersion;
  try {
    const apiRefs =
      "https://api.github.com/repos/Lighthouse-Inc/isana-android/contents/versionApp.properties?ref=master";
    const curl = `curl -u ${GIT_TOKEN} -H "Accept: application/vnd.github.v3+json" ${apiRefs}`;
    const { stdout } = await exec(curl);
    const { content, sha } = JSON.parse(stdout);

    currentVersion = decodeBase64(content);
    return { currentVersion, sha };
  } catch (err) {
    console.error(err);
    throw new Error(
      `Couldn't get version file from reposity or github token was destroyed`
    );
  }
};

/**
 *
 * @param {*} versionCode
 * @param {*} versionName
 * @param {*} versioning
 * @return { versionCode, versionName }
 */
const increaseVersion = (command, versionCode, versionName) => {
  let [major, minor, patch] = versionName.split(".");
  switch (command) {
    case ANDROID_RELEASE:
      patch = +patch + 1;
      break;
    case ANDROID_RELEASE_PATCH:
      patch = +patch + 1;
      break;
    case ANDROID_RELEASE_MINOR:
      minor = +minor + 1;
      patch = 0;
      break;
    case ANDROID_RELEASE_MAJOR:
      major = +major + 1;
      minor = 0;
      patch = 0;
      break;
    default:
      throw new Error("release command was not valid");
  }
  versionName = `${major}.${minor}.${patch}`;
  versionCode = +versionCode + 1;
  return { versionCode, versionName };
};

/**
 *
 * @param {*} message : message to dispatch
 */
const dispatchMessageToSlack = async (message) => {
  const slackHookWithToken = `https://hooks.slack.com/services/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`;
  const curl = `curl -X POST -H 'Content-type: application/json' --data '{"text":"${message}"}' ${slackHookWithToken}`;

  try {
    await exec(curl);
  } catch (err) {
    console.log(err);
    throw new Error("dispatch message failure");
  }
  return true;
};

module.exports = app;
