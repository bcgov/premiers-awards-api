/*!
 * Nominations: File attachment model
 * File: attachment.nominations.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const NominationModel = require('../models/entry.nominations.model');

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

// hook to include nomination update on save
AttachmentSchema.post('save', async (attachment) => {
    await NominationModel.updateOne(
        {_id: attachment.nomination},
        { $push: { attachments: attachment._id } }
    );
});

// hook to remove nomination attachment on delete
// - see cascade delete issue: https://github.com/Automattic/mongoose/issues/9152
AttachmentSchema.pre('deleteOne', { document: false, query: true }, async function() {
    const attachment = await this.model.findOne(this.getFilter());
    await NominationModel.updateOne(
        {_id: attachment.nomination},
        { $pull: { attachments: { $eq: attachment._id } } }
    );
});

const AttachmentNominationsModel = mongoose.model('Attachment', AttachmentSchema, 'attachments');

module.exports = AttachmentNominationsModel;
