/*!
 * Events: Guest model
 * File: guest.events.model.js
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
    hasexternalorganization: {
      type: Boolean,
    },
    accessibility: {
      type: Array,
    },
    dietary: {
      type: Array,
    },
    table: {
      type: Schema.Types.ObjectId,
      ref: "Table",
    },
    notes: {
      type: String,
    },
    pronouns: {
      type: Array,
    },
    hascustompronouns: {
      type: Boolean,
    },
    custompronouns: {
      type: String,
    },
    supportingfinalist: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const GuestEventsModel = mongoose.model("Guest", GuestSchema, "guests");
module.exports = GuestEventsModel;
