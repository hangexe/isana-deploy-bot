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

const {
  GIT_TOKEN,
  ANDROID_RELEASE,
  ANDROID_RELEASE_PATCH,
  ANDROID_RELEASE_MAJOR,
  ANDROID_RELEASE_MINOR,
  APP_VERSION_FILE_URL,
  SLACK_WEBHOOK_TOKEN,
} = require("./env");

// POST - request is sent from slack bot
app.post("/api/deploy-isana-android", async (req, res, next) => {
  const { body } = req;
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
    console.log({ currentVersion, sha });

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

    await dispatchMessageToSlack(
      `release success! versionCode from \`${currentVersion.versionCode}\` to \`${versionCode}\`, versionName from \`${currentVersion.versionName}\` to \`${versionName}\`.`
      // `release success!`
    );
    return res.status(200).json({ message: "OK" });
  } catch (err) {
    console.log("ERROR nè", err.message || "main threat error");
    await dispatchMessageToSlack(err.message || "Error");
    return res.status(500).json({ message: "FAILED" });
  }
});

const decodeBase64 = (base64str) => {
  console.log("DECODE NE", base64str);
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
  const curl = `curl -u ${GIT_TOKEN} -X PUT -H "Accept: application/vnd.github.v3+json" ${APP_VERSION_FILE_URL} -d '{"message":"SLACK BOT increased versionCode to ${versionCode}, versionName to ${versionName}","content":"${base64Content}","sha":"${currentSha}","branch":"master"}'`;
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
  const curl = `curl -u ${GIT_TOKEN} -X POST -H "Accept: application/vnd.github.v3+json" ${APP_VERSION_FILE_URL} -d '{"ref":"refs/tags/${tag}","sha":"${sha}"}'`;

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
    const { stdout, stderr } = await exec(curl);
    const { content, sha } = JSON.parse(stdout);
    if (!!stderr) {
      throw new Error("Error");
    }
    currentVersion = decodeBase64(content);
    return { currentVersion, sha };
  } catch (err) {
    console.error("getCurrentVersion", err);
    throw new Error(
      `Could not get version file from reposity due to github token was destroyed or other reason`
    );
  }
};

/**
 * increase the version of current version
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
 * send a message to slack chanel
 * @param {*} message : message to dispatch
 */
const dispatchMessageToSlack = async (message = "unknown error") => {
  console.log({ message });
  const curl = `curl -X POST -H 'Content-type: application/json' --data '{"text":"${message}"}' ${SLACK_WEBHOOK_TOKEN}`;

  const { stderr } = await exec(curl);
  console.log({ stderr });
  return true;
};

module.exports = app;
