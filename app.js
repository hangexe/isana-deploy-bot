var express = require("express");
var path = require("path");
var logger = require("morgan");
var bodyParser = require("body-parser");
var util = require("util");
var exec = util.promisify(require("child_process").exec);

var app = express();

app.use(logger("dev"));
app.use(bodyParser.json({ type: "application/json" }));
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res, next) => {
  res.end(
    `<h1 style="margin: 200px auto">Hello, welcome to Slackbot of Isana team</h1>`
  );
});


// POST - request is sent from slack bot
app.post("/api/deploy-isana-android", async (req, res, next) => {
  const { body } = req;
  console.log({ body }); 
  const account = 'nguyenxuantien3105:b9cb102fd03a6b743d9a34822bdafce50898b25a'
  const reposity = 'https://api.github.com/repos/Lighthouse-Inc/isana-android/branches/master'
  const curl = `curl -i -u ${account} -H "Accept: application/vnd.github.v3+json" ${reposity}`
  try {
    const { stdout, stderr } = await exec(curl);
    console.log(stdout)
    // console.log({stderr });
  } catch (err) {
    console.log(err);
  }

  res.json({
    message: "success",
    body,
  });
});

module.exports = app;
