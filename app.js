var express = require("express");
var path = require("path");
var logger = require("morgan");
var bodyParser = require("body-parser");
var fetch = require("node-fetch");

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

  const curlReponse = async () => {
    try {
      let jsonRes = await fetch("https://jsonplaceholder.typicode.com/users");
      return await jsonRes.json();
    } catch (err) {
      console.log(err);
    }
  };

  console.log(curlReponse);

  res.json({
    message: "success",
    body,
  });
});

module.exports = app;
