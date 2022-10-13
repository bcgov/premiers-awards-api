/*!
 * Events: Table model
 * File: Table.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Table schema
 */

const TableSchema = new Schema(
  {
    guid: {
      type: String,
      required: true,
      unique: true,
    },
    registrations: [
      {
        type: Schema.Types.ObjectId,
        ref: "Registration",
      },
    ],
    guests: [
      {
        type: Schema.Types.ObjectId,
        ref: "Guest",
      },
    ],
    tablename: {
      type: String,
      required: true,
    },
    tablecapacity: {
      type: Number,
      required: true,
    },
    tabletype: {
      type: String,
      required: true,
    },
    organizations: [{ type: Object }],
  },
  { timestamps: true }
);

const TableEventsModel = mongoose.model("Table", TableSchema, "tables");
module.exports = TableEventsModel;
