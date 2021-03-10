// Github token
const GIT_PERSONAL_ACCESS_TOKEN = "48e3ef1614ec650d9d7f54ddf44b60ca535d9b7f";

// Slackbot Command
const ANDROID_RELEASE = "android release";
const ANDROID_RELEASE_PATCH = "android release patch";
const ANDROID_RELEASE_MAJOR = "android release major";
const ANDROID_RELEASE_MINOR = "android release minor";

// Verion file url
const APP_VERSION_FILE_URL =
  "https://api.github.com/repos/Lighthouse-Inc/isana-android/contents/versionApp.properties";

const GIT_API_ENDPOINT =
  "https://api.github.com/repos/Lighthouse-Inc/isana-android";

const SLACK_MESSAGE_API =
  "https://hooks.slack.com/services/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";

module.exports = {
  GIT_PERSONAL_ACCESS_TOKEN,
  ANDROID_RELEASE,
  ANDROID_RELEASE_PATCH,
  ANDROID_RELEASE_MAJOR,
  ANDROID_RELEASE_MINOR,
  APP_VERSION_FILE_URL,
  SLACK_MESSAGE_API,
  GIT_API_ENDPOINT
};
