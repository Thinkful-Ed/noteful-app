"use strict";

const express = require("express");
const mongoose = require("mongoose");

const Folder = require("../models/folder");
const Note = require("../models/note");

const router = express.Router();

/* ========== GET/READ ALL ITEMS ========== */
router.get("/", (req, res, next) => {
  const userId = req.user.id;

  Folder.find({ userId })
    .sort("name")
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
  const userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error("The `id` is not valid");
    err.status = 400;
    return next(err);
  }

  Folder.findOne({ _id: id, userId })
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
  const { name } = req.body;
  const userId = req.user.id;

  const newFolder = { name, userId };

  /***** Never trust users - validate input *****/
  if (!name) {
    const err = new Error("Missing `name` in request body");
    err.status = 400;
    return next(err);
  }

  Folder.create(newFolder)
    .then(result => {
      res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error("Folder name already exists");
        err.status = 400;
      }
      next(err);
    });
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put("/:id", (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;
  const userId = req.user.id;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error("The `id` is not valid");
    err.status = 400;
    return next(err);
  }

  if (!name) {
    const err = new Error("Missing `name` in request body");
    err.status = 400;
    return next(err);
  }

  const updateFolder = { name, userId };

  Folder.findByIdAndUpdate(id, updateFolder, { new: true })
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error("Folder name already exists");
        err.status = 400;
      }
      next(err);
    });
});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete("/:id", (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error("The `id` is not valid");
    err.status = 400;
    return next(err);
  }

  const folderRemovePromise = Folder.findOneAndRemove({ _id: id, userId });

  const noteRemovePromise = Note.updateMany(
    { folderId: id, userId },
    { $unset: { folderId: "" } }
  );

  Promise.all([folderRemovePromise, noteRemovePromise])
    .then(() => {
      res.status(204).end();
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;
