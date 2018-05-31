"use strict";

const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: String,
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: "Folder" },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag" }]
});

noteSchema.set("timestamps", true);

noteSchema.set("toObject", {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model("Note", noteSchema);
