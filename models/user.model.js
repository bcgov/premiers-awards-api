/*!
 * User db model
 * File: user.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * User schema
 */

const UserSchema = new Schema({
    guid: {
      type: String,
      required: true,
      unique: true
    },
    username: {
      type: String,
      required: true,
      unique: true
    },
    firstname: {
      type: String,
    },
    lastname: {
      type: String,
    },
    email: {
      type: String,
    },
    role: {
      type: String,
      enum: ['inactive', 'nominator', 'administrator', 'super-administrator'],
      required: true,
    }
  },
  { timestamps: true });

const UserModel = mongoose.model('User', UserSchema, 'users');
module.exports = UserModel;
