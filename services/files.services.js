/*!
 * File processing services
 * File: files.services.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const fs = require("fs");
const { promises: Fs } = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const multer = require("multer");
const AttachmentModel = require("../models/attachment.nominations.model");
const uuid = require("uuid");
const { genFileID, genExportZipFile } = require("./pdf.services");

const dataPath = process.env.DATA_PATH;
const acceptedMIMETypes = ["application/pdf"];

class BcZip {

  constructor() {

    // Trim file names in Zip files for Windows (PA-147)
    // Was going to go for Extends, however, AdmZip is not a valid class, so overriding did not go as planned.

    this.zip = new AdmZip();
    this.index = 0;
  }

  addLocalFile(file/*, folder*/) {

    if ( fs.existsSync(file) ) {

      const buffer = fs.readFileSync(file);
      
      let fileName = file.split("/").pop(); // get the actual file name, minus the path
      
      this.index++;
      /* 
        do something smart to remove all the clutter from the file names, eg:
        remove attachment_99416100-b2ef-11ed-97a1-231e10b89f20
        remove 00463-23_
        remove _nomination_merged
        remove _nomination
      */
     
     fileName = fileName.replace(/^attachment_[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}_/, "");
     //fileName = fileName.replace(/^\d{5}-\d{2}_/, "");
     fileName = fileName.replace(/_nomination_merged/, "");
     fileName = fileName.replace(/_nomination/, "");
     
     //console.log(`Zipping ${file} as ${fileName}`);
     return this.zip.addFile(`${this.index}_${fileName}`, buffer);

    } else {

      console.log(`addLocalFile, ${file} does not exist`);
    }
    
  }

  toBuffer() {

    return this.zip.toBuffer();
  }

  writeZip(zipFilePath) {

    return this.zip.writeZip(zipFilePath);
  }
}

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
    const destination = path.join(dataPath, "uploads", `${id}`);

    // ensure directory path exists
    fs.mkdir(destination, { recursive: true }, (err) => {
      if (err) throw err;
      callback(null, destination);
    });
  },
  /**
   * Pass function that generates unique filename to avoid overwriting files
   */
  filename: (req, file, callback) => {
    callback(null, `attachment_${uuid.v1()}_${file.originalname}`);
  },
});

// restrict files by MIME types.
const fileFilter = function (req, file, next) {
  // exit on empty file
  if (!file) next();

  // check for accepted MIME type
  const accepted = acceptedMIMETypes.includes(file.mimetype);
  if (accepted) {
    console.log("File attachment file format is accepted.");
    next(null, true);
  } else {
    console.log(`Attachment file format ${file.mimetype} not supported`);
    return next();
  }
};

const uploader = multer({ storage: storage, fileFilter: fileFilter });
exports.uploader = uploader.single("attached");

/**
 * Delete file from storage
 * @param filePath
 */

const deleteFile = async function (filePath) {
  return fs.stat(filePath, async (err) => {
    if (err == null) {
      return await Fs.unlink(filePath);
    } else if (err.code === "ENOENT") {
      // file does not exist (ignore)
      console.warn(err);
      return null;
    } else {
      throw err;
    }
  });
};
exports.deleteFile = deleteFile;

/**
 * Generate a CSV data from JSON data
 *
 * @param jsonData
 * @param dirPath
 * @param filename
 * @param callback
 */

const createCSV = function (jsonData, dirPath, filename, callback) {
  return jsonData;
};
exports.createCSV = createCSV;

/**
 * Check if file MIME type is of MS Word format
 *
 * @returns {Boolean}
 * @param mimeType
 */

const isWordDoc = function (mimeType) {
  return (
    mimeType === "application/msword" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
};
exports.isWordDoc = isWordDoc;

/**
 * Generate a zipped archive of folders paths.
 *
 * @return {Promise}
 * @param zipEntries
 * @param zipRoot
 */

const createZIP = async function (zipEntries, zipRoot) {
  // initialize zip file from new BcZip class for trimmed files names (PA-147)
  const zip = new BcZip();

  // add listed directories
  (zipEntries || []).map((zipEntry) => {
    zip.addLocalFile(zipEntry, zipRoot);
  });

  // toBuffer() is used to read the data and save it
  // for downloading process!
  return zip.toBuffer();
};
exports.createZIP = createZIP;

/**
 * Generate a zipped archive of nomination files.
 *
 * @return {Promise}
 * @param {Array} nominations
 */

const createNominationPackage = async function (nominations) {
  // initialize zip file from new BcZip class for trimmed files names (PA-147)
  const zip = new BcZip();
  // create folder entries
  await Promise.all(
    nominations.map(async (nomination) => {
      const { _id = "", seq = "", filePaths = {} } = nomination || {};

      // - use unique sequence number to label nomination folder
      const packageDir = genFileID(nomination);

      // add nomination and merged files
      zip.addLocalFile(filePaths.nomination, packageDir);
      if (await fileExists(filePaths.merged))
        zip.addLocalFile(filePaths.merged, packageDir);

      // add attachment PDFs
      const attachments = await AttachmentModel.find({ nomination: _id });
      attachments.map((attachment) => {
        const { file = {} } = attachment || {};
        const { path = "" } = file || {};
        zip.addLocalFile(path, packageDir);
      });
    })
  ).catch((error) => console.log(error));
  try {
    var zipFilePath = genExportZipFile();
    zip.writeZip(zipFilePath);
    return zipFilePath;
  } catch (e) {
    console.log(e);
    return;
  }

  // toBuffer() is used to read the data and save it
  // for downloading process!
};
exports.createNominationPackage = createNominationPackage;

/**
 * Check if file path exists.
 *
 * @param filePath
 * @return Promise
 */

const fileExists = async function (filePath) {
  try {
    await Fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};
exports.fileExists = fileExists;
