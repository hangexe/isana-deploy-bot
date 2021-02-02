var express = require("express");
var path = require("path");
var logger = require("morgan");
var bodyParser = require("body-parser");

var app = express();

app.use(logger("dev"));
app.use(bodyParser.json({ type: "application/json" }));
app.use(bodyParser.urlencoded({ extended: false }));

app.post("/api/deploy-isana-android", (req, res, next) => {
  const { body } = req;
  console.log(req.params);

  // const {challenge} = req.params;

  // logger
  res.json({
    message: "ok",
    body
  });
});

module.exports = app;
