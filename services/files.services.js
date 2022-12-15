/*!
 * File processing services
 * File: files.services.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const fs = require('fs');
const { promises: Fs } = require('fs');
const path = require('path');
const AdmZip = require("adm-zip");
const multer = require('multer');
const AttachmentModel = require("../models/attachment.nominations.model");
const {genID} = require("./validation.services");

const dataPath = process.env.DATA_PATH
const acceptedMIMETypes = ['application/pdf'];

/**
 * File uploader middleware (multer)
 * - Uploads attached files to new directory generated for each nomination as:
 *   /data/uploads/<nomination_id>/
 * - Files are saved as:
 *   <nomination_id>_<filename>.<file_extension>
 * - Files are filtered by MIME type (see restricted types)
 *
 * @returns {Object}
 */

//specify destination
// - pass function that will generate destination path
const storage = multer.diskStorage({
  destination: (req, file, callback) => {

    // initialize upload path
    const id = req.params.id;
    const destination = path.join(dataPath, 'uploads', `${id}`);

    // ensure directory path exists
    fs.mkdir(destination, { recursive: true }, (err) => {
      if (err) throw err;
      callback(null, destination);
    });
  },
  // pass function that may generate unique filename if needed
  filename: (req, file, callback) => {
    const fileID = genID();
    callback(null, `${file.originalname}_${fileID}`);
  }
});

// restrict files by MIME types.
const fileFilter = function(req, file, next) {
  if(!file) next();

  const accepted = acceptedMIMETypes.includes(file.mimetype);
  if ( accepted ) {
    console.log('File attachment file format is accepted.');
    next(null, true);
  }
  else{
    console.log(`Attachment file format ${file.mimetype} not supported`)
    return next();
  }
};

const uploader = multer({storage: storage, fileFilter: fileFilter});
exports.uploader = uploader.single('attached');


/**
 * Delete file from storage
 * @param filePath
 */

const deleteFile = async function(filePath) {
  return fs.stat(filePath, async (err) => {
    if (err == null) {
      return await Fs.unlink(filePath);
    }
    else if (err.code === 'ENOENT') {
      // file does not exist (ignore)
      console.warn(err);
      return null;
    }
    else {
      throw err;
    }
  });
}
exports.deleteFile = deleteFile;

/**
 * Generate a CSV data from JSON data
 *
 * @param jsonData
 * @param dirPath
 * @param filename
 * @param callback
 */

const createCSV = function(jsonData, dirPath, filename, callback) {

  return jsonData;
}
exports.createCSV = createCSV;

/**
 * Check if file MIME type is of MS Word format
 *
 * @returns {Boolean}
 * @param mimeType
 */

const isWordDoc = function (mimeType) {
  return mimeType === 'application/msword'
    || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}
exports.isWordDoc = isWordDoc;

/**
 * Generate a zipped archive of folders paths.
 *
 * @return {Promise}
 * @param zipEntries
 * @param zipRoot
 */

const createZIP = async function(zipEntries, zipRoot) {

  // initialize zip file
  const zip = new AdmZip();

  // add listed directories
  ( zipEntries || [] ).map(zipEntry => {
    zip.addLocalFile(zipEntry, zipRoot);
  });

  // toBuffer() is used to read the data and save it
  // for downloading process!
  return zip.toBuffer();
}
exports.createZIP = createZIP;

/**
 * Generate a zipped archive of nomination files.
 *
 * @return {Promise}
 * @param {Array} nominations
 */

const createNominationPackage = async function(nominations) {

  // initialize zip file
  const zip = new AdmZip();

  // create folder entries
  await Promise.all(nominations.map(async(nomination) => {

    const { _id='', seq='', filePaths={} } = nomination || {};

    // - use unique sequence number to label nomination folder
    const packageDir = ('00000' + parseInt(seq)).slice(-5);

    // add nomination and merged files
    zip.addLocalFile(filePaths.nomination, packageDir);
    if (await fileExists(filePaths.merged))
      zip.addLocalFile(filePaths.merged, packageDir);

    // add attachment PDFs
    const attachments = await AttachmentModel.find({ nomination: _id });
    attachments.map(attachment => {
      const {file = {}} = attachment || {};
      const {path = ''} = file || {};
      zip.addLocalFile(path, packageDir);
    });

  }));

  // toBuffer() is used to read the data and save it
  // for downloading process!
  return zip.toBuffer();
}
exports.createNominationPackage = createNominationPackage;


/**
 * Check if file path exists.
 *
 * @param filePath
 * @return Promise
 */

const fileExists = async function (filePath) {
    try {
      await Fs.access(filePath)
      return true
    } catch {
      return false
    }
}
exports.fileExists = fileExists
