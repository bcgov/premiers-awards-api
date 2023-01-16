/*!
 * Nominations: File attachments controller
 * File: attachments.nominations.controller.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const AttachmentModel = require('../models/attachment.nominations.model');
const NominationModel = require('../models/entry.nominations.model');
const {deleteFile} = require('../services/files.services');

const maxAttachments = 5;

/**
 * Get attachments by nomination.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.getByNomination = async (req, res, next) => {
  try {
    const { id=null } = req.params || {};
    const attachments = await AttachmentModel.find({ nomination: id });
    return res.status(200).json(attachments);
  } catch (err) {
    return next(err);
  }
};

/**
 * Upload attachment files
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.upload = async (req, res, next) => {

  try {
    let id = req.params.id;
    let { label='', description='' } = req.body;
    const {file={}} = req;

    // get existing nomination
    // const currentAttachmentIDs = await AttachmentModel.find({ nomination: id }).distinct('_id');
    const nomination = await NominationModel.findById(id);

    // reject updates to submitted nominations
    const { submitted=false } = nomination || {}
    if (submitted) return next(Error('alreadySubmitted'));

    // check number of attachments not exceeded
    if (nomination.attachments.length > maxAttachments) return next(Error('maxAttachmentsExceeded'));

    // update attachment metadata
    // - file object includes multer metadata
    const attachmentData = {
        nomination: id,
        file: file,
        label: label || '',
        description: description || '',
      };

    // create attachment document in collection
    const response = await AttachmentModel.create(attachmentData);

    res.status(200).json(response);

  } catch (err) {
    return next(err);
  }
};

/**
 * Update attachment metadata
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.update = async (req, res, next) => {

  try {
    let id = req.params.id;
    let { nomination='', label='', description='' } = req.body;

    // get existing nomination
    // const currentAttachmentIDs = await AttachmentModel.find({ nomination: id }).distinct('_id');
    const nom = await NominationModel.findById(nomination);

    // reject updates to submitted nominations
    const { submitted=false } = nom || {}
    if (submitted) return next(Error('alreadySubmitted'));

    // update attachment metadata
    const attachmentData = {
      label: label || '',
      description: description || '',
    };

    // create attachment document in collection
    const response = await AttachmentModel.findByIdAndUpdate(id, attachmentData);

    res.status(200).json(response);

  } catch (err) {
    return next(err);
  }
};

/**
 * Download requested attachment file
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.download = async (req, res, next) => {
  try {

    // get requested attachment ID
    let id = req.params.id;

    // look up attachment
    const attachment = await AttachmentModel.findById(id);
    if (!attachment) return next(Error('noRecord'));

    // retrieve attachment file for download
    const { file={} } = attachment || {};
    const { path = '' } = file || {};
    res.download(path);

  } catch (err) {
    return next(err);
  }
};

/**
 * Delete requested attachment file
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.delete = async (req, res, next) => {
  try {

    // get requested nomination ID
    let id = req.params.id;

    // look up attachment
    const attachment = await AttachmentModel.findById(id);
    if (!attachment) return next(Error('noRecord'));

    // delete attachment
    const response = await AttachmentModel.deleteOne({_id: id});
    // delete attachment file
    const { file={} } = attachment || {};
    const { path = '' } = file || {};
    await deleteFile(path);

    res.status(200).json(response);

  } catch (err) {
    return next(err);
  }
};
