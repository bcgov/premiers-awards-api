/*!
 * Events: Auto-increment counter
 * File: counter.events.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Auto-increment counter schema
 */

const TableCounter = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
  alpha: [{ type: String }],
});
const CounterEventsModel = mongoose.model(
  "TableCounter",
  TableCounter,
  "tablecounters"
);

module.exports = CounterEventsModel;
