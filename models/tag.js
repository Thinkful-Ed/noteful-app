'use strict';

const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  name: { type: String, /*unique: true */ },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

tagSchema.index({ name: 1, userId: 1 }, { unique: true });

tagSchema.set('toObject', {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

/** GOING PRO CHALLENGE- Move the cascading delete from the endpoint into the schema
tagSchema.pre('remove', function(next) {
  mongoose.models.Note.remove({tag: this._id})
    .then(() => {
      next();
    })
    .catch(err => {
      next(err);
    });
});
*/

module.exports = mongoose.model('Tag', tagSchema);
