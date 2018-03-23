'use strict';
const app = require('../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const { TEST_MONGODB_URI, JWT_SECRET } = require('../config');

const User = require('../models/user');
const Note = require('../models/note');
const Folder = require('../models/folder');

const seedNotes = require('../db/seed/notes');
const seedFolders = require('../db/seed/folders');
const testUser = require('../db/seed/users')[0];

const expect = chai.expect;
chai.use(chaiHttp);

describe('Noteful API - Notes', function () {

  let user;
  let token;

  before(function () {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function () {
    return User.create(testUser)
      .then(_user => {
        user = _user;
        token = jwt.sign({ user }, JWT_SECRET, { subject: user.username });

        return Promise.all([
          Note.create(seedNotes),
          Folder.create(seedFolders),
          Folder.createIndexes(),
          Note.createIndexes()
        ]);
      });
  });

  afterEach(function () {
    return mongoose.connection.db.dropDatabase()
      .catch(err => console.error(err));
  });

  after(function () {
    return mongoose.disconnect();
  });

  describe('GET /api/notes', function () {

    it('should return the correct number of Notes', function () {
      const dbPromise = Note.find({ userId: user.id });
      const apiPromise = chai.request(app)
        .get('/api/notes')
        .set('Authorization', `Bearer ${token}`);

      return Promise.all([dbPromise, apiPromise])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
        });
    });

    it('should return a list with the correct right fields', function () {
      const dbPromise = Note.find({ userId: user.id });
      const apiPromise = chai.request(app)
        .get('/api/notes')
        .set('Authorization', `Bearer ${token}`);

      return Promise.all([dbPromise, apiPromise])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
          res.body.forEach(function (item) {
            expect(item).to.be.a('object');
            expect(item).to.include.keys('id', 'title', 'content', 'created');
          });
        });
    });

    it('should return correct search results for a searchTerm query', function () {
      const searchTerm = 'gaga';
      const re = new RegExp(searchTerm, 'i');
      const dbPromise = Note.find({
        userId: user.id,
        $or: [{ 'title': { $regex: re } }, { 'content': { $regex: re } }]
      });
      const apiPromise = chai.request(app)
        .get(`/api/notes?searchTerm=${searchTerm}`)
        .set('Authorization', `Bearer ${token}`);

      return Promise.all([dbPromise, apiPromise])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(1);
          expect(res.body[0]).to.be.an('object');
          expect(res.body[0].id).to.equal(data[0].id);
        });
    });

    it('should return correct search results for a folderId query', function () {
      let data;
      return Folder.findOne()
        .then((_data) => {
          data = _data;
          const dbPromise = Note.find({ userId: user.id, folderId: data.id });
          const apiPromise = chai.request(app)
            .get(`/api/notes?folderId=${data.id}`)
            .set('Authorization', `Bearer ${token}`);
          return Promise.all([dbPromise, apiPromise]);
        })
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
        });
    });

    it('should return an empty array for an incorrect query', function () {
      const dbPromise = Note.find({ userId: user.id, title: { $regex: /NotValid/i } });
      const apiPromise = chai.request(app)
        .get('/api/notes?searchTerm=NotValid')
        .set('Authorization', `Bearer ${token}`);

      return Promise.all([dbPromise, apiPromise])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
        });
    });

  });

  describe('GET /api/notes/:id', function () {

    it('should return correct notes', function () {
      let data;
      return Note.findOne({ userId: user.id })
        .then(_data => {
          data = _data;
          return chai.request(app)
            .get(`/api/notes/${data.id}`)
            .set('Authorization', `Bearer ${token}`);
        })
        .then((res) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;

          expect(res.body).to.be.an('object');
          expect(res.body).to.include.keys('id', 'title', 'content', 'created', 'folderId', 'tags');

          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(data.title);
          expect(res.body.content).to.equal(data.content);
        });
    });

    it('should respond with a 400 for improperly formatted id', function () {
      const badId = '99-99-99';

      return chai.request(app)
        .get(`/api/notes/${badId}`)
        .set('Authorization', `Bearer ${token}`)
        .catch(err => err.response)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.eq('The `id` is not valid');
        });
    });

    it('should respond with a 404 for an invalid id', function () {

      return chai.request(app)
        .get('/api/notes/AAAAAAAAAAAAAAAAAAAAAAAA')
        .set('Authorization', `Bearer ${token}`)
        .catch(err => err.response)
        .then(res => {
          expect(res).to.have.status(404);
        });
    });

  });

  describe('POST /api/notes', function () {

    it('should create and return a new item when provided valid data', function () {
      const newItem = {
        'title': 'The best article about cats ever!',
        'content': 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor...'
      };
      let body;
      return chai.request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${token}`)
        .send(newItem)
        .then(function (res) {
          body = res.body;
          expect(res).to.have.status(201);
          expect(res).to.have.header('location');
          expect(res).to.be.json;
          expect(body).to.be.a('object');
          expect(body).to.include.keys('id', 'title', 'content');
          return Note.findOne({ _id: body.id, userId: user.id });
        })
        .then(data => {
          expect(body.title).to.equal(data.title);
          expect(body.content).to.equal(data.content);
        });
    });

    it('should return an error when missing "title" field', function () {
      const newItem = {
        'foo': 'bar'
      };

      return chai.request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${token}`)
        .send(newItem)
        .catch(err => err.response)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `title` in request body');
        });
    });

  });

  describe('PUT /api/notes/:id', function () {

    it('should update the note', function () {
      const updateItem = {
        'title': 'What about dogs?!',
        'content': 'woof woof'
      };
      let data;
      return Note.findOne({ userId: user.id })
        .then(_data => {
          data = _data;
          return chai.request(app)
            .put(`/api/notes/${data.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateItem);
        })
        .then(function (res) {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.include.keys('id', 'title', 'content');

          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(updateItem.title);
          expect(res.body.content).to.equal(updateItem.content);
        });
    });


    it('should respond with a 400 for improperly formatted id', function () {
      const updateItem = {
        'title': 'What about dogs?!',
        'content': 'woof woof'
      };
      const badId = '99-99-99';

      return chai.request(app)
        .put(`/api/notes/${badId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateItem)
        .catch(err => err.response)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.eq('The `id` is not valid');
        });
    });

    it('should respond with a 404 for an invalid id', function () {
      const updateItem = {
        'title': 'What about dogs?!',
        'content': 'woof woof'
      };

      return chai.request(app)
        .put('/api/notes/AAAAAAAAAAAAAAAAAAAAAAAA')
        .set('Authorization', `Bearer ${token}`)
        .send(updateItem)
        .catch(err => err.response)
        .then(res => {
          expect(res).to.have.status(404);
        });
    });

    it('should return an error when missing "title" field', function () {
      const updateItem = {
        'foo': 'bar'
      };

      return chai.request(app)
        .put('/api/notes/9999')
        .set('Authorization', `Bearer ${token}`)
        .send(updateItem)
        .catch(err => err.response)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `title` in request body');
        });
    });

  });

  describe('DELETE  /api/notes/:id', function () {

    it('should delete an item by id', function () {
      let data;
      return Note.findOne({ userId: user.id })
        .then(_data => {
          data = _data;
          return chai.request(app)
            .delete(`/api/notes/${data.id}`)
            .set('Authorization', `Bearer ${token}`);
        })
        .then(function (res) {
          expect(res).to.have.status(204);
        });
    });

  });

});
