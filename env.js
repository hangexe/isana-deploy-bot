// Github token
const GIT_TOKEN = "639e504e9384f2578ca733400e93d2ec493e0ab3";

// Slackbot Command
const ANDROID_RELEASE = "android release";
const ANDROID_RELEASE_PATCH = "android release patch";
const ANDROID_RELEASE_MAJOR = "android release major";
const ANDROID_RELEASE_MINOR = "android release minor";

// Verion file url
const APP_VERSION_FILE_URL =
  "https://api.github.com/repos/Lighthouse-Inc/isana-android/contents/versionApp.properties";

const SLACK_MESSAGE_API =
  "https://hooks.slack.com/services/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";

module.exports = {
  GIT_TOKEN,
  ANDROID_RELEASE,
  ANDROID_RELEASE_PATCH,
  ANDROID_RELEASE_MAJOR,
  ANDROID_RELEASE_MINOR,
  APP_VERSION_FILE_URL,
  SLACK_MESSAGE_API
};
