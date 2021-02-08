var express = require("express");
var path = require("path");
var logger = require("morgan");
var bodyParser = require("body-parser");
const { json } = require("body-parser");

var app = express();

app.use(logger("dev"));
app.use(bodyParser.json({ type: "application/json" }));
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req,res,next) => {
  json.end(`<h1 style="margin: 200px auto">Hello, welcome to Slackbot of Isana team</h1>`)
})

app.post("/api/deploy-isana-android", (req, res, next) => {
  const { body } = req;
  console.log({body})
  res.json({
    message: "success",
    body
  });
});

module.exports = app;
