'use strict';

const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: { type: String, index: true },
  content: { type: String, index: true },
  created: { type: Date, default: Date.now },
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder' },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

noteSchema.index({ title: 'text', content: 'text' });

noteSchema.set('toObject', {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

/*
 * BONUS CHALLENGE - Create your own custom static methods
 * Below is the implementation, see the delete endpoint for the invocation
 *
 *  noteSchema.statics.removeById = function(id, callback) {
 *    return this.remove({ _id: id }, callback);
 *  };
 *
 * NOTE: we prefer promises so we will not actually use the callback above
 * The callback parameter is made available for backwards compatability
*/

module.exports = mongoose.model('Note', noteSchema);
