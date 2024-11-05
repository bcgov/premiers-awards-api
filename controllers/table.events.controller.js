/*!
 * Events: Table registration Controller
 * File: table.events.controller.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const { default: mongoose } = require("mongoose");
const { genID } = require("../services/validation.services.js");
const GuestModel = require("../models/guest.events.model.js");
const TableModel = require("../models/table.events.model.js");
const TableCounterModel = require("../models/counter.events.model.js");
const RegistrationModel = require("../models/registration.events.model.js");
const { generatePdfTableLayout } = require("../services/pdf.services.js");

/**
 * Table Counter name Generator.
 * Uses set alphabet and numerical set of tables to generate a list of potential table names.
 * @src public
 */

const createName = async function () {
  const result = await TableCounterModel.findById({ _id: "tablename" });
  const alphaArray = result.alpha;

  const alphabetTables = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  //specific format for premier's awards seating (additional tables added in case of surplus guests)
  const orderedTables = Array.from("AGBHCIDJEKFL");
  const numericalTables = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
  const totalTables = numericalTables
    .map((numeral) => orderedTables.map((each) => each + numeral))
    .flat();

  for (let each of totalTables) {
    if (!alphaArray.includes(each)) return each;
  }
};

/** 
 * Return number of tables 
 * PA-185 Added new counter which is to be used when creating a new table 
**/

const getTableCount = async function() {

  try {

    const result = await TableCounterModel.exists({ _id: "tablename" });
    if (!result) {
      await TableCounterModel.create({ _id: "tablename", seq: 0, alpha: [] });
    }

    const tablecount = await TableCounterModel.aggregate([{$project: { count: { $size: "$alpha" }}}]);
    
    if ( !tablecount ) {
      return -1;
    }

    return tablecount[0].count;

  } catch (err) {
    console.log(err);
    return -1;
  }
}

/**
 * Retrieve all table data.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.getAllTables = async (req, res, next) => {
  try {
    const tables = await TableModel.find({});
    return res.status(200).json(tables);
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

/**
 * Generate PDF document with tables arranged in cols/rows - PA-150
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.getPdfLayout = async (req, res, next) => {

  const { layout = "8", format = "binary" } = req.query;
  
  try {
    const data = await TableModel.find({}).populate("guests");
    
    const pdfDoc = await generatePdfTableLayout(data, layout);

    if ( format == "base64" ) {

      const base64Uri = await pdfDoc.saveAsBase64({ dataUri: true });
      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Content-Length': base64Uri.length
      });
      res.end(base64Uri); 
    
    } else {

      const pdfUri = await pdfDoc.save();
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Length': pdfUri.length
      });
      res.end(pdfUri); 
    }
  
  } catch (err) {

    return next(err);
  }
};

exports.getTable = async (req, res, next) => {
  try {
    const id = req.params.id;
    let table;

    if (mongoose.Types.ObjectId.isValid(id)) {
      table = await TableModel.find({
        _id: id,
      });
    } else {
      table = await TableModel.find({
        guid: id,
      });
    }

    return res.status(200).json(table);
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

exports.getTableGuests = async (req, res, next) => {
  try {
    const id = req.params.id;

    // look up guests exist on table

    let guests;

    if (mongoose.Types.ObjectId.isValid(id)) {
      guests = await TableModel.find({
        _id: id,
      }).populate("guests");
    } else {
      guests = await TableModel.find({
        guid: id,
      }).populate("guests");
    }

    if (!guests) return next(Error("invalidInput"));

    return res.status(200).json(guests);
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

// PA-185 Added new count to route for future use

exports.getTableCount = async (req, res, next) => {

  const count = await getTableCount();
  return res.status(200).json({ count });
};

/**
 * Create new table
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method post
 * @src public
 */

exports.createTable = async (req, res, next) => {
  try {
    const result = await TableCounterModel.exists({ _id: "tablename" });
    if (!result) {
      await TableCounterModel.create({ _id: "tablename", seq: 0, alpha: [] });
    }

    const guid = genID();
    const name = await createName();
    const {
      tablename = "",
      tablecapacity = null,
      tabletype = "",
      organizations = [],
    } = req.body || {};

    const finalName = tablename !== "" ? tablename : name;

    // PA-185 Get the table count which is required for the table creation index 
    const tableindex = await getTableCount();

    // insert new record into collection
    const table = await TableModel.create({
      guid,
      tablename: finalName,
      tablecapacity,
      tabletype,
      organizations,
      tableindex
    });

    await TableCounterModel.updateOne(
      { _id: "tablename" },
      {
        $push: { alpha: finalName },
      }
    );

    res.status(200).json(table);
  } catch (err) {
    return next(err);
  }
};

