/*!
 * Nominations: File attachment model
 * File: attachment.nominations.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * File attachment model
 */

const AttachmentSchema = new Schema({
      nomination: {
          type: Schema.Types.ObjectId,
          ref: 'Nomination'
      },
      file            : Object,
      label           : String,
      description     : String
  },
  { timestamps: true }
);

const AttachmentNominationsModel = mongoose.model('Attachment', AttachmentSchema, 'attachments');

module.exports = AttachmentNominationsModel;
