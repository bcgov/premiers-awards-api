/*!
 * Global settings db model
 * File: settings.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const SettingsSchema = new Schema({
  type: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  value: {
    type: String,
    required: true
  },
});

const SettingsModel = mongoose.model('Setting', SettingsSchema, 'settings');

module.exports = SettingsModel;
