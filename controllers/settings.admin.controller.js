/*!
 * Admin: Global settings controller
 * File: settings.admin.controller.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const SettingsModel = require("../models/settings.admin.model");
const NominationModel = require("../models/entry.nominations.model");
const AttachmentModel = require("../models/attachment.nominations.model");

const { generateNominationPDF } = require("../services/pdf.services");

/**
 * Get global settings.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.get = async (req, res, next) => {
  try {
    let id = req.params.id;
    const setting = await SettingsModel.findById(id);
    return res.status(200).json(setting);
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

/**
 * Get global settings.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.getAll = async (req, res, next) => {
  try {
    const setting = await SettingsModel.find({});
    return res.status(200).json(setting);
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

/**
 * Get settings data for requested type.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.getByType = async (req, res, next) => {
  try {
    const { type = null } = req.params || {};
    // retrieve settings for given type
    const settings = await SettingsModel.find({ type: type });
    return res.status(200).json(settings);
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

/**
 * Create new setting
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.create = async (req, res, next) => {
  try {
    let data = req.body;

    // check if input data is valid
    const { label = "", type = "", value = "" } = data || {};
    if (!type || !value) return next(new Error("invalidInput"));

    // check if setting already exists in collection
    const current = await SettingsModel.findOne({ type, label, value });
    if (current) return next(new Error("recordExists"));

    // insert new record into collection
    const setting = await SettingsModel.create(data);
    res.status(200).json(setting);
  } catch (err) {
    return next(err);
  }
};

/**
 * Update setting
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.update = async (req, res, next) => {
  try {
    let id = req.params.id;
    let data = req.body;

    // update setting
    const response = await SettingsModel.findOneAndUpdate({ _id: id }, data);
    res.status(200).json(response);
  } catch (err) {
    return next(err);
  }
};

/**
 * Remove setting
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

    // look up setting
    const setting = await SettingsModel.findById(id);
    if (!setting) return next(Error("noRecord"));

    const response = await SettingsModel.deleteOne({ _id: id });

    res.status(200).json(response);
  } catch (err) {
    return next(err);
  }
};

/**
 * Regenerate all nomination and merged nomination PDFs, keeping timestamps intact
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.regenerateNominationPDFs = async (req, res, next) => {
  try {
    // look up setting
    const nominations = await NominationModel.find({})
      .populate("attachments")
      .populate("owner");

    for (let nomination of nominations) {
      if (nomination.submitted) {
        let id = nomination.id;
        if (!nomination) return next(new Error("invalidInput"));

        // lookup attachments
        nomination.attachments = await AttachmentModel.find({
          nomination: id,
        });

        // generate downloadable PDF version
        const [mergedPath = "", nominationPath = ""] =
          await generateNominationPDF(nomination, next);
        if (!nominationPath) return next(Error("PDFCorrupted"));

        // set file paths for merged and nomination PDFs
        nomination.filePaths = {
          nomination: nominationPath,
          merged: mergedPath,
        };

        // submit nomination document as completed
        await NominationModel.updateOne({ _id: id }, nomination, {
          timestamps: false,
        });
      }
    }

    res.status(200);
  } catch (err) {
    return next(err);
  }
};

exports.deleteallnominations = async (req, res, next) => {
  try {
    // look up setting
    const response = await NominationModel.deleteMany({});
    if (!response) return next(Error("default"));
    res.status(200).json(response);
  } catch (err) {
    return next(err);
  }
