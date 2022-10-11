/*!
 * Nomination attachments controller
 * File: attachments.nominations.controller.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const AttachmentModel = require('../models/attachment.model');
const NominationModel = require('../models/nomination.model');
const {deleteFile} = require('../services/files.services')

/**
 * Get attachments by nomination Id.
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
    console.error(err)
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
    let metadata = req.body;
    const { files=[] } = req || {};

    // get existing attachments for nomination
    // const currentAttachmentIDs = await AttachmentModel.find({ nomination: id }).distinct('_id');

    // reject updates to submitted nominations
    const nomination = await NominationModel.findById(id);
    if (nomination.submitted)
      return next(Error('alreadySubmitted'));

    // update attachment metadata
    // - file object includes multer metadata
    const attachmentData = files.map((file, index) => {
      return {
        nomination: id,
        file: file,
        label: Array.isArray(metadata.label) ? metadata.label[index] : metadata.label || '',
        description: Array.isArray(metadata.description) ? metadata.description[index] : metadata.description || '',
      }
    });

    // update existing attachment document in collection
    const response = await Promise.all(
      attachmentData.map(attachment => {
        // create new attachment if no ID
        return (!attachment._id)
          ? AttachmentModel.create(attachment)
          : AttachmentModel.findByIdAndUpdate(attachment._id, attachment)
      }))

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

    // get requested nomination ID
    let id = req.params.id;

    // look up attachment
    const attachment = await AttachmentModel.findById(id);
    if (!attachment)
      return next(Error('noRecord'));

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
    if (!attachment)
      return next(Error('noRecord'));

    // delete attachment
    const response = await AttachmentModel.deleteOne({_id: id});
    // delete attachment file
    const { file={} } = attachment || {};
    const { path = '' } = file || {};
    console.log('Delete', attachment)
    await deleteFile(path);

    res.status(200).json(response);

  } catch (err) {
    return next(err);
  }
};
