"use strict";

const bcrypt = require("bcryptjs");

const User = require("../models/user");

function localAuth(req, res, next) {
  const { username, password } = req.body;

  if (!username && !password) {
    const err = new Error("No credentials provided");
    err.status = 400;
    return next(err);
  }

  let user;
  return User.findOne({ username })
    .then(_user => {
      user = _user;

      if (!user) {
        const err = new Error("Invalid credentials");
        err.status = 401;
        err.location = "username";
        return Promise.reject(err);
      }

      return bcrypt.compare(password, user.password);
    })
    .then(isValid => {

      if (!isValid) {
        const err = new Error("Invalid credentials");
        err.status = 401;
        err.location = "password";
        return Promise.reject(err);
      }

      req.user = user;
      next();
    })
    .catch((err) => {
      next(err);
    });
}

module.exports = localAuth;
