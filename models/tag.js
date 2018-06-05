"use strict";

const mongoose = require("mongoose");

const tagSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
});

// Add `createdAt` and `updatedAt` fields
tagSchema.set("timestamps", true);

// Customize output for `res.json(data)`, `console.log(data)` etc.
tagSchema.set("toObject", {
  virtuals: true,     // include built-in virtual `id`
  versionKey: false,  // remove `__v` version key
  transform: function (doc, ret) {
    delete ret._id; // delete `_id`
  }
});

module.exports = mongoose.model("Tag", tagSchema);
