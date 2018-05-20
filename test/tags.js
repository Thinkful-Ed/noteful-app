"use strict";

const app = require("../server");
const chai = require("chai");
const chaiHttp = require("chai-http");
const jwt = require("jsonwebtoken");

const db = require("../db/mongoose");
const { TEST_MONGODB_URI, JWT_SECRET } = require("../config");

const User = require("../models/user");
const Tag = require("../models/tag");

const seedTags = require("../db/seed/tags");
const seedUsers = require("../db/seed/users");

const expect = chai.expect;
chai.use(chaiHttp);

describe("Noteful API - Tags", function () {

  let user;
  let token;

  before(function () {
    return db.connect(TEST_MONGODB_URI)
      .then(() => db.dropDatabase());
  });

  beforeEach(function () {
    return Promise.all([
      User.insertMany(seedUsers),
      Tag.insertMany(seedTags),
      Tag.createIndexes()
    ])
      .then(([users]) => {
        user = users[0];
        token = jwt.sign({ user }, JWT_SECRET, { subject: user.username });
      });
  });

  afterEach(function () {
    return db.dropDatabase();
  });

  after(function () {
    return db.disconnect();
  });

  describe("GET /api/tags", function () {

    it("should return the correct number of tags", function () {
      const dbPromise = Tag.find({ userId: user.id });
      const apiPromise = chai.request(app)
        .get("/api/tags")
        .set("Authorization", `Bearer ${token}`);

      return Promise.all([dbPromise, apiPromise])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a("array");
          expect(res.body).to.have.length(data.length);
        });
    });

    it("should return a list with the correct right fields", function () {
      const dbPromise = Tag.find({ userId: user.id });
      const apiPromise = chai.request(app)
        .get("/api/tags")
        .set("Authorization", `Bearer ${token}`);

      return Promise.all([dbPromise, apiPromise])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a("array");
          expect(res.body).to.have.length(data.length);
          res.body.forEach(function (item) {
            expect(item).to.be.a("object");
            expect(item).to.have.all.keys("id", "name", "createdAt", "updatedAt", "userId");
          });
        });
    });

  });

  describe("GET /api/tags/:id", function () {

    it("should return correct tags", function () {
      let data;
      return Tag.findOne({ userId: user.id })
        .then(_data => {
          data = _data;
          return chai.request(app)
            .get(`/api/tags/${data.id}`)
            .set("Authorization", `Bearer ${token}`);
        })
        .then((res) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an("object");
          expect(res.body).to.have.all.keys("id", "name", "createdAt", "updatedAt", "userId");
          expect(res.body.id).to.equal(data.id);
          expect(res.body.name).to.equal(data.name);
        });
    });

    it("should respond with a 400 for an invalid id", function () {
      const badId = "NOT-A-VALID-ID";

      return chai.request(app)
        .get(`/api/tags/${badId}`)
        .set("Authorization", `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.eq("The `id` is not valid");
        });
    });

    it("should respond with a 404 for an ID that does not exist", function () {
      // "DOESNOTEXIST" is 12 byte string which is a valid Mongo ObjectId()
      return chai.request(app)
        .get("/api/tags/DOESNOTEXIST")
        .set("Authorization", `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(404);
        });
    });

  });

  describe("POST /api/tags", function () {

    it("should create and return a new item when provided valid data", function () {
      const newItem = { "name": "newTag" };
      let body;
      return chai.request(app)
        .post("/api/tags")
        .set("Authorization", `Bearer ${token}`)
        .send(newItem)
        .then(function (res) {
          body = res.body;
          expect(res).to.have.status(201);
          expect(res).to.have.header("location");
          expect(res).to.be.json;
          expect(body).to.be.a("object");
          expect(body).to.have.all.keys("id", "name", "createdAt", "updatedAt", "userId");
          return Tag.findOne({ userId: user.id, _id: body.id });
        })
        .then(data => {
          expect(body.id).to.equal(data.id);
          expect(body.name).to.equal(data.name);
        });
    });

    it('should return an error when missing "name" field', function () {
      const newItem = { "foo": "bar" };

      return chai.request(app)
        .post("/api/tags")
        .set("Authorization", `Bearer ${token}`)
        .send(newItem)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a("object");
          expect(res.body.message).to.equal("Missing `name` in request body");
        });
    });

    it("should return an error when given a duplicate name", function () {
      return Tag.findOne({ userId: user.id })
        .then(data => {
          const newItem = { "name": data.name };
          return chai.request(app)
            .post("/api/tags")
            .set("Authorization", `Bearer ${token}`)
            .send(newItem);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a("object");
          expect(res.body.message).to.equal("Tag name already exists");
        });
    });
  });

  describe("PUT /api/tags/:id", function () {

    it("should update the tag", function () {
      const updateItem = { "name": "Updated Name" };
      let data;
      return Tag.findOne({ userId: user.id })
        .then(_data => {
          data = _data;
          return chai.request(app)
            .put(`/api/tags/${data.id}`)
            .set("Authorization", `Bearer ${token}`)
            .send(updateItem);
        })
        .then(function (res) {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a("object");
          expect(res.body).to.have.all.keys("id", "name", "createdAt", "updatedAt", "userId");
          expect(res.body.id).to.equal(data.id);
          expect(res.body.name).to.equal(updateItem.name);
        });
    });

    it("should respond with a 400 for an invalid id", function () {
      const badId = "NOT-A-VALID-ID";
      const updateItem = { "name": "Blah" };

      return chai.request(app)
        .put(`/api/tags/${badId}`)
        .set("Authorization", `Bearer ${token}`)
        .send(updateItem)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.eq("The `id` is not valid");
        });
    });

    it("should respond with a 404 for an ID that does not exist", function () {
      const updateItem = { "name": "Blah" };
      // "DOESNOTEXIST" is 12 byte string which is a valid Mongo ObjectId()
      return chai.request(app)
        .put("/api/tags/DOESNOTEXIST")
        .set("Authorization", `Bearer ${token}`)
        .send(updateItem)
        .then(res => {
          expect(res).to.have.status(404);
        });
    });

    it('should return an error when missing "name" field', function () {
      const updateItem = {};
      let data;
      return Tag.findOne({ userId: user.id })
        .then(_data => {
          data = _data;
          return chai.request(app)
            .put(`/api/tags/${data.id}`)
            .set("Authorization", `Bearer ${token}`)
            .send(updateItem);
        })

        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a("object");
          expect(res.body.message).to.equal("Missing `name` in request body");
        });
    });

    it("should return an error when given a duplicate name", function () {
      return Tag.find({ userId: user.id }).limit(2)
        .then(results => {
          const [item1, item2] = results;
          item1.name = item2.name;
          return chai.request(app)
            .put(`/api/tags/${item1.id}`)
            .set("Authorization", `Bearer ${token}`)
            .send(item1);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a("object");
          expect(res.body.message).to.equal("Tag name already exists");
        });
    });

  });

  describe("DELETE /api/tags/:id", function () {

    it("should delete an existing document and respond with 204", function () {
      let data;
      return Tag.findOne({ userId: user.id })
        .then(_data => {
          data = _data;
          return chai.request(app)
            .delete(`/api/tags/${data.id}`)
            .set("Authorization", `Bearer ${token}`);
        })
        .then(function (res) {
          expect(res).to.have.status(204);
          expect(res.body).to.be.empty;
          return Tag.count({ _id: data.id });
        })
        .then(count => {
          expect(count).to.equal(0);
        });
    });

    it("should respond with 204 when document does not exist", function () {
      return chai.request(app)
        .delete("/api/tags/DOESNOTEXIST")
        .set("Authorization", `Bearer ${token}`)
        .then((res) => {
          expect(res).to.have.status(204);
        });
    });

  });
});
