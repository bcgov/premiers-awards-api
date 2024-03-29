/*!
 * Events: Registration model
 * File: registration.events.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Registration Schema
 */

const RegistrationSchema = new Schema(
  {
    guid: {
      type: String,
    },
    registrar: {
      type: String,
    },
    users: {
      type: Array,
    },
    guests: [
      {
        type: Schema.Types.ObjectId,
        ref: "Guest",
      },
    ],
    organization: {
      type: String,
    },
    branch: {
      type: String,
    },
    primarycontact: {
      type: String,
    },
    primaryemail: {
      type: String,
    },
    financialcontact: {
      type: String,
    },
    clientministry: {
      type: String,
    },
    respcode: {
      type: String,
    },
    serviceline: {
      type: String,
    },
    stob: {
      type: String,
    },
    project: {
      type: String,
    },
    submitted: {
      type: Boolean,
    },
    table: {
      type: Schema.Types.ObjectId,
      ref: "Table",
    },
  },
  { timestamps: true }
);

const RegistrationEventsModel = mongoose.model(
  "Registration",
  RegistrationSchema,
  "registrations"
);
module.exports = RegistrationEventsModel;
