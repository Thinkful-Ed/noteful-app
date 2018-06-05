"use strict";

const app = require("../server");
const chai = require("chai");
const chaiHttp = require("chai-http");

const db = require("../db/mongoose");
const { TEST_MONGODB_URI } = require("../config");

const Note = require("../models/note");
const Folder = require("../models/folder");
const Tag = require("../models/tag");

const seedNotes = require("../db/seed/notes");
const seedFolders = require("../db/seed/folders");
const seedTags = require("../db/seed/tags");

const expect = chai.expect;

chai.use(chaiHttp);

describe("Noteful API - Notes", function () {


  before(function () {
    return db.connect(TEST_MONGODB_URI)
      .then(() => db.dropDatabase());
  });

  beforeEach(function () {
    return Promise.all([
      Note.insertMany(seedNotes),

      Folder.insertMany(seedFolders),
      Folder.createIndexes(),

      Tag.insertMany(seedTags),
      Tag.createIndexes()
    ]);
  });

  afterEach(function () {
    return db.dropDatabase();
  });

  after(function () {
    return db.disconnect();
  });

  describe("GET /api/notes", function () {

    it("should return the correct number of Notes", function () {
      const dbPromise = Note.find();
      const apiPromise = chai.request(app)
        .get("/api/notes");

      return Promise.all([dbPromise, apiPromise])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a("array");
          expect(res.body).to.have.length(data.length);
        });
    });

    it("should return a list with the correct right fields", function () {
      const dbPromise = Note.find().sort({ "updatedAt": "desc" });
      const apiPromise = chai.request(app)
        .get("/api/notes");

      return Promise.all([dbPromise, apiPromise])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a("array");
          expect(res.body).to.have.length(data.length);
          res.body.forEach(function (item, i) {
            expect(item).to.be.a("object");
            // Note: folderId and content are optional
            expect(item).to.include.all.keys("id", "title", "createdAt", "updatedAt", "tags");
            expect(item.id).to.equal(data[i].id);
            expect(item.title).to.equal(data[i].title);
            expect(item.content).to.equal(data[i].content);
            expect(new Date(item.createdAt)).to.eql(data[i].createdAt);
            expect(new Date(item.updatedAt)).to.eql(data[i].updatedAt);
          });
        });
    });

    it("should return correct search results for a searchTerm query", function () {
      const searchTerm = "gaga";
      const re = new RegExp(searchTerm, "i");
      const dbPromise = Note.find({
        title: { $regex: re }
        // $or: [{ 'title': { $regex: re } }, { 'content': { $regex: re } }]
      });
      const apiPromise = chai.request(app)
        .get(`/api/notes?searchTerm=${searchTerm}`);

      return Promise.all([dbPromise, apiPromise])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a("array");
          expect(res.body).to.have.length(1);
          res.body.forEach(function (item, i) {
            expect(item).to.be.a("object");
            // Note: folderId and content are optional
            expect(item).to.include.all.keys("id", "title", "createdAt", "updatedAt", "tags");
            expect(item.id).to.equal(data[i].id);
            expect(item.title).to.equal(data[i].title);
            expect(item.content).to.equal(data[i].content);
            expect(new Date(item.createdAt)).to.eql(data[i].createdAt);
            expect(new Date(item.updatedAt)).to.eql(data[i].updatedAt);
          });
        });
    });

    it("should return correct search results for a folderId query", function () {
      let data;

      return Folder.findOne()
        .then((_data) => {
          data = _data;
          const dbPromise = Note.find({ folderId: data.id });
          const apiPromise = chai.request(app)
            .get(`/api/notes?folderId=${data.id}`);

          return Promise.all([dbPromise, apiPromise]);
        })
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a("array");
          expect(res.body).to.have.length(data.length);
        });
    });

    it("should return an empty array for an incorrect query", function () {
      const searchTerm = "NotValid";
      const re = new RegExp(searchTerm, "i");
      const dbPromise = Note.find({
        title: { $regex: re }
        // $or: [{ 'title': { $regex: re } }, { 'content': { $regex: re } }]
      });
      const apiPromise = chai.request(app)
        .get(`/api/notes?searchTerm=${searchTerm}`);

      return Promise.all([dbPromise, apiPromise])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a("array");
          expect(res.body).to.have.length(data.length);
        });
    });
  });

  describe("GET /api/notes/:id", function () {

    it("should return correct notes", function () {
      let data;

      return Note.findOne()
        .then(_data => {
          data = _data;

          return chai.request(app)
            .get(`/api/notes/${data.id}`);
        })
        .then((res) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an("object");
          expect(res.body).to.have.all.keys("id", "title", "content", "createdAt", "updatedAt", "folderId", "tags");
          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(data.title);
          expect(res.body.content).to.equal(data.content);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });

    it("should respond with a 400 for an invalid id", function () {
      const badId = "NOT-A-VALID-ID";

      return chai.request(app)
        .get(`/api/notes/${badId}`)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.eq("The `id` is not valid");
        });
    });

    it("should respond with a 404 for an non existent id", function () {
      // "DOESNOTEXIST" is 12 byte string which is a valid Mongo ObjectId()
      return chai.request(app)
        .get("/api/notes/DOESNOTEXIST")
        .then(res => {
          expect(res).to.have.status(404);
        });
    });

  });

  describe("POST /api/notes", function () {

    it("should create and return a new item when provided valid data", function () {
      const newItem = {
        "title": "The best article about cats ever!",
        "content": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor..."
      };
      let res;

      return chai.request(app)
        .post("/api/notes")
        .send(newItem)
        .then(function (_res) {
          res = _res;
          expect(res).to.have.status(201);
          expect(res).to.have.header("location");
          expect(res).to.be.json;
          expect(res.body).to.be.a("object");
          expect(res.body).to.have.all.keys("id", "title", "content", "createdAt", "updatedAt", "tags");
          return Note.findById(res.body.id);
        })
        .then(data => {
          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(data.title);
          expect(res.body.content).to.equal(data.content);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });

    it('should return an error when missing "title" field', function () {
      const newItem = { "foo": "bar" };

      return chai.request(app)
        .post("/api/notes")
        .send(newItem)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a("object");
          expect(res.body.message).to.equal("Missing `title` in request body");
        });
    });

  });

  describe("PUT /api/notes/:id", function () {

    it("should update the note", function () {
      const updateItem = {
        "title": "What about dogs?!",
        "content": "woof woof"
      };
      let data;

      return Note.findOne()
        .then(_data => {
          data = _data;

          return chai.request(app)
            .put(`/api/notes/${data.id}`)
            .send(updateItem);
        })
        .then(function (res) {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a("object");
          expect(res.body).to.have.all.keys("id", "title", "content", "createdAt", "updatedAt", "folderId", "tags");
          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(updateItem.title);
          expect(res.body.content).to.equal(updateItem.content);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          // expect note to have been updated
          expect(new Date(res.body.updatedAt)).to.greaterThan(data.updatedAt);
        });
    });


    it("should respond with a 400 for an invalid id", function () {
      const badId = "NOT-A-VALID-ID";
      const updateItem = {
        "title": "What about dogs?!",
        "content": "woof woof"
      };

      return chai.request(app)
        .put(`/api/notes/${badId}`)
        .send(updateItem)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.eq("The `id` is not valid");
        });
    });

    it("should respond with a 404 for an non existent id", function () {
      // "DOESNOTEXIST" is 12 byte string which is a valid Mongo ObjectId()
      const updateItem = {
        "title": "What about dogs?!",
        "content": "woof woof"
      };

      return chai.request(app)
        .put("/api/notes/DOESNOTEXIST")
        .send(updateItem)
        .then(res => {
          expect(res).to.have.status(404);
        });
    });

    it('should return an error when missing "title" field', function () {
      const updateItem = {
        "content": "woof woof"
      };
      let data;

      return Note.findOne()
        .then(_data => {
          data = _data;

          return chai.request(app)
            .put(`/api/notes/${data.id}`)
            .send(updateItem);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a("object");
          expect(res.body.message).to.equal("Missing `title` in request body");
        });
    });

  });

  describe("DELETE  /api/notes/:id", function () {

    it("should delete an item by id", function () {
      let data;

      return Note
        .findOne()
        .then(_data => {
          data = _data;

          return chai.request(app)
            .delete(`/api/notes/${data.id}`);
        })
        .then(res => {
          expect(res).to.have.status(204);
          expect(res.body).to.be.empty;

          return Note.findById(data.id);
        })
        .then((item) => {
          expect(item).to.be.null;
        });
    });
  });

  it("should respond with 204 when document does not exist", function () {
    return chai.request(app)
      .delete("/api/notes/DOESNOTEXIST")
      .then((res) => {
        expect(res).to.have.status(204);
      });
  });

});
