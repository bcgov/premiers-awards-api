/*!
 * PDF processing services
 * File: pdf.services.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const { PDFDocument, PageSizes, grayscale } = require("pdf-lib");
const fs = require("fs");
const path = require("path");
const schemaServices = require("./schema.services");
const sanitizeHtml = require("sanitize-html");
const axios = require("axios");

/**
 * Configuration settings
 * */
const dataPath = process.env.DATA_PATH;
const allowedTags = [
  "div",
  "p",
  "br",
  "b",
  "i",
  "em",
  "strong",
  "ol",
  "ul",
  "li",
  "blockquote",
];
// const pageCountMaximum = 5;
const customFontURL = "http://localhost:5000/static/css/BCSans.css";

/**
 * Generate file ID for nomination packages.
 *     e.g., '<SEQ>-<YEAR>_<CATEGORY_NAME>_<NOMINATION_TITLE>_<ORGANIZATION>'
 *
 * @param {Object} data
 * @return String
 */

const genFileID = async function (data) {
  try {
    // destructure nomination data
    const {
      seq = "",
      category = "",
      organizations = [],
      title = "",
      nominee = "",
    } = data || {};

    // build raw file ID string
    const year = (
      await schemaServices.get("globalSettings")
    ).value.year.toString();
    const { firstname = "", lastname = "" } = nominee || {};
    const label = title.slice(0, 15) || `${firstname}_${lastname}`.slice(0, 15);
    const organization = (
      await Promise.all(
        (organizations || []).map(async (org) => {
          const result = await schemaServices.lookupByKey("organizations", org); // Await the async operation
          return result !== null ? result.slice(0, 15) : ""; // Slice the result after it's resolved
        })
      )
    ).join("_");

    // convert file ID to slug
    const fileID = `${category}_${label}_${organization}`
      .toLowerCase()
      .replace(/[^\w ]+/g, "_")
      .replace(/ +/g, "_");
    // include sequence and year
    return `${("0000" + parseInt(seq)).slice(-5)}-${year.slice(
      2,
      4
    )}_${fileID}`;
  } catch (e) {
    console.error(e);
  }
};
exports.genFileID = genFileID;

const genExportZipFile = function () {
  const dirPath = path.join(dataPath ? dataPath : "", "temp");
  // ensure directory path exists
  fs.mkdir(dirPath, { recursive: true }, (err) => {
    if (err) throw err;
  });
  return path.join(
    dirPath,
    `nominations_export_${new Date().toJSON().slice(0, 21)}.zip`
  );
};
exports.genExportZipFile = genExportZipFile;

/**
 * Build HTML table as string
 * @param items
 * @return String
 */

const addHTMLTable = (items) => {
  const rows = Object.keys(items)
    .filter((key) => items[key].hasOwnProperty("visible") && items[key].visible)
    .map((key) => {
      const { label = "", value = "" } = items[key] || {};
      return `<tr>
                  <th>${label}</th>
                  <td>${value}</td>
                </tr>`;
    })
    .join(" ");
  return `<table>
            <tbody>
                ${rows}
            </tbody>
        </table>`;
};

/**
 * Build HTML unordered list as string
 * @param items
 * @return String
 */

const addHTMLUnorderedList = (items) => {
  return items.length > 0
    ? items
        .map((item, index) => {
          return `${index === 0 ? `<ul>` : ""}<li>${item}</li>${
            index === items.length - 1 ? `</ul>` : ""
          }`;
        })
        .join(" ")
    : "";
};

/**
 * Build HTML ordered list as string
 * @param items
 * @return String
 */

const addHTMLOrderedList = (items) => {
  return items.length > 0
    ? items
        .map((item, index) => {
          return `${index === 0 ? `<ol>` : ""}<li>${item}</li>${
            index === items.length - 1 ? `</ol>` : ""
          }`;
        })
        .join(" ")
    : "";
};

/**
 * @param data - nomination data
 * @return doc - pdfkit document
 */

