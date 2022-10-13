/*!
 * Nominations: Nomination entry controller
 * File: entries.nominations.controller.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const NominationModel = require('../models/entry.nominations.model');
const AttachmentModel = require('../models/attachment.nominations.model');
const counter = require('../models/counter.nominations.model');
const { fileExists, createZIP, createCSV, createZIPPackage} = require('../services/files.services');
const { generateNominationPDF } = require('../services/pdf.services');
const { Readable } = require('stream');
const {validateYear} = require('../services/validation.services')

// limit number of draft nomination submissions
const maxNumberOfDrafts = 10;

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
    const { id=null } = req.params || {};
    const nomination = await NominationModel.findById(id);
    return res.status(200).json(nomination);
  } catch (err) {
    console.error(err)
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
    const nominations = await NominationModel.find({});
    return res.status(200).json(nominations);
  } catch (err) {
    console.error(err)
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
    const { guid=null } = req.params || {};
    // retrieve nominations for GUID
    const nominations = await NominationModel.find({guid: guid});
    return res.status(200).json(nominations);
  } catch (err) {
    console.error(err)
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
      let data = req.body;
      const { guid='' } = data || {};

      // check if user is at limit for number of drafts
      const currentNominations = await NominationModel.find({guid: guid, submitted: false});
      if (currentNominations.length > maxNumberOfDrafts)
        return next(new Error('maxDraftsExceeded'));

      /**
       * Auto-increment nomination sequence number on save
       */
      const result = await counter.findByIdAndUpdate(
        {_id: 'nominationId'},
        { $inc: { seq: 1} },
        { upsert: true }
      );
      data.seq = result.seq;

      // insert new record into collection
      const nomination = await NominationModel.create(data);
      const { id=null } = nomination || {};

      // check that nomination exists
      if (!id)
        return next(new Error('noRecord'));

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
    if (!nomination)
      return next(Error('invalidInput'));

    // reject updates to submitted nominations
    if (nomination.submitted)
      return next(Error('alreadySubmitted'));

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
    let data = req.body;
    const { year='' } = data || {};

    // look up nomination exists
    const nomination = await NominationModel.findById(id);
    if ( !nomination || !year || !validateYear(year) )
      return next(new Error('invalidInput'));

    // reject updates to submitted nominations
    if (nomination.submitted)
      return next(Error('alreadySubmitted'));

    // lookup attachments
    data.attachments = await AttachmentModel.find({nomination: id});

    // generate downloadable PDF version
    const packagePath = await generateNominationPDF(data, next);
    if (!packagePath)
      return next(Error('PDFCorrupted'));
    console.log('(After) Updated File Path:', data.filePath);
    data.filePath = packagePath;

    // update submission status
    data.submitted = true;

    // submit nomination document as completed
    await NominationModel.updateOne({ _id: id }, data);

    res.status(200).json(data);

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
    if (!nomination)
      return next(new Error('invalidInput'));

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
    if (!nomination)
      return next(Error('noRecord'));

    const response = await NominationModel.deleteOne({_id: id})

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

    // get requested format type
    let { format='pdf' } = req.params || [];

    // retrieve nomination IDs
    let { ids = [], year='' } = req.body || [];

    if (!validateYear(year)) return next(Error('invalidInput'));

    // ensure nominations IDs are valid
    const nominations = await NominationModel.find({'_id': { $in: ids }});
    if ( nominations.length !== ids.length )
      return next(new Error('InvalidInput'));

    // handle exporting for requested format
    // - generate zipped archive of retrieved data
    //  - PDF
    //  - CSV
    //  - ZIP
    const exportHandlers = {
      pdf: async () => {
        // bundle PDF versions in compressed folder
        const zipRoot = 'nomination_package';
        const zipEntries = nominations.map(nomination => {
          const { filePath='' } = nomination || {};
          return filePath;
        });
        return await createZIP(zipEntries, zipRoot);
      },
      csv: async () => {
        // convert JSON to CSV data format
        return await createCSV(nominations);
      },
      zip: async () => {
        // bundle PDF versions in compressed folder
        // - Note: single nomination sent to zipped packager
        return await createZIPPackage(nominations[0]);
      }
    }
    const data = exportHandlers.hasOwnProperty(format)
      ? await exportHandlers[format]()
      : null;

    // create data stream and pipe to response
    res.on('error', (err) => {
      console.error('Error in write stream:', err);
    });
    let rs = new Readable();
    rs._read = () => {}; // may be redundant
    rs.pipe(res);
    rs.on('error',function(err) {
      console.error(err)
      res.status(404).end();
    });
    rs.on('error',function(err) {
      console.error(err)
      res.status(404).end();
    });
    rs.push(data);
    rs.push(null);

  } catch (err) {
    console.error(err)
    return next(err);
  }
};

/**
 * Download nomination package as file.
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
    if (!await fileExists(filePath))
      return next(new Error('MissingFile'));

    res.download(filePath, 'download.pdf', function (err) {
      if (err) {
        console.error(err)
        // Handle error, but keep in mind the response may be partially-sent
        // so check res.headersSent
      } else {
        console.log(`Download for ${filePath} successful.`)
      }
    });

  } catch (err) {
    console.error(err)
    return next(err);
  }
};