/**
 * Cycle through given table total and generate a set of tables
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method post
 * @src public
 */

exports.generateTableSetup = async (req, res, next) => {
  try {
    const result = await TableCounterModel.exists({ _id: "tablename" });
    if (result) {
      await TableCounterModel.findByIdAndRemove({ _id: "tablename" });
    }
    await TableModel.deleteMany({});
    await GuestModel.updateMany({}, { table: null });
    await TableCounterModel.create({ _id: "tablename", seq: 0, alpha: [] });

    const guestCount = await GuestModel.countDocuments({});
    //default layout
    const tableCount = 72;

    //custom layout based on guests is possible
    //const tableCount = guestCount / 10 > 1 ? Math.ceil(guestCount / 10) + 10 : 1;

    for (let i = 0; i < tableCount; i++) {
      const guid = genID();
      const tablename = await createName();
      const tabletype = "Standard";
      const tablecapacity = 10;
      const organizations = [];
      await TableModel.create({
        guid,
        tablename,
        tablecapacity,
        tabletype,
        organizations,
        tableindex: i
      });
      await TableCounterModel.updateOne(
        { _id: "tablename" },
        {
          $push: { alpha: tablename },
        }
      );
    }

    const finalTables = await TableModel.find();

    res.status(200).json(finalTables);
  } catch (err) {
    return next(err);
  }
};

/**
 * Update table data
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.updateTable = async (req, res, next) => {
  try {
    const data = req.body;
    const id = req.params.id;

    // look up guest exists
    const table = await TableModel.findById(id);
    if (!table) return next(Error("invalidInput"));
    await TableModel.updateOne({ _id: id }, data);
    const newTable = await TableModel.findById(id);
    res.status(200).json(newTable);
  } catch (err) {
    return next(err);
  }
};

/**
 * Remove Table
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

/** 

exports.deleteTable = async (req, res, next) => {
  try {
    const id = req.params.id;

    // look up table exists
    const table = await TableModel.findById(id);
    if (!table) return next(Error("invalidInput"));

    const response = await TableModel.deleteOne({ _id: id });

    res.status(200).json(response);
  } catch (err) {
    return next(err);
  }
};

*/

/**
 * Removes table and resets all connected guests
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.deleteTable = async (req, res, next) => {
  try {
    const id = req.params.id;

    // look up registration exists
    const table = await TableModel.findById(id);
    if (!table) return next(Error("invalidInput"));
    const tablename = table.tablename;

    for (let each of table.guests) {
      const guestID = each["_id"];
      await GuestModel.updateOne({ _id: guestID }, { table: null });
    }

    for (let each of table.registrations) {
      const registrationID = each["_id"];
      await RegistrationModel.updateOne(
        { _id: registrationID },
        { table: null }
      );
    }

    const response = await TableModel.deleteOne({ _id: id });

    await TableCounterModel.updateOne(
      { _id: "tablename" },
      {
        $pull: { alpha: tablename },
      }
    );

    res.status(200).json(response);
  } catch (err) {
    return next(err);
  }
};

/**
 * Removes all tables, registrations, and guests.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.deleteAll = async (req, res, next) => {
  try {
    await TableModel.deleteMany({})
      .then(async () => {
        await RegistrationModel.deleteMany({});
      })
      .then(async () => {
        await GuestModel.deleteMany({});
      });

    const finalTables = await TableModel.find();

    res.status(200).json(finalTables);
  } catch (err) {
    return next(err);
  }
};

/**
 * Push details to table data
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.pushTableDetails = async (req, res, next) => {
  try {
    const data = req.body;
    const id = req.params.id;

    // look up table exists
    const table = await TableModel.findById(id);
    if (!table) return next(Error("invalidInput"));
    await TableModel.updateOne({ _id: id }, { $push: data });
    const newTable = await TableModel.findById(id);
    res.status(200).json(newTable);
  } catch (err) {
    return next(err);
  }
};

/**
 * Pull details from table data
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.pullTableDetails = async (req, res, next) => {
  try {
    const data = req.body;
    const id = req.params.id;

    // look up table exists
    const table = await TableModel.findById(id);
    if (!table) return next(Error("invalidInput"));
    await TableModel.updateOne({ _id: id }, { $pull: data });
    const newTable = await TableModel.findById(id);
    res.status(200).json(newTable);
  } catch (err) {
    return next(err);
  }
};
