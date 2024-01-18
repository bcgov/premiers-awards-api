/*!
 * Nominations: Nomination entry controller
 * File: entries.nominations.controller.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const UserModel = require("../models/user.admin.model");
const NominationModel = require("../models/entry.nominations.model");
const AttachmentModel = require("../models/attachment.nominations.model");
const counter = require("../models/counter.nominations.model");
const {
  fileExists,
  createCSV,
  createNominationPackage,
} = require("../services/files.services");
const { generateNominationPDF } = require("../services/pdf.services");
const { Readable } = require("stream");
const { checkCategory } = require("../services/schema.services");
const mongoose = require("mongoose");
const settings = require("../services/schema.services");
const fs = require("fs");

// limit number of draft nomination submissions
const maxNumberOfDrafts = settings.get("maxDrafts");

/**
 * Get nomination data by ID.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.get = async (req, res, next) => {
  try {
    const { id = null } = req.params || {};
    const nomination = await NominationModel.findById(id)
      .populate("attachments")
      .populate("owner");
    return res.status(200).json(nomination);
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

/**
 * Retrieve all nomination data.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.getAll = async (req, res, next) => {
  try {
    const nominations = await NominationModel.find({})
      .populate("attachments")
      .populate("owner");
    return res.status(200).json(nominations);
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

/**
 * Get nomination data for user.
 * - assumes authorization middleware
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.getByUserID = async (req, res, next) => {
  try {
    const { guid = null } = req.params || {};
    // retrieve nominations for GUID
    const nominations = await NominationModel.find({ guid: guid })
      .populate("attachments")
      .populate("owner");
    return res.status(200).json(nominations);
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

/**
 * Create new nomination
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.create = async (req, res, next) => {
  try {
    // retrieve category
    const { category = null } = req.params || {};
    if (!checkCategory(category)) return next(new Error("notFound"));

    // retrieve guid and lookup user
    const { guid = null } = res.locals.user || "";
    const user = await UserModel.findOne({ guid: guid });
    if (!user) return next(new Error("noAuth"));

    // check if user is at limit for number of drafts
    const currentNominations =
      (await NominationModel.find({ guid: guid })) || [];
    if (currentNominations.length >= maxNumberOfDrafts)
      return next(new Error("maxDraftsExceeded"));

    // init nomination
    const data = {
      owner: user._id,
      guid: guid,
      category: category,
      submitted: false,
    };

    /**
     * Auto-increment nomination sequence number on save
     */
    const result = await counter.findByIdAndUpdate(
      { _id: "nominationId" },
      { $inc: { seq: 1 } },
      { upsert: true }
    );
    data.seq = result.seq;

    // insert new record into collection
    const nomination = await NominationModel.create(data);
    const { id = null } = nomination || {};

    // check that nomination exists
    if (!id) return next(new Error("noRecord"));

    res.status(200).json(nomination);
  } catch (err) {
    return next(err);
  }
};

/**
 * Save draft nomination edits
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

    // look up nomination exists
    const nomination = await NominationModel.findById(id);
    if (!nomination) return next(Error("invalidInput"));

    console.log(data);

    // reject updates to submitted nominations
    const { submitted = false } = nomination || {};
    if (submitted) return next(Error("alreadySubmitted"));

    // mark as saved draft
    data.saved = true;

    // update existing nomination in collection
    const response = await NominationModel.updateOne({ _id: id }, data);
    res.status(200).json(response);
  } catch (err) {
    return next(err);
  }
};

/**
 * Submit nomination as completed
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.submit = async (req, res, next) => {
  try {
    let id = req.params.id;

    // look up nomination exists
    const nomination = await NominationModel.findById(id);
    if (!nomination) return next(new Error("invalidInput"));

    // reject updates to submitted nominations
    const { submitted = false } = nomination || {};
    if (submitted) return next(Error("alreadySubmitted"));

    // lookup attachments
    nomination.attachments = await AttachmentModel.find({ nomination: id });

    // generate downloadable PDF version
    const [mergedPath = "", nominationPath = ""] = await generateNominationPDF(
      nomination,
      next
    );
    if (!nominationPath) return next(Error("PDFCorrupted"));

    // set file paths for merged and nomination PDFs
    nomination.filePaths = {
      nomination: nominationPath,
      merged: mergedPath,
    };

    // update submission status
    nomination.submitted = true;

    // submit nomination document as completed
    await NominationModel.updateOne({ _id: id }, nomination);

    res.status(200).json(nomination);
  } catch (err) {
    return next(err);
  }
};

/**
 * Revert submitted nomination to draft
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.unsubmit = async (req, res, next) => {
  try {
    let id = req.params.id;

    // look up nomination exists
    const nomination = await NominationModel.findById(id);
    if (!nomination) return next(new Error("invalidInput"));

    // update submission status
    const data = { submitted: false };

    // update nomination document
    await NominationModel.updateOne({ _id: id }, data);

    res.status(200).json(data);
  } catch (err) {
    return next(err);
  }
};

/**
 * Remove nomination
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

    // look up nomination
    const nomination = await NominationModel.findById(id);
    if (!nomination) return next(Error("noRecord"));

    const response = await NominationModel.deleteOne({ _id: id });

    res.status(200).json(response);
  } catch (err) {
    return next(err);
  }
};

/**
 * Export nomination data + attachments as compressed archive.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.exporter = async (req, res, next) => {
  try {
    // Creating a zip can take some time, prevents timeout
    req.setTimeout(150000);
    // get requested format type
    let { format = "" } = req.params || {};

    // retrieve nomination IDs
    let { ids = "[]" } = req.query || {};
    // convert ID strings to BSON
    ids = JSON.parse(ids).map((id) => {
      return mongoose.Types.ObjectId(id);
    });

    // retrieve nominations data and validate
    const nominations = await NominationModel.find({ _id: { $in: ids } });
    if (!Array.isArray(ids) || nominations.length !== ids.length)
      return next(new Error("InvalidInput"));

    // handle export for requested format
    //  - ZIP Nomination package(s) (generates zipped archive of nomination files)
    //  - CSV formatted data
    const exportHandlers = {
      zip: async () => {
        // return nomination packages in compressed folder
        return await createNominationPackage(nominations);
      },
      csv: async () => {
        // convert JSON to CSV data format
        return await createCSV(nominations);
      },
    };
    const data = exportHandlers.hasOwnProperty(format)
      ? await exportHandlers[format]()
      : null;
    if (!data) {
      console.log("[DEBUG]: No data from export handler.");
      return next(new Error("InvalidInput"));
    }

    if (typeof data === "string" || data instanceof String) {
      if (fileExists(data)) {
        res.download(data);
      }
    } else {
      // create data stream and pipe to response
      res.on("error", (err) => {
        console.error("Error in write stream:", err);
      });
      let rs = new Readable();
      rs._read = () => {}; // may be redundant
      rs.pipe(res);
      rs.on("error", function (err) {
        console.error(err);
        res.status(404).end();
      });
      rs.on("error", function (err) {
        console.error(err);
        res.status(404).end();
      });
      rs.push(data);
      rs.push(null);
    }
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

/**
 * Download file.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.download = async (req, res, next) => {
  try {
    let filePath = req.params.file || [];

    // check that file exists
    if (!(await fileExists(filePath))) return next(new Error("MissingFile"));

    res.download(filePath, "download.pdf", function (err) {
      if (err) {
        console.error(err);
        // Handle error, but keep in mind the response may be partially-sent
        // so check res.headersSent
      } else {
        console.log(`Download for ${filePath} successful.`);
      }
    });
  } catch (err) {
    console.error(err);
    return next(err);
  }
};
