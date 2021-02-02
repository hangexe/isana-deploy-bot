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
  console.log({body})
  res.json({
    message: "success",
    body
  });
});

module.exports = app;
