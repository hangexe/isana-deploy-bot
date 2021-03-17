const {
  GIT_REPO,
  GIT_OWNER,
  GIT_PERSONAL_ACCESS_TOKEN,
  GIT_VERSION_FILE_REF,

  GIT_RELEASE_PROD_FOLDER,
  GIT_RELEASE_STG_FOLDER
} = process.env;

var { Octokit } = require("@octokit/core");
const octokit = new Octokit({ auth: process.env.GIT_PERSONAL_ACCESS_TOKEN });

/**
 * @ref the branch which need to ref. `master` or `dev`
 * @return {sha} sha
 * @return {content} content: the encoded base64 string
 */
const getCurrentVersion = async (ref = "master") => {
  // let currentVersion;
  console.log("GET_CURRENT_VERSION_REF", ref)
  try {
    const response = await octokit.request(
      `GET /repos/{owner}/{repo}/${GIT_VERSION_FILE_REF}?ref=${ref}`,
      {
        owner: GIT_OWNER,
        repo: GIT_REPO
      }
    );
    console.log("=======GET_CURRENT_VERSION======");
    console.log({ response });
    const { content, sha } = response.data;
    // currentVersion = decodeBase64(content);
    return { content, sha };
  } catch (err) {
    console.error("ERROR_GET_CURRENT_VERSION:", err.message);
    throw new Error(
      `Could not get version file from reposity due to github token was destroyed or other reason`
    );
  }
};

/**
 *
 * @param {*} versionCode
 * @param {*} versionName
 * @param {*} base64Content
 * @param {*} sha
 * @param {*} branch ref branch, `master` or `dev`
 */
const updateVersionFileContent = async (
  versionCode,
  versionName,
  base64Content,
  sha,
  branch
) => {
  try {
    const response = await octokit.request(
      `PUT /repos/{owner}/{repo}/${GIT_VERSION_FILE_REF}`,
      {
        owner: GIT_OWNER,
        repo: GIT_REPO,
        message: `SLACK BOT increased versionCode to ${versionCode}, versionName to ${versionName}`,
        content: `${base64Content}`,
        sha: `${sha}`,
        branch: branch
      }
    );
    console.log("=======UPDATE_VERSION_FILE=======");
    console.log({ response });
    return response.data.commit.sha;
  } catch (err) {
    console.log(err);
    throw new Error("Could not update version file");
  }
};

/**
 *
 * @param {*} branchName new branch's name, example test/ABC
 * @param {*} sha
 * @return object contains info of created branch
 * @return {*} a new sha commit after creating new branch
 */
const createBranch = async (branchName, sha) => {
  if (!branchName || !sha) {
    throw new Error("branch name or sha is required");
  }

  try {
    const response = await octokit.request(
      "POST /repos/{owner}/{repo}/git/refs",
      {
        owner: GIT_OWNER,
        repo: GIT_REPO,
        ref: `refs/heads/${branchName}`,
        sha: `${sha}`
      }
    );

    console.log("=====CREATE_RELEASE_BRANCH======");
    console.log({ response });
    return response.data;
  } catch (err) {
    console.error("ERROR_CREATE_BRANCH:", err);
    throw new Error(err.message);
  }
};

/**
 *
 * @param {*} tag
 * @param {*} object: get this object from created branch's response
 */
const createReleaseTag = async (tag, object) => {
  try {
    const response = await octokit.request(
      "POST /repos/{owner}/{repo}/git/refs",
      {
        owner: GIT_OWNER,
        repo: GIT_REPO,
        ref: `refs/tags/${tag}`,
        sha: object.sha
      }
    );
    console.log("=====CREATE_RELEASE_TAG======");
    console.log({ response });
  } catch (err) {
    console.log("ERROR_CREATE_RELEASE_TAG:", err);
    throw new Error("Create tag failure");
  }
};

module.exports = {
  getCurrentVersion,
  updateVersionFileContent,
  createBranch,
  createReleaseTag
};
