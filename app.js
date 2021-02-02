var express = require("express");
var path = require("path");
var logger = require("morgan");
var bodyParser = require("body-parser");

var app = express();

app.use(logger("dev"));
app.use(bodyParser.json({ type: "application/*+json" }));
app.use(bodyParser.urlencoded({ extended: false }));

app.post("/api/deploy-isana-android", (req, res, next) => {
  console.log(req.params["challenge"]);
  const { body } = req;
  const { challenge } = req.body;
  // const {challenge} = req.params;

  // logger
  res.json({
    challenge,
  });
});

module.exports = app;
