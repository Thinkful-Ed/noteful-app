"use strict";

require("dotenv").config();

const express = require("express");
const morgan = require("morgan");

const db = require("./db/mongoose");
const { PORT } = require("./config");
const jwtAuth = require("./middleware/jwt-auth");

const notesRouter = require("./routes/notes");
const foldersRouter = require("./routes/folders");
const tagsRouter = require("./routes/tags");
const usersRouter = require("./routes/users");
const authRouter = require("./routes/auth");

// Create an Express application
const app = express();

// Log all requests. Skip logging during
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "common", {
  skip: () => process.env.NODE_ENV === "test"
}));

// Create a static webserver
app.use(express.static("public"));

// Parse request body
app.use(express.json());

// Public Routers
app.use("/api", authRouter);
app.use("/api/users", usersRouter);

// Protected Routers
app.use("/api/notes", jwtAuth, notesRouter);
app.use("/api/folders", jwtAuth, foldersRouter);
app.use("/api/tags", jwtAuth, tagsRouter);

// Custom 404 Not Found route handler
app.use((req, res, next) => {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// Custom Error Handler
app.use((err, req, res, next) => {
  if (err.status) {
    const errBody = Object.assign({}, err, { message: err.message });
    res.status(err.status).json(errBody);
  } else {
    res.status(500).json({ message: "Internal Server Error" });
    console.error(err);
  }
});

// Listen for incoming connections
if (process.env.NODE_ENV !== "test") {
  db.connect();

  app.listen(PORT, function () {
    console.info(`Server listening on ${this.address().port}`);
  }).on("error", err => {
    console.error(err);
  });
}

module.exports = app; // Export for testing
