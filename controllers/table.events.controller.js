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

const { PDFDocument, PageSizes, grayscale } = require("pdf-lib");


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

  async function createPdf() {
    
    const tables = (await TableModel.find({})).map(t => t._doc); // This is needed because we use . and not .get for everything

    const pdfDoc = await PDFDocument.create();
   
    const loadLogo = async (src) => {

      try {

        const logoUrl = src || "https://www2.gov.bc.ca/images/BCID_H_rgb_pos.png",
          logoImageBytes = await fetch(logoUrl).then((res) => res.arrayBuffer()),
          logoImage = await pdfDoc.embedPng(logoImageBytes),
          logoDims = logoImage.scale(0.2);
        
        return [ logoImage, logoDims ];
      } catch (e) {

        console.error(e);
        return [];
      }
    };

    const [ logoImage, logoDims ] = await loadLogo();

    const units = {
      top: PageSizes.Letter[0] - 120, // offset from top
      left: 80, // offset from left
      x: 125, // space between tables
      y: 170, // space between tables
      radius: 55, // size of table circle
      rows: 3, // number of rows per page
      cols: 6, // number of cols per page,
    };
    
    const fonts = {
      
      header: 14,
      table: 12,
      labels: 9,
      guests: 8,
      footer: 6,
      toc: 10
    };

    const scale = (s=1) => {

      units.x *= s;
      units.y *= s;
      units.radius *= s;

      fonts.table *= s;
      fonts.guests *= s;
      fonts.labels *= s;
    };

    const layouts = {
      
      "6": function() {
        units.cols = 6;
        units.rows = 3;
        scale(1);
      },
      "7": function() {
        units.cols = 7;
        units.rows = 3;
        scale(.85);
      },
      "8": function() {
        units.cols = 8;
        units.rows = 4;
        scale(.72);
      },
      "10": function() {
        units.left = 60;
        units.top += 20;
        units.cols = 10;
        units.rows = 5;
        scale(.60);
      },
      "11": function() {
        units.left = 50;
        units.top += 20;
        units.cols = 11;
        units.rows = 5;
        scale(.55);
      },
      default() {
        layouts["8"].call();
      }
    };

    const layout = Object.keys(layouts).includes(req.query.layout) ? req.query.layout : "default";
    layouts[layout].call();
    
    let pageNumber = 1;
    const numberOfPages = Math.ceil(tables.length / ( units.rows * units.cols )) + 1; // +1 for the TOC
    const tableToc = [];

    const drawHeader = (page) => {

      let headerX = page.getArtBox().x + 30,
        headerY = page.getArtBox().height - 50;

      page.drawText("Premier's Awards Table Layout", { 
        size: fonts.header,
        x: headerX,
        y: headerY
      });

      if ( logoImage != null ) {
 
        page.drawImage(logoImage, {
          x: page.getArtBox().width - logoDims.width - headerX,
          y: headerY - 15,
          width: logoDims.width,
          height: logoDims.height
        });
      }
      
      headerY -= 5;
      
      page.drawLine({
        start: { x: headerX, y: headerY },
        end: { x: page.getArtBox().width - headerX, y: headerY },
        thickness: 1,
        color: grayscale(.5),
        opacity: 0.75,
      });
    };
    
    const drawFooter = (page) => {

      let footerX = page.getArtBox().x + 30,
        footerY = page.getArtBox().y + 50;
      
      page.drawLine({
        start: { x: footerX, y: footerY },
        end: { x: page.getArtBox().width - footerX, y: footerY },
        thickness: 1,
        color: grayscale(.5),
        opacity: 0.75,
      });

      footerY -= 10;

      page.drawText(`Page ${pageNumber} of ${numberOfPages}`, { 
        size: fonts.footer,
        x: page.getArtBox().width - 80,
        y: footerY
      });

    };
    
    const addPage = () => {
      
      let page = pdfDoc.addPage([...PageSizes.Letter].reverse()); // Convert dimensions to landscape
      drawHeader(page);
      
      drawFooter(page);
      
      pageNumber++;
      
      return [page, 0];
    };

    let [page, tableIndex] = addPage();
    
    let { top, left, x, y } = units;
    
    const promises = tables.sort( (a, b) => {

      return a.tableindex - b.tableindex;

    }).map(table => { 
      
      return new Promise( (resolve) => {

        // creating copies because of async
        const coords = {
          x: left,
          y: top
        };

        let currentPage = page;

        tableToc.push( {
          page: pageNumber - 1,
          name: table.tablename
        } );
                
        currentPage.drawCircle({
          x: coords.x,
          y: coords.y,
          size: units.radius,
          borderWidth: 1,
          borderColor: grayscale(0.5),
          color: grayscale(0.1),
          opacity: 1 / 15,
          borderOpacity: 0.75,
        });

        const alignX = (text, font=fonts.labels) => {

          return coords.x - text.length * ( font / 4 );
        };

        const alignY = (line, font=fonts.labels) => {

          const lineHeight = font * 1.5, 
            offset = font * 1.5; // distance from circle boundary

          return coords.y - ( units.radius ) - offset - (line * lineHeight);
        };
        
        const labels = [
          {text: table.tablename, font: fonts.table },
          {text: `${table.guests.length} / ${table.tablecapacity} Guests`}/*,
          (function() { const available = table.tablecapacity - table.guests.length; return {text: `${available} Seat${available != 1 ? "s" : ""} Free` }; })()*/
        ];

        labels.forEach( (label, i) => {

          currentPage.drawText(label.text, { 
            size: label.font || fonts.labels,
            x: alignX(label.text, label.font),
            y: alignY(i, label.font)
          });
        });

        /*
        const getPositions = (circlesNumber, radius) => {

          let incrementalAngle = 0.0;
          const TWO_PI = Math.PI * 2;
          const height = width = 100;

          const positions = [];
          let spread = 0;

          for (var i = 0; i < circlesNumber; i++) {
            
            const p = [
                      radius * Math.cos(incrementalAngle) + coords.x - radius / 2, 
                      radius * Math.sin(incrementalAngle) + coords.y + spread + radius / 2
            ];

            spread -= 7;

            incrementalAngle += TWO_PI / circlesNumber;  
            positions.push(p);
          } 

          return positions;
        }
        */

        TableModel.find({
          _id: table._id,
        }).populate("guests").then(tableInfo => {

          if (tableInfo && tableInfo[0]) {

            const { guests = [] } = tableInfo[0];
            //const positions = getPositions(guests.length, units.radius * 3);
            const positions = (new Array(guests.length)).fill([]).map( (undefined, index) => {

              // advance to next line for each array entry
              const lineHeight = fonts.guests,
                y = coords.y + ( units.radius / 2 ) - (index-1) * lineHeight;

              return [
                coords.x - ( units.radius / 2 ) - 6, // get the x as far left as possible
                y
              ];
            });

            guests.sort( (a, b) => {

              return +a.get("seat") - (+b.get("seat"));

            }).forEach(guest => {
              
              // Guess we could also have one drawText function with \n for each guest. Left this here if we want to revert to arrange names around table
              const position = positions.shift();
              currentPage.drawText(`${guest.firstname} ${guest.lastname}`, {
                size: fonts.guests,
                x: position[0],
                y: position[1]
              });
            });
          }

          return resolve();
          
        })
        .catch(console.error)
        .finally(resolve);
        
        // move to next column position even if we could not load guest info
        
        const reflow = () => {

          left += x;

          tableIndex++;
          
          if ( tableIndex % units.cols == 0 ) {
            
            left = units.left; // return to left of page
            top -= y; // advance to next line
          }
          
          // reached end of page, so reset and create new page
          if ( tableIndex % ( units.rows * units.cols ) == 0 ) {

            [page, tableIndex] = addPage();
            [ top, left, x, y ] = [ units.top, units.left, units.x, units.y ];
          }
        };

        reflow();
        
      });
      
    });
    
    await Promise.all(promises);

    const createToc = () => {

      [page, tableIndex] = addPage();

      let x = units.left, y = units.top;

      tableToc.sort( (a, b) => {

        return a.name.localeCompare(b.name);
      }).forEach(table => {

        const pad = t => {

          for ( let i=t.length; i<=25; i++ ) {
            t += ".";
          }

          return t;
        };

        page.drawText(pad(table.name), {
          size: fonts.toc,
          x,
          y
        });
        
        page.drawText(`${table.page}`, {
          size: fonts.toc,
          x: x + 85,
          y
        });

        y -= fonts.toc * 1.5;

        if ( y <= 70 ) {

          y = units.top;
          x += 150;
        }

      });


    };

    createToc();

    const format = req.query.format || "binary";

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
  }

  try {
    await createPdf();

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

    // insert new record into collection
    const table = await TableModel.create({
      guid,
      tablename: finalName,
      tablecapacity,
      tabletype,
      organizations,
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
