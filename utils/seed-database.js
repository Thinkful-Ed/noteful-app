"use strict";

const { MONGODB_URI } = require("../config");
const Note = require("../models/note");
const Folder = require("../models/folder");
const Tag = require("../models/tag");

const db = require("../db/mongoose");

const seedNotes = require("../db/seed/notes");
const seedFolders = require("../db/seed/folders");
const seedTags = require("../db/seed/tags");


db.connect(MONGODB_URI)
  .then(() => {
    console.info("Dropping Database");
    return db.dropDatabase();
  })
  .then(() => {
    console.info("Seeding Database");
    return Promise.all([

      Note.insertMany(seedNotes),

      Folder.insertMany(seedFolders),
      Folder.createIndexes(),

      Tag.insertMany(seedTags),
      Tag.createIndexes()

    ]);
  })
  .then(() => {
    console.info("Disconnecting");
    return db.disconnect();
  })
  .catch(err => {
    db.disconnect();
    console.error(`ERROR: ${err.message}`);
    console.error(err);
  });
