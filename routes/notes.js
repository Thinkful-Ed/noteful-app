"use strict";

const express = require("express");
const mongoose = require("mongoose");

const Note = require("../models/note");
const Folder = require("../models/folder");
const Tag = require("../models/tag");

const router = express.Router();

function validateFolderId(folderId) {
  if (folderId === undefined) {
    return Promise.resolve();
  }
  if (!mongoose.Types.ObjectId.isValid(folderId)) {
    const err = new Error("The `folderId` is not valid");
    err.status = 400;
    return Promise.reject(err);
  }
  return Folder.count({ _id: folderId })
    .then(count => {
      if (count === 0) {
        const err = new Error("The `folderId` is not valid");
        err.status = 400;
        return Promise.reject(err);
      }
    });
}

function validateTagIds(tags) {
  if (tags === undefined) {
    return Promise.resolve();
  }
  if (!Array.isArray(tags)) {
    const err = new Error("The `tags` must be an array");
    err.status = 400;
    return Promise.reject(err);
  }
  return Tag.find({ $and: [{ _id: { $in: tags } }] })
    .then(results => {
      if (tags.length !== results.length) {
        const err = new Error("The `tags` contains an non existent id");
        err.status = 400;
        return Promise.reject(err);
      }
    });
}

/* ========== GET/READ ALL ITEMS ========== */
router.get("/", (req, res, next) => {
  const { searchTerm, folderId, tagId } = req.query;

  let filter = {};

  if (searchTerm) {
    // filter.title = { $regex: searchTerm };
    filter.$or = [{ "title": { $regex: searchTerm } }, { "content": { $regex: searchTerm } }];
  }

  if (folderId) {
    filter.folderId = folderId;
  }

  if (tagId) {
    filter.tags = tagId;
  }

  Note.find(filter)
    .populate("tags")
    .sort({ "updatedAt": "desc" })
    .then(results => {
      res.json(results);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get("/:id", (req, res, next) => {
  const { id } = req.params;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error("The `id` is not valid");
    err.status = 400;
    return next(err);
  }

  Note.findById(id)
    .populate("tags")
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== POST/CREATE AN ITEM ========== */
router.post("/", (req, res, next) => {
  const { title, content, folderId, tags } = req.body;

  const newNote = { title, content, folderId, tags };

  /***** Never trust users - validate input *****/
  if (!title) {
    const err = new Error("Missing `title` in request body");
    err.status = 400;
    return next(err);
  }

  Promise.all([
    validateFolderId(folderId),
    validateTagIds(tags)
  ])
    .then(() => Note.create(newNote))
    .then(result => {
      res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
    })
    .catch(err => {
      if (err === "InvalidFolder") {
        err = new Error("The folder is not valid");
        err.status = 400;
      }
      if (err === "InvalidTag") {
        err = new Error("The tag is not valid");
        err.status = 400;
      }
      next(err);
    });
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put("/:id", (req, res, next) => {
  const { id } = req.params;
  const { title, content, folderId, tags } = req.body;
  const updateNote = { title, content, folderId, tags };

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error("The `id` is not valid");
    err.status = 400;
    return next(err);
  }

  if (!title) {
    const err = new Error("Missing `title` in request body");
    err.status = 400;
    return next(err);
  }

  if (mongoose.Types.ObjectId.isValid(folderId)) {
    updateNote.folderId = folderId;
  }

  Promise.all([
    validateFolderId(folderId),
    validateTagIds(tags)
  ])
    .then(() => {
      return Note.findByIdAndUpdate(id, updateNote, { new: true })
        .populate("tags");
    })
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      if (err === "InvalidFolder") {
        err = new Error("The folder is not valid");
        err.status = 400;
      }
      if (err === "InvalidTag") {
        err = new Error("The tag is not valid");
        err.status = 400;
      }
      next(err);
    });
});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete("/:id", (req, res, next) => {
  const { id } = req.params;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error("The `id` is not valid");
    err.status = 400;
    return next(err);
  }

  Note.findByIdAndRemove(id)
    .then(() => {
      res.status(204).end();
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;