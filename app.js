var express = require("express");
var path = require("path");
var logger = require("morgan");
var bodyParser = require("body-parser");
var fetch = require("node-fetch");
var { exe } = require("child_process");

var app = express();

app.use(logger("dev"));
app.use(bodyParser.json({ type: "application/json" }));
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res, next) => {
  res.end(
    `<h1 style="margin: 200px auto">Hello, welcome to Slackbot of Isana team</h1>`
  );
});

app.post("/api/deploy-isana-android", async (req, res, next) => {
  const { body } = req;
  console.log({ body });

  // const curlReponse = async () => {
  //   try {
  //     let jsonRes = await fetch("https://jsonplaceholder.typicode.com/users");
  //     return await jsonRes.json();
  //   } catch (err) {
  //     console.log(err);
  //   }
  // };

  try {
    const output = await exe(
      "curl -i -u nguyenxuantien3105:b9cb102fd03a6b743d9a34822bdafce50898b25a https://api.github.com/repos/Lighthouse-Inc/isana-android/branches/master"
    );
    console.log(output);
  } catch (err) {
    console.log(err);
  }

  res.json({
    message: "success",
    body,
  });
});

module.exports = app;
