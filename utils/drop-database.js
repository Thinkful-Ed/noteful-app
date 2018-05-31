"use strict";

const mongoose = require("mongoose");

const { MONGODB_URI } = require("../config");

console.log(`Connecting to mongodb at ${MONGODB_URI}`);
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log("Dropping database");
    return mongoose.connection.db.dropDatabase();
  })
  .then(() => mongoose.disconnect())
  .catch(err => {
    console.error(err);
  });