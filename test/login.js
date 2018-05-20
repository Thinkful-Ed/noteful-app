"use strict";

const app = require("../server");
const chai = require("chai");
const chaiHttp = require("chai-http");
const jwt = require("jsonwebtoken");

const db = require("../db/mongoose");
const { TEST_MONGODB_URI, JWT_SECRET } = require("../config");

const User = require("../models/user");

const expect = chai.expect;
chai.use(chaiHttp);

describe("Noteful API - Login", function () {

  let user;
  const fullname = "Example User";
  const username = "exampleUser";
  const password = "examplePass";

  before(function () {
    return db.connect(TEST_MONGODB_URI)
      .then(() => db.dropDatabase());
  });

  beforeEach(function () {
    return User.hashPassword(password)
      .then(digest => User.create({
        fullname,
        username,
        password: digest
      }))
      .then(_user => {
        user = _user;
      });
  });

  afterEach(function () {
    return db.dropDatabase();
  });

  after(function () {
    return db.disconnect();
  });

  describe("Noteful /api/login", function () {

    it("Should return a 400 Error 'No credential provided' when no credentials are sent", function () {
      return chai.request(app)
        .post("/api/login")
        .send({})
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal("No credentials provided");
        });
    });

    it("Should return 401 error 'Invalid credentials' at 'username' when sent an invalid 'username'", function () {
      return chai.request(app)
        .post("/api/login")
        .send({ username: "wrongUsername", password })
        .then(res => {
          expect(res).to.have.status(401);
          expect(res.body.message).to.equal("Invalid credentials");
          expect(res.body.location).to.equal("username");
        });
    });

    it("Should return 401 error 'Invalid credentials' at 'password' when sent an invalid 'password'", function () {
      return chai.request(app)
        .post("/api/login")
        .send({ username, password: "wrongPassword" })
        .then(res => {
          expect(res).to.have.status(401);
          expect(res.body.message).to.equal("Invalid credentials");
          expect(res.body.location).to.equal("password");
        });
    });

    context("When sent a valid username and password", function () {

      it("Should return 200 OK with a valid JWT in 'authToken'", function () {
        return chai.request(app)
          .post("/api/login")
          .send({ username, password })
          .then(res => {
            expect(res).to.have.status(200);
            expect(res.body).to.be.an("object");
            expect(res.body.authToken).to.be.a("string");
            jwt.verify(res.body.authToken, JWT_SECRET);
          });
      });

      it("Should return a valid JWT with correct 'id', 'username' and 'fullname'", function () {
        return chai.request(app)
          .post("/api/login")
          .send({ username, password })
          .then(res => {
            const payload = jwt.verify(res.body.authToken, JWT_SECRET);
            expect(payload.user.id).to.equal(user.id);
            expect(payload.user.username).to.equal(username);
            expect(payload.user.fullname).to.equal(fullname);
          });
      });

      it("Should return a JWT that does not NOT contains a password", function () {
        return chai.request(app)
          .post("/api/login")
          .send({ username, password })
          .then(res => {
            const payload = jwt.verify(res.body.authToken, JWT_SECRET);
            expect(payload.user).to.not.have.property("password");
          });
      });
    });
  });

  describe("POST /api/refresh", function () {
    it("Should reject requests when no 'Authorization' header is sent", function () {
      return chai.request(app)
        .post("/api/refresh")
        .then(res => {
          expect(res).to.have.status(401);
          expect(res.body.message).to.equal("No 'Authorization' header found");
        });
    });

    it("Should reject request when 'Authorization' token type is NOT 'Bearer'", function () {
      const token = jwt.sign({ user }, JWT_SECRET, { subject: username, expiresIn: "1m" });

      return chai.request(app)
        .post("/api/refresh")
        .set("Authorization", `FooBar ${token}`)
        .then(res => {
          expect(res).to.have.status(401);
          expect(res.body.message).to.equal("No 'Bearer' token found");
        });
    });


    it("Should reject request when 'Authorization' with 'Bearer' type does NOT contain a token", function () {
      return chai.request(app)
        .post("/api/refresh")
        .set("Authorization", "Bearer  ")
        .then(res => {
          expect(res).to.have.status(401);
          expect(res.body.message).to.equal("No 'Bearer' token found");
        });
    });


    it("Should reject request when JWT is signed with the WRONG secret key", function () {
      const user = { username, fullname };
      const token = jwt.sign({ user }, "INVALID", { subject: username, expiresIn: "1m" });

      return chai.request(app)
        .post("/api/refresh")
        .set("Authorization", `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(401);
          expect(res.body.message).to.equal("Invalid JWT");
        });
    });



    it("Should reject request when JWT 'expiresIn' data has EXPIRED", function () {
      const user = { username, fullname };
      const token = jwt.sign({ user }, JWT_SECRET, { subject: username, expiresIn: "0" });

      return chai.request(app)
        .post("/api/refresh")
        .set("Authorization", `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(401);
          expect(res.body.message).to.equal("Invalid JWT");
        });
    });


    context("When sent 'Authorization' header contains a valid JWT 'Bearer' token", function () {

      it("Should return 200 OK and a object with a 'authToken' property and a valid JWT", function () {
        const token = jwt.sign({ user }, JWT_SECRET, { subject: username, expiresIn: "1m" });
        return chai.request(app)
          .post("/api/refresh")
          .set("Authorization", `Bearer ${token}`)
          .then(res => {
            expect(res).to.have.status(200);
            expect(res.body).to.be.an("object");
            expect(res.body.authToken).to.be.a("string");
            jwt.verify(res.body.authToken, JWT_SECRET);
          });
      });

      it("Should return a valid JWT with correct 'id', 'username' and 'fullname'", function () {
        const token = jwt.sign({ user }, JWT_SECRET, { subject: username, expiresIn: "1m" });
        return chai.request(app)
          .post("/api/refresh")
          .set("Authorization", `Bearer ${token}`)
          .then(res => {
            const payload = jwt.verify(res.body.authToken, JWT_SECRET);
            expect(payload.user.username).to.equal(username);
            expect(payload.user.fullname).to.equal(fullname);
          });
      });

      it("Should return a JWT that does not NOT contains a password", function () {
        const token = jwt.sign({ user }, JWT_SECRET, { subject: username, expiresIn: "1m" });
        return chai.request(app)
          .post("/api/refresh")
          .set("Authorization", `Bearer ${token}`)
          .then(res => {
            const payload = jwt.verify(res.body.authToken, JWT_SECRET);
            expect(payload.user).to.not.have.property("password");
          });
      });

      it("Should return a valid JWT with a newer 'expiresIn' date", function () {
        const token = jwt.sign({ user }, JWT_SECRET, { subject: username, expiresIn: "1m" });
        const decoded = jwt.decode(token);

        return chai.request(app)
          .post("/api/refresh")
          .set("Authorization", `Bearer ${token}`)
          .then(res => {
            const payload = jwt.verify(res.body.authToken, JWT_SECRET);
            expect(payload.exp).to.be.greaterThan(decoded.exp);
          });
      });

    });
  });

});