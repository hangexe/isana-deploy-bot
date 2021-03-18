var logger = require("morgan");
var bodyParser = require("body-parser");
var { parse } = require("envfile");

require("dotenv").config();

var express = require("express");
var app = express();

app.use(logger("dev"));
app.use(bodyParser.json({ type: "application/json" }));
app.use(bodyParser.urlencoded({ extended: false }));

const {
  ANDROID_RELEASE_DEFAULT,
  ANDROID_RELEASE_PATCH,
  ANDROID_RELEASE_MINOR,
  ANDROID_RELEASE_MAJOR,
  GIT_RELEASE_PROD_FOLDER,
  GIT_RELEASE_STG_FOLDER
} = process.env;

const PROD = "prod";
const DEV = "dev";
const STG = "stg";

// production release command
const ANDROID_PROD_RELEASE = "android prod release";
const ANDROID_PROD_RELEASE_PATCH = "android prod release patch";
const ANDROID_PROD_RELEASE_MAJOR = "android prod release major";
const ANDROID_PROD_RELEASE_MINOR = "android prod release minor";

// dev release command
const ANDROID_DEV_RELEASE = "android dev release";
const ANDROID_DEV_RELEASE_PATCH = "android dev release patch";
const ANDROID_DEV_RELEASE_MAJOR = "android dev release major";
const ANDROID_DEV_RELEASE_MINOR = "android dev release minor";

// staging release command
const ANDROID_STG_RELEASE = "android stg release";
const ANDROID_STG_RELEASE_PATCH = "android stg release patch";
const ANDROID_STG_RELEASE_MAJOR = "android stg release major";
const ANDROID_STG_RELEASE_MINOR = "android stg release minor";

const {
  getCurrentVersion,
  updateVersionFileContent,
  createBranch,
  createReleaseTag
} = require("./services/git.service");
const { dispatchMessageToSlack } = require("./services/slack.service");

app.get("/", (req, res) => {
  res.send(
    "<h5>こんにちは！</h5><p>POST - /api/deploy-isana-android　ご利用ください </p>"
  );
});

// POST - request is sent from slack bot
app.post("/api/deploy-isana-android", async (req, res, next) => {
  const { body } = req;
  // Check for 1st time verify the API endpoint only
  const challenge = body.challenge;
  if (challenge) {
    return res.status(200).json({ challenge });
  }

  let command = body?.event?.text || "";
  txtPattern = /^(\<\@)([A-Z0-9]{11})(\>)/;
  // TODO: làm cái validate
  // validCommandPattern = /^(\<\@)([A-Z0-9]{11})(\>)/

  command = command.replace(txtPattern, "").trim().toLowerCase();
  versioning = command.toString().split(" ");
  versioning = versioning[versioning.length - 1];

  console.log({ command, versioning });

  try {
    checkCommand(command);

    let version;
    let releasedEnvironemnt = "";
    let successMsg = "";

    if (command.indexOf(PROD) >= 0) {
      version = await releaseProduction(versioning);
      releasedEnvironemnt = "production";
    } else if (command.indexOf(DEV) >= 0) {
      version = await releaseDev(versioning);
      releasedEnvironemnt = "dev";
    } else if (command.indexOf(STG) >= 0) {
      version = await releaseStg(versioning);
      releasedEnvironemnt = "staging";
    }

    let {
      oldVersionCode,
      oldVersionName,
      newVersionCode,
      newVersionName,
      newBranch,
    } = version;

    successMsg = `\n
    *${releasedEnvironemnt.toUpperCase()}* releases success!\n
    versionCode: \`${oldVersionCode}\` -> \`${newVersionCode}\`\n
    versionName: \`v${oldVersionName}\` -> \`v${newVersionName}\``;
    if (!command.indexOf(DEV) >= 0) {
      successMsg = `${successMsg}\nnew branch: ${newBranch}`
    }
    if (command.indexOf(PROD) >= 0) {
      successMsg = `${successMsg}\n
      tags: \`v${newVersionName}\``;
    }

    await dispatchMessageToSlack(successMsg);

    return res.status(200).json({ message: "OK" });
  } catch (err) {
    console.log("ERROR_API_PROGRESS:", err.message || "main threat error");
    await dispatchMessageToSlack(err.message || "Error");
    return res.json({ message: err.message });
  }
});

const releaseProduction = async (versioning) => {
  // console.log({ command });
  try {
    // STEP 1: get currcent version and up verison, get new SHA
    const { content, sha } = await getCurrentVersion("master");
    const currentVersion = decodeBase64(content);

    console.log({ currentVersion });
    // STEP 2: increase current version
    let { versionCode, versionName } = increaseVersion(
      versioning,
      currentVersion.versionCode,
      currentVersion.versionName
    );

    console.log({ versionCode, versionName });

    // STEP 3: update version content of version file in remote reposity
    let newVersionStr = `versionCode=${versionCode}\nversionName=${versionName}`;
    let newVersionBase64 = encodeBase64(newVersionStr);
    let updateSHA = await updateVersionFileContent(
      versionCode,
      versionName,
      newVersionBase64,
      sha,
      "master"
    );

    // STEP 4: create new branch
    // TODO: change folder value on prod
    const branch = `v${versionName}`;
    const creationRes = await createBranch(
      `${GIT_RELEASE_PROD_FOLDER}/${branch}`,
      updateSHA
    );

    // STEP 5: crate tag
    await createReleaseTag(branch, creationRes.object);

    return {
      oldVersionCode: currentVersion.versionCode,
      oldVersionName: currentVersion.versionName,
      newVersionCode: versionCode,
      newVersionName: versionName,
      newBranch: branch
    };
  } catch (err) {
    console.log("ERROR_PRODUCT_PROGRESS:", err.message || "main threat error");
    throw new Error("Release production failed");
  }
};

