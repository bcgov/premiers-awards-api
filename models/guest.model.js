/*!
 * Guest db model
 * File: guest.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Guest schema
 */

const GuestSchema = new Schema(
  {
    guid: {
      type: String,
      required: true,
      unique: true,
    },
    registration: {
      type: Schema.Types.ObjectId,
      ref: "Registration",
    },
    firstname: {
      type: String,
      required: true,
    },
    lastname: {
      type: String,
      required: true,
    },
    attendancetype: {
      type: String,
      required: true,
    },
    organization: {
      type: String,
      required: true,
    },
    accessibility: {
      type: Array,
    },
    dietary: {
      type: Array,
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

const GuestModel = mongoose.model("Guest", GuestSchema, "guests");
module.exports = GuestModel;
