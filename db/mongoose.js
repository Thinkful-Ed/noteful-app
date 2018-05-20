"use strict";

const mongoose = require("mongoose");

const { MONGODB_URI } = require("../config");

function connect(url = MONGODB_URI) {
  return mongoose.connect(url)
    .then(instance => {
      const conn = instance.connections[0];
      console.info(`Using: mongodb://${conn.host}:${conn.port}/${conn.name}`);
    })
    .catch(err => {
      console.error(`ERROR: ${err.message}`);
    });
}

function dropDatabase() {
  return mongoose.connection.db.dropDatabase();
}

function disconnect() {
  return mongoose.disconnect();
}

function get() {
  return mongoose;
}

module.exports = { connect, dropDatabase, disconnect, get };
