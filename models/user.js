'use strict';

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// ===== Define UserSchema & UserModel =====
const userSchema = new mongoose.Schema({
  fullname: { type: String, default: '' },
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  }
});

userSchema.set('toObject', {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password;
  }
});

userSchema.pre('save', function (next) {
  const doc = this;

  if (!doc.isModified('password')) {
    return next();
  }

  bcrypt.hash(doc.password, 10)
    .then(digest => {
      doc.password = digest;
      next();
    })
    .catch(err => {
      next(err);
    });
});

userSchema.methods.validatePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

// userSchema.statics.hashPassword = function (password) {
//   return bcrypt.hash(password, 10);
// };

module.exports = mongoose.model('User', userSchema);
