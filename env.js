// Github token
const GIT_TOKEN = "66fd5568c14d9b5bbf263bb4b68d1a8f7b33871d";

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
