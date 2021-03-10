var express = require("express");
var logger = require("morgan");
var bodyParser = require("body-parser");
var { parse } = require("envfile");
var fetch = require("node-fetch");
var app = express();

app.use(logger("dev"));
app.use(bodyParser.json({ type: "application/json" }));
app.use(bodyParser.urlencoded({ extended: false }));

const {
  GIT_TOKEN, // TODO: chuyển tới file .env
  ANDROID_RELEASE,
  ANDROID_RELEASE_PATCH,
  ANDROID_RELEASE_MAJOR,
  ANDROID_RELEASE_MINOR,
  APP_VERSION_FILE_URL,
  SLACK_MESSAGE_API // TODO: chuyển tới file .env
} = require("./constant");

const COMMON_HTTP_HEADER = {
  Accept: "application/vnd.github.v3+json",
  "Content-Type": "application/json",
  Authorization: `token ${GIT_TOKEN}`
};

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
    const creationCommitSHA = await createBranch(
      `${folder}/${branch}`,
      updateSHA
    );

    // STEP 5: crate tag
    await createReleaseTag(branch, creationCommitSHA);

    await dispatchMessageToSlack(
      `release success! versionCode: \`${currentVersion.versionCode}\` -> \`${versionCode}\`; versionName: \`${currentVersion.versionName}\` -> \`${versionName}\`.`
      // `release success!`
    );
    return res.status(200).json({ message: "OK" });
  } catch (err) {
    console.log("ERROR_API_PROGRESS:", err.message || "main threat error");
    await dispatchMessageToSlack(err.message || "Error");
    return res.status(500).json({ message: err.message });
  }
});

/**
 * convert base64 string to data string
 * @param {*} base64str
 */
const decodeBase64 = (base64str) => {
  const data = new Buffer.from(base64str, "base64").toString("ascii");
  return parse(data);
};

/**
 * convert data string to base64 string
 * @param {*} data
 */
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
  try {
    let data = {
      message: `SLACK BOT increased versionCode to ${versionCode}, versionName to ${versionName}`,
      content: `${base64Content}`,
      sha: `${currentSha}`,
      branch: `master`
    };
    let response = await fetch(`${APP_VERSION_FILE_URL}`, {
      method: "PUT",
      headers: { ...COMMON_HTTP_HEADER },
      body: JSON.stringify(data)
    });

    let resData = await response.json();
    return resData.commit.sha;
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
  let body = {
    ref: `refs/tags/${tag}`,
    sha: `${sha}`
  };

  try {
    const response = await fetch(`${APP_VERSION_FILE_URL}?refs=master`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github.v3+json"
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    console.log("=============CREATE_RELEASE_TAG=============");
    console.log({ data });
  } catch (err) {
    console.log("ERROR_CREATE_RELEASE_TAG:", err);
    throw new Error("Create tag failure");
  }
};

/**
 *
 * @param {*} newBranchName new branch's name, example test/ABC
 * @param {*} sha
 * @return object contains info of created branch
 * @return {*} a new sha commit after creating new branch
 */
const createBranch = async (newBranchName, sha) => {
  if (!newBranchName || !sha) {
    throw new Error("branch name or sha is required");
  }

  try {
    const apiRefs =
      "https://api.github.com/repos/Lighthouse-Inc/isana-android/git/refs";

    let body = {
      ref: `refs/heads/${newBranchName}`,
      sha: `${sha}`
    };
    let response = await fetch(`${apiRefs}`, {
      method: "POST",
      headers: {
        ...COMMON_HTTP_HEADER
      },
      body: JSON.stringify(body)
    });
    data = await response.json();
    if (!data?.object?.sha) {
      throw new Error("Creating branch API was failed");
    }
    return data.object.sha;
  } catch (err) {
    console.error("ERROR_CREATE_BRANCH:", err);
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
    let response = await fetch(
      `https://api.github.com/repos/Lighthouse-Inc/isana-android/contents/versionApp.properties?ref=master`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${GIT_TOKEN}`
        }
      }
    );

    const { content, sha } = await response.json();
    currentVersion = decodeBase64(content);
    return { currentVersion, sha };
  } catch (err) {
    console.error("ERROR_GET_CURRENT_VERSION:", err.message);
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
      throw new Error("Please send a valid command");
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
  console.log("DISPATCH_MESSAGE:", message);
  try {
    let body = {
      text: `${message}`
    };
    await fetch(`${SLACK_MESSAGE_API}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
  } catch (err) {
    console.log({ SLACK_MESSAGE_SENDING_ERROR: err.message });
  }

  return true;
};

module.exports = app;