const releaseDev = async (versioning) => {
  try {
    // STEP 1: get currcent version and up verison, get new SHA
    const { content, sha } = await getCurrentVersion("develop");
    const currentVersion = decodeBase64(content);

    console.log({ currentVersion });
    // STEP 2: increase current version
    let { versionCode, versionName } = increaseVersion(
      versioning,
      currentVersion.versionCode,
      currentVersion.versionName
    );

    console.log({ versionCode, versionName });

    // STEP 3: update version content of version file in remote reposity
    let newVersionStr = `versionCode=${versionCode}\nversionName=${versionName}`;
    let newVersionBase64 = encodeBase64(newVersionStr);
    await updateVersionFileContent(
      versionCode,
      versionName,
      newVersionBase64,
      sha,
      "develop"
    );

    return {
      oldVersionCode: currentVersion.versionCode,
      oldVersionName: currentVersion.versionName,
      newVersionCode: versionCode,
      newVersionName: versionName,
      newBranch: ""
    };
  } catch (err) {
    console.log("ERROR_DEV_PROGRESS:", err.message || "main threat error");
    throw new Error("Release dev failed");
  }
};

const releaseStg = async (versioning) => {
  try {
    // STEP 1: get currcent version and up verison, get new SHA
    const { content, sha } = await getCurrentVersion("develop");
    const currentVersion = decodeBase64(content);

    console.log({ currentVersion });
    // STEP 2: increase current version
    let { versionCode, versionName } = increaseVersion(
      versioning,
      currentVersion.versionCode,
      currentVersion.versionName
    );

    console.log({ versionCode, versionName });

    // STEP 3: update version content of version file in remote reposity
    let newVersionStr = `versionCode=${versionCode}\nversionName=${versionName}`;
    let newVersionBase64 = encodeBase64(newVersionStr);
    let updateSHA = await updateVersionFileContent(
      versionCode,
      versionName,
      newVersionBase64,
      sha,
      "develop"
    );

    // STEP 4: create new branch
    // TODO: change folder value on prod
    const branch = `v${versionName}_${getReleaseTime()}`;
    const creationRes = await createBranch(
      `${GIT_RELEASE_STG_FOLDER}/${branch}`,
      updateSHA
    );

    return {
      oldVersionCode: currentVersion.versionCode,
      oldVersionName: currentVersion.versionName,
      newVersionCode: versionCode,
      newVersionName: versionName,
      newBranch: branch
    };
  } catch (err) {
    console.log("ERROR_DEV_PROGRESS:", err.message || "main threat error");
    throw new Error("Release staging failed");
  }
};

/**
 * return release time ad format YYYYMMddHHmmss
 */
const getReleaseTime = () => {
  const now = new Date();
  return `${now.getFullYear()}${
    now.getMonth() + 1
  }${now.getDate()}${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;
};

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
 * throw Erorr input param is not valid
 * @param {*} command
 */
const checkCommand = (command) => {
  switch (command) {
    case ANDROID_PROD_RELEASE:
      break;
    case ANDROID_PROD_RELEASE_PATCH:
      break;
    case ANDROID_PROD_RELEASE_MAJOR:
      break;
    case ANDROID_PROD_RELEASE_MINOR:
      break;
    case ANDROID_DEV_RELEASE:
      break;
    case ANDROID_DEV_RELEASE_PATCH:
      break;
    case ANDROID_DEV_RELEASE_MAJOR:
      break;
    case ANDROID_DEV_RELEASE_MINOR:
      break;
    case ANDROID_STG_RELEASE:
      break;
    case ANDROID_STG_RELEASE_PATCH:
      break;
    case ANDROID_STG_RELEASE_MAJOR:
      break;
    case ANDROID_STG_RELEASE_MINOR:
      break;
    default:
      throw new Error("command is not valid");
  }
  console.log("Cammand is OK");
};

/**
 * increase the version of current version
 * @param {*} versionCode
 * @param {*} versionName
 * @param {*} versioning
 * @return { versionCode, versionName }
 */
const increaseVersion = (versioning, versionCode, versionName) => {
  let [major, minor, patch] = versionName.split(".");
  console.log({ versioning });
  switch (versioning) {
    case ANDROID_RELEASE_DEFAULT:
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
  }
  versionName = `${major}.${minor}.${patch}`;
  versionCode = +versionCode + 1;
  return { versionCode, versionName };
};

module.exports = app;
