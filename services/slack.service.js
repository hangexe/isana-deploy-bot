const fetch = require("node-fetch");
const { SLACK_MESSAGE_HOOK } = process.env;

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
    await fetch(`${SLACK_MESSAGE_HOOK}`, {
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

module.exports = { dispatchMessageToSlack };
