"use strict";

const logger = function (req, res, next) {
  const now = new Date();
  console.info(`${now.toLocaleString()} ${req.method} ${req.url}`);
  next();
};

module.exports = logger;
