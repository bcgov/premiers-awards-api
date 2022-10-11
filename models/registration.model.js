/*!
 * Registration db model
 * File: registration.model.js
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
      type: Number,
    },
    respcode: {
      type: String,
    },
    serviceline: {
      type: Number,
    },
    stob: {
      type: Number,
    },
    project: {
      type: String,
    },
    submitted: {
      type: Boolean,
    },
  },
  { timestamps: true }
);

const RegistrationModel = mongoose.model(
  "Registration",
  RegistrationSchema,
  "registrations"
);
module.exports = RegistrationModel;
