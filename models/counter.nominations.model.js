/*!
 * Nominations: Auto-increment counter
 * File: counter.nominations.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Auto-increment counter schema
 */

const CounterSchema = new Schema({
  _id: {type: String, required: true},
  seq: { type: Number, default: 0 }
});
const CounterNominationsModel = mongoose.model('Counter', CounterSchema, 'counters');

module.exports = CounterNominationsModel;
