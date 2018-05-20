"use strict";

const app = require("../server");
const chai = require("chai");
const chaiHttp = require("chai-http");

const db = require("../db/mongoose");
const { TEST_MONGODB_URI } = require("../config");

const User = require("../models/user");

const expect = chai.expect;

chai.use(chaiHttp);

describe("Noteful API - Users", function () {
  const username = "exampleUser";
  const password = "examplePass";
  const fullname = "Example User";

  before(function () {
    return db.connect(TEST_MONGODB_URI)
      .then(() => db.dropDatabase());
  });

  beforeEach(function () {
    return User.createIndexes();
  });

  afterEach(function () {
    return db.dropDatabase();
  });

  after(function () {
    return db.disconnect();
  });

  describe("POST /api/users", function () {

    it("Should create a new user", function () {
      let res;
      return chai
        .request(app)
        .post("/api/users")
        .send({ username, password, fullname })
        .then(_res => {
          res = _res;
          expect(res).to.have.status(201);
          expect(res.body).to.be.an("object");
          expect(res.body).to.have.all.keys("id", "username", "fullname", "createdAt", "updatedAt");
          expect(res.body.id).to.exist;
          expect(res.body.username).to.equal(username);
          expect(res.body.fullname).to.equal(fullname);
          return User.findOne({ username });
        })
        .then(user => {
          expect(user).to.exist;
          expect(user.id).to.equal(res.body.id);
          expect(user.fullname).to.equal(fullname);
          return user.validatePassword(password);
        })
        .then(isValid => {
          expect(isValid).to.be.true;
        });
    });

    it("Should reject users with missing username", function () {
      return chai
        .request(app)
        .post("/api/users")
        .send({ password, fullname })

        .then(res => {
          expect(res).to.have.status(422);
          expect(res.body.message).to.equal("Missing 'username' in request body");
        });
    });

    it("Should reject users with missing password", function () {
      return chai
        .request(app)
        .post("/api/users")
        .send({ username, fullname })

        .then(res => {
          expect(res).to.have.status(422);
          expect(res.body.message).to.equal("Missing 'password' in request body");
        });

    });

    it("Should reject users with non-string username", function () {
      return chai
        .request(app)
        .post("/api/users")
        .send({ username: 1234, password, fullname })

        .then(res => {
          expect(res).to.have.status(422);
          expect(res.body.message).to.equal("Field: 'username' must be type String");
        });
    });

    it("Should reject users with non-string password", function () {
      return chai
        .request(app)
        .post("/api/users")
        .send({ username, password: 1234, fullname })

        .then(res => {
          expect(res).to.have.status(422);
          expect(res.body.message).to.equal("Field: 'password' must be type String");
        });
    });

    it("Should reject users with non-trimmed username", function () {
      return chai
        .request(app)
        .post("/api/users")
        .send({ username: ` ${username} `, password, fullname })

        .then(res => {
          expect(res).to.have.status(422);
          expect(res.body.message).to.equal("Field: 'username' cannot start or end with whitespace");
        });
    });

    it("Should reject users with non-trimmed password", function () {
      return chai
        .request(app)
        .post("/api/users")
        .send({ username, password: ` ${password}`, fullname })

        .then(res => {
          expect(res).to.have.status(422);
          expect(res.body.message).to.equal("Field: 'password' cannot start or end with whitespace");
        });
    });

    it("Should reject users with empty username", function () {
      return chai
        .request(app)
        .post("/api/users")
        .send({ username: "", password, fullname })

        .then(res => {
          expect(res).to.have.status(422);
          expect(res.body.message).to.equal("Field: 'username' must be at least 1 characters long");
        });
    });

    it("Should reject users with password less than 8 characters", function () {
      return chai
        .request(app)
        .post("/api/users")
        .send({ username, password: "asdfghj", fullname })

        .then(res => {
          expect(res).to.have.status(422);
          expect(res.body.message).to.equal("Field: 'password' must be at least 8 characters long");
        });
    });

    it("Should reject users with password greater than 72 characters", function () {
      return chai
        .request(app)
        .post("/api/users")
        .send({ username, password: new Array(73).fill("a").join(""), fullname })

        .then(res => {
          expect(res).to.have.status(422);
          expect(res.body.message).to.equal("Field: 'password' must be at most 72 characters long");
        });
    });

    it("Should reject users with duplicate username", function () {
      return User
        .create({
          username,
          password,
          fullname
        })
        .then(() => {
          return chai
            .request(app)
            .post("/api/users")
            .send({ username, password, fullname });
        })

        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal("The username already exists");
        });
    });

    it("Should trim fullname", function () {
      return chai
        .request(app)
        .post("/api/users")
        .send({ username, password, fullname: ` ${fullname} ` })
        .then(res => {
          expect(res).to.have.status(201);
          expect(res.body).to.be.an("object");
          expect(res.body).to.have.all.keys("id", "username", "fullname", "createdAt", "updatedAt");
          expect(res.body.fullname).to.equal(fullname);
          return User.findOne({ username });
        })
        .then(user => {
          expect(user).to.not.be.null;
          expect(user.fullname).to.equal(fullname);
        });
    });

  });
});