const generateNominationHTML = async function (data) {
  // destructure nomination data
  const {
    seq = "",
    category = "",
    organizations = "",
    title = "",
    nominee = "",
    nominees = "",
    partners = [],
    nominators = [],
    evaluation = {},
    attachments = [],
  } = data || {};

  // creat unique sequence submission ID
  const submissionID = ("00000" + parseInt(seq)).slice(-5);

  // add nominee full name (if exists)
  const { firstname = "", lastname = "" } = nominee || {};

  // get created date
  const created = new Date().toLocaleString("en-CA", {
    timeZone: "America/Vancouver",
  });

  // Create html sections to add into nominationTableItems
  const ministryOrgSponsorHTML = addHTMLOrderedList(
    await Promise.all(
      organizations.map(async (organization) => {
        return await schemaServices.lookupByKey("organizations", organization);
      })
    )
  );
  const partnersListHTML = await addHTMLUnorderedList(
    partners.map((partner) => {
      const { organization = "" } = partner || {};
      return organization;
    })
  );
  const nominatorsListHTML = await addHTMLUnorderedList(
    nominators.map((nominator) => {
      const {
        firstname = "",
        lastname = "",
        title = "",
        email = "",
      } = nominator || {};
      return `${firstname} ${lastname}${title ? ", " + title : ""}${
        email ? ", " + email : ""
      }`;
    })
  );
  const attachmentsHTML = await addHTMLOrderedList(
    attachments.map((attachment) => {
      const { label = "", description = "", file = {} } = attachment || {};
      const { originalname = "Attachment" } = file || {};
      return `${label ? label : originalname}${
        description ? ": " + description : ""
      }`;
    })
  );
  const evaluationHTML = await Promise.all(
    Object.keys(evaluation).map(async (section) => {
      // confirm section is included in category
      if (await schemaServices.checkSection(section, category)) {
        // Allow only a super restricted set of tags and attributes
        const html = sanitizeHtml(evaluation[section], {
          allowedTags: allowedTags,
        });
        return `<h3>${await schemaServices.lookupByKey(
          "evaluationSections",
          section
        )}</h3><div>${html}</div>`;
      }
    })
  ).then((result) => result.join(" "));

  const nominationTableItems = [
    {
      label: "Created",
      value: created.toString(),
      visible: true,
    },
    {
      label: "Application Category",
      value: await schemaServices.lookupByKey("categories", category),
      visible: true,
    },
    {
      label:
        "Name of Ministry or eligible organization sponsoring this application",
      value: ministryOrgSponsorHTML,
      visible: true,
    },
    {
      label: "Nomination Title",
      value: title,
      visible: !!title,
    },
    {
      label: "Nominee",
      value: `${firstname} ${lastname}`,
      visible: firstname && lastname,
    },
    {
      label: "Number of Nominees",
      value: String(nominees),
      visible: nominees > 0,
    },
    {
      label: "Partners",
      value: partnersListHTML,
      visible: partners.length > 0,
    },
    {
      label: "Nominators",
      value: nominatorsListHTML,
      visible: nominators.length > 0,
    },
    {
      label: "Attachments",
      value: attachmentsHTML,
      visible: attachments.length > 0,
    },
    {
      label: "Evaluation Considerations",
      value: evaluationHTML,
      visible: Object.keys(evaluation).length > 0,
    },
  ];

  // create html template for nomination
  return `<!DOCTYPE html><html lang="en/us">
            <head>
            <title>${title}</title>
            <link href='${customFontURL}' rel='stylesheet' type='text/css'>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            <meta name="lowquality" content="None"/>
            <style>
                body {
                  font-family: 'BCSans', Helvetica, sans-serif;
                }
                  main {display: flex;}
                  main > * {border: 1px solid;}
                  table {
                      border-collapse: collapse; 
                      font-family: 'BCSans', Helvetica, sans-serif
                  }
                  td, th {
                      border-bottom: 1px solid #888888;
                      padding: 10px;
                      min-width: 200px;
                      background: white;
                      box-sizing: border-box;
                      text-align: left;
                      vertical-align: top;
                  }
                  th {
                    background: #DDDDDD;
                  }
              </style>
            </head>
        <body>
            <h1>Premier's Awards Nomination</h1>
            <h2>Submission ID ${submissionID}</h2>
            ${addHTMLTable(nominationTableItems)}
        </body>
    </html>`;
};

/**
 * Merge PDF documents into single PDF document
 *
 * @param {Array} documents
 * @param {String} filePath
 * @returns {Object}
 */

