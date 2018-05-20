"use strict";

const jwt = require("jsonwebtoken");

const { JWT_SECRET } = require("../config");

function jwtAuth(req, res, next) {

  const auth = req.header("Authorization");

  if (!auth) {
    const err = new Error("No 'Authorization' header found");
    err.status = 401;
    return next(err);
  }

  const scheme = auth.split(" ")[0];
  const token = auth.split(" ")[1];

  if (scheme !== "Bearer" || !token) {
    const err = new Error("No 'Bearer' token found");
    err.status = 401;
    return next(err);
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {

    if (err) {
      err.message = "Invalid JWT";
      err.status = 401;
      return next(err);
    }

    req.user = decoded.user;
    next();
  });
}

module.exports = jwtAuth;
