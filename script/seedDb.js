'use strict';

const faker = require('faker');
const mongoose = require('mongoose');

const { MONGODB_URI } = require('../config');
const Folder = require('../models/folder');
const Note = require('../models/note');
const Tag = require('../models/tag');
const User = require('../models/user');

const PASSWORD = 'password';

// used to guarantee unique usernames when seedDb gets run
let USER_INDEX = 1;

function makeUser() {
  // to ensure unique names
  const username = `${faker.internet.userName()}__${USER_INDEX}`;
  USER_INDEX += 1;
  const fullname = `${faker.name.firstName()} ${faker.name.lastName()}`;
  console.log(`creating new user with username ${username}`);
  return new User({ username, password: PASSWORD, fullname });
}

function makeFolder(userId) {
  return new Folder({ name: faker.random.word(), userId });
}

function makeNote(userId, folderId, tags = []) {
  return new Note({
    title: faker.random.word(),
    content: faker.random.words(10),
    folderId,
    tags,
    userId
  });
}

function makeTag(userId) {
  return new Tag({ name: faker.random.word(), userId });
}

// https://stackoverflow.com/a/1527820
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeUserWithNotesEtc(numFolders = 3, numNotes = 10, numTags = 5) {
  const items = [];

  const tags = [];
  const folders = [];
  const notes = [];

  const user = makeUser();
  items.push(user);

  for (let i = 0; i < numTags; i++) {
    tags.push(makeTag(user.id));
  }

  for (let i = 0; i < numFolders; i++) {
    folders.push(makeFolder(user.id));
  }

  for (let i = 0; i < numNotes; i++) {
    const noteFolder = folders[getRandomInt(0, folders.length - 1)];
    const noteTags = tags.slice(0, getRandomInt(1, tags.length));
    const note = makeNote(user.id, noteFolder.id, noteTags);
    notes.push(note);
  }

  return items.concat(tags, folders, notes);
}

function makeSeeds(numUsers = 10) {
  const seeds = [];
  for (let i = 0; i < numUsers; i++) {
    seeds.push(...makeUserWithNotesEtc());
  }
  return seeds;
}

if (require.main === module) {
  console.log(`Connecting to mongodb at ${MONGODB_URI}`);
  mongoose
    .connect(MONGODB_URI)
    .then(() => {
      console.log('Seeding the database with dummy data');
      return Promise.all(makeSeeds().map(seed => seed.save()))
        .then(() => console.log('db seeded'))
    })
    .then(() => mongoose.disconnect())
    .catch(err => console.error(err));
}
