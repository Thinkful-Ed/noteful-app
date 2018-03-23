'use strict';

const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: { type: String, /* unique: true */ },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

folderSchema.index({ name: 1, userId: 1 }, { unique: true });

folderSchema.set('toObject', {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

/*
 * BONUS CHALLENGE- Create your own custom static methods
 * Below is the implementation, see the delete endpoint for the invocation
 *
 *  folderSchema.statics.removeById = function(id, callback) {
 *    return this.remove({ _id: id }, callback);
 *  };
 *
 * NOTE: we prefer promises so we will not actually use the callback above
 * The callback parameter is made available for backwards compatability
*/

/** SUPER EXTRA BONUS CHALLENGE
 * Move the cascading delete or cascade set null into the schema
folderSchema.pre('remove', function(next) {
  mongoose.models.Note.remove({folderId: this._id})
    .then(() => next())
    .catch(err => {       next(err);     });
});
*/

module.exports = mongoose.model('Folder', folderSchema);