async function mergePDFDocuments(documents, filePath) {
  const mergedPdf = await PDFDocument.create();
  const fd = fs.openSync(filePath, "w+");

  for (let document of documents) {
    // Use pdf-lib static load (See: https://pdf-lib.js.org/docs/api/classes/pdfdocument#static-load)
    const uint8Array = fs.readFileSync(document);
    const pdfDoc = await PDFDocument.load(uint8Array, {
      ignoreEncryption: true,
    });
    const copiedPages = await mergedPdf.copyPages(
      pdfDoc,
      pdfDoc.getPageIndices()
    );
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  // save merged file
  fs.writeSync(fd, await mergedPdf.save());
}

/**
 * Generate PDF document from JSON data
 *
 * @param {Object} data
 * @param {Function} callback
 * @returns {Object}
 */

const generateNominationPDF = async function (data, callback) {
  // destructure nomination data
  const { _id = "", attachments = [] } = data || {};

  // - use unique sequence number to label file
  // - pad sequence with 00000
  // - creates (1) nomination PDF and (2) merged PDF
  const fileId = await genFileID(data);
  const basename = `${fileId}_nomination`;
  const nominationFilename = `${basename}.pdf`;
  const dirPath = path.join(dataPath, "generated", _id.toString());
  const nominationFilePath = path.join(dirPath, nominationFilename);
  const mergedFilename = `${basename}_merged.pdf`;
  const mergedFilePath = path.join(dirPath, mergedFilename);

  // ensure directory path exists
  fs.mkdir(dirPath, { recursive: true }, (err) => {
    if (err) throw err;
  });

  // build nomination html string
  const nominationHTML = await generateNominationHTML(data);

  // convert html to pdf stream
  const file = fs.createWriteStream(nominationFilePath);
  const pdfConverterURL = process.env.PDF_CONVERT_URL;
  const response = await axios({
    method: "post",
    url: pdfConverterURL,
    data: { html: nominationHTML, footer: "Premier's Awards" },
    contentType: "application/json",
    responseType: "stream",
  });

  // save PDF file locally
  const stream = response.data.pipe(file);
  stream.on("finish", async () => {
    // get document page range for nomination portion
    // const range = doc.bufferedPageRange();
    // console.log('Pages to submission:', range.start + range.count);

    try {
      // [2] merge attachments with main nomination document
      // console.log(`Merging and saving PDF to ${mergedFilePath}`);

      let docs = [nominationFilePath];
      docs.push.apply(
        docs,
        attachments.map((attachment) => {
          const { file = {} } = attachment || {};
          const { path = "" } = file || {};
          return path;
        })
      );
      await mergePDFDocuments(docs, mergedFilePath);

      // check if page count is exceeded
      // if (await getPageCount(mergedFilePath) > pageCountMaximum) {
      //   console.error('Error: Page count limit exceeded');
      //   return callback(Error('maxPagesExceeded'));
      // }
      console.log(`Merged PDF file ${mergedFilename} saved.`);
    } catch (err) {
      console.warn(err);
      return callback(Error("PDFCorrupted"));
    }
  });
  return [mergedFilePath, nominationFilePath];
};

/**
 * Generate PDF document with tables arranged in cols/rows - PA-150
 *
 * @param {data}
 * @param layout
 * @src public
 */

exports.generatePdfTableLayout = async function (data, layout) {
  async function createPdf() {
    const tables = data;

    const pdfDoc = await PDFDocument.create();

    const loadLogo = async (src) => {
      try {
        const logoUrl =
            src || "https://www2.gov.bc.ca/images/BCID_H_rgb_pos.png",
          logoImageBytes = await fetch(logoUrl).then((res) =>
            res.arrayBuffer()
          ),
          logoImage = await pdfDoc.embedPng(logoImageBytes),
          logoDims = logoImage.scale(0.2);

        return [logoImage, logoDims];
      } catch (e) {
        console.error(e);
        return [];
      }
    };

    const [logoImage, logoDims] = await loadLogo();

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
      toc: 10,
    };

    const scale = (s = 1) => {
      units.x *= s;
      units.y *= s;
      units.radius *= s;

      fonts.table *= s;
      fonts.guests *= s;
      fonts.labels *= s;
    };

    const layouts = {
      6: function () {
        units.cols = 6;
        units.rows = 3;
        scale(1);
      },
      7: function () {
        units.cols = 7;
        units.rows = 3;
        scale(0.85);
      },
      8: function () {
        units.cols = 8;
        units.rows = 4;
        scale(0.72);
      },
      9: function () {
        units.cols = 9;
        units.left = 60;
        units.rows = 4;
        scale(0.68);
      },
      10: function () {
        units.left = 60;
        units.top += 20;
        units.cols = 10;
        units.rows = 5;
        scale(0.6);
      },
      11: function () {
        units.left = 50;
        units.top += 20;
        units.cols = 11;
        units.rows = 5;
        scale(0.55);
      },
      12: function () {
        units.left = 50;
        units.top += 30;
        units.cols = 12;
        units.rows = 6;
        scale(0.5);
      },
      default() {
        layouts["8"].call();
      },
    };

    const layoutTemplate = Object.keys(layouts).includes(layout)
      ? layout
      : "default";
    layouts[layoutTemplate].call();

    let pageNumber = 1;
    const numberOfPages =
      Math.ceil(tables.length / (units.rows * units.cols)) + 1; // +1 for the TOC
    const tableToc = [];

    const drawHeader = (page) => {
      let headerX = page.getArtBox().x + 30,
        headerY = page.getArtBox().height - 50;

      page.drawText("Premier's Awards Table Layout", {
        size: fonts.header,
        x: headerX,
        y: headerY,
      });

      if (logoImage != null) {
        page.drawImage(logoImage, {
          x: page.getArtBox().width - logoDims.width - headerX,
          y: headerY - 15,
          width: logoDims.width,
          height: logoDims.height,
        });
      }

      headerY -= 5;

      page.drawLine({
        start: { x: headerX, y: headerY },
        end: { x: page.getArtBox().width - headerX, y: headerY },
        thickness: 1,
        color: grayscale(0.5),
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
        color: grayscale(0.5),
        opacity: 0.75,
      });

      footerY -= 10;

      page.drawText(`Page ${pageNumber} of ${numberOfPages}`, {
        size: fonts.footer,
        x: page.getArtBox().width - 80,
        y: footerY,
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

    tables
      .sort((a, b) => {
        return a.tableindex - b.tableindex;
      })
      .map((table) => {
        // creating copies because of async
        const coords = {
          x: left,
          y: top,
        };

        let currentPage = page;

        tableToc.push({
          page: pageNumber - 1,
          name: table.tablename,
        });

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

        const alignX = (text, font = fonts.labels) => {
          return coords.x - text.length * (font / 4);
        };

        const alignY = (line, font = fonts.labels) => {
          const lineHeight = font * 1.5,
            offset = font * 1.5; // distance from circle boundary

          return coords.y - units.radius - offset - line * lineHeight;
        };

        const labels = [
          { text: table.tablename, font: fonts.table },
          { text: `${table.guests.length} / ${table.tablecapacity} Guests` } /*,
        (function() { const available = table.tablecapacity - table.guests.length; return {text: `${available} Seat${available != 1 ? "s" : ""} Free` }; })()*/,
        ];

        labels.forEach((label, i) => {
          currentPage.drawText(label.text, {
            size: label.font || fonts.labels,
            x: alignX(label.text, label.font),
            y: alignY(i, label.font),
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

        const tableInfo = data.find((entry) => {
          return entry._id === table._id;
        });

        if (tableInfo) {
          const { guests = [] } = tableInfo;
          //const positions = getPositions(guests.length, units.radius * 3);
          const positions = new Array(guests.length)
            .fill([])
            .map((undefined, index) => {
              // advance to next line for each array entry
              const lineHeight = fonts.guests,
                y = coords.y + units.radius / 2 - (index - 1) * lineHeight;

              return [
                coords.x - units.radius / 2 - 3, // get the x as far left as possible
                y,
              ];
            });

          guests
            .sort((a, b) => {
              return +a.get("seat") - +b.get("seat");
            })
            .forEach((guest) => {
              // Guess we could also have one drawText function with \n for each guest. Left this here if we want to revert to arrange names around table
              const position = positions.shift();
              currentPage.drawText(`${guest.firstname} ${guest.lastname}`, {
                size: fonts.guests,
                x: position[0],
                y: position[1],
              });
            });
        }

        // move to next column position even if we could not load guest info

        const reflow = () => {
          left += x;

          tableIndex++;

          if (tableIndex % units.cols == 0) {
            left = units.left; // return to left of page
            top -= y; // advance to next line
          }

          // reached end of page, so reset and create new page
          if (tableIndex % (units.rows * units.cols) == 0) {
            [page, tableIndex] = addPage();
            [top, left, x, y] = [units.top, units.left, units.x, units.y];
          }
        };

        reflow();
      });

    const createToc = () => {
      [page, tableIndex] = addPage();

      let x = units.left,
        y = units.top;

      tableToc
        .sort((a, b) => {
          return a.name.localeCompare(b.name);
        })
        .forEach((table) => {
          const pad = (t) => {
            for (let i = t.length; i <= 25; i++) {
              t += ".";
            }

            return t;
          };

          page.drawText(pad(table.name), {
            size: fonts.toc,
            x,
            y,
          });

          page.drawText(`${table.page}`, {
            size: fonts.toc,
            x: x + 85,
            y,
          });

          y -= fonts.toc * 1.5;

          if (y <= 70) {
            y = units.top;
            x += 150;
          }
        });
    };

    createToc();

    return pdfDoc;
  }

  try {
    return await createPdf();
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.generateNominationPDF = generateNominationPDF;
