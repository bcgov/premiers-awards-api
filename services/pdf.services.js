/*!
 * PDF processing services
 * File: pdf.services.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const pdfParser = require('pdf-parse');
const { PDFDocument } = require('pdf-lib')
const fs = require('fs');
const path = require('path');
const schemaServices = require('./schema.services');
const sanitizeHtml = require('sanitize-html');
const axios = require("axios");

/**
 * Configuration settings
 * */
const dataPath = process.env.DATA_PATH;
const allowedTags = [ 'div', 'p', 'br', 'b', 'i', 'em', 'strong', 'ol', 'ul', 'li', 'blockquote' ];
const pageCountMaximum = 5;
const customFontURL = 'http://localhost:5000/static/css/BCSans.css';

/**
 * Count pages in PDF document
 * @param filePath
 */

const getPageCount = async(filePath) => {
  let dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParser(dataBuffer);
  return data.numrender > data.numpages ? data.numrender : data.numpages;
}

/**
 * Build HTML table as string
 * @param items
 * @return String
 */

const addHTMLTable = (items) => {
  const rows = Object.keys(items)
      .filter(key => items[key].hasOwnProperty('visible') && items[key].visible)
      .map(key => {
        const {label='', value=''} = items[key] || {};
        return `<tr>
                  <th>${label}</th>
                  <td>${value}</td>
                </tr>`
        }).join(' ');
  return `<table>
            <tbody>
                ${rows}
            </tbody>
        </table>`
}

/**
 * Build HTML unordered list as string
 * @param items
 * @return String
 */

const addHTMLUnorderedList = (items) => {
  return items.length > 0 ? items.map((item, index) => {
    return `${index === 0 ? `<ul>` : ''}<li>${item}</li>${index === items.length - 1 ? `</ul>` : ''}`;
  }).join(' ') : '';
}

/**
 * Build HTML ordered list as string
 * @param items
 * @return String
 */

const addHTMLOrderedList = (items) => {
  return items.length > 0 ? items.map((item, index) => {
    return `${index === 0 ? `<ol>` : ''}<li>${item}</li>${index === items.length - 1 ? `</ol>` : ''}`;
  }).join(' ') : '';
}

/**
 * @param data - nomination data
 * @return doc - pdfkit document
 */

const generateNominationHTML = function(data) {

  // destructure nomination data
  const {
    seq='',
    category='',
    organization='',
    title='',
    nominee='',
    nominees='',
    partners=[],
    nominators= [],
    evaluation= {},
    attachments= []
  } = data || {};

  // creat unique sequence submission ID
  const submissionID = ('00000' + parseInt(seq)).slice(-5);

  // add nominee full name (if exists)
  const {firstname = '', lastname = '' } = nominee || {};

  // get created date
  const created = new Date().toLocaleString("en-CA", {timeZone: "America/Vancouver"});

  const nominationTableItems = [
    {
      label: 'Created',
      value: created.toString(),
      visible: true
    },
    {
      label: 'Application Category',
      value: schemaServices.lookup('categories', category),
      visible: true
    },
    {
      label: 'Name of Ministry or eligible organization sponsoring this application',
      value: schemaServices.lookup('organizations', organization),
      visible: true
    },
    {
      label: 'Nomination Title',
      value: title,
      visible: !!title
    },
    {
      label: 'Nominee',
      value: `${firstname} ${lastname}`,
      visible: firstname && lastname
    },
    {
      label: 'Number of Nominees',
      value: String(nominees),
      visible: nominees > 0
    },
    {
      label: 'Partners',
      value: addHTMLUnorderedList(partners.map(partner => {
        const {organization = ''} = partner || {};
        return organization;
      })),
      visible: partners.length > 0
    },
    {
      label: 'Nominators',
      value: addHTMLUnorderedList(nominators.map(nominator => {
        const {firstname='', lastname='', title='', email='' } = nominator || {};
        return `${firstname} ${lastname}${title ? ', ' + title : ''}${email ? ', ' + email : ''}`;
      })),
      visible: nominators.length > 0
    },
    {
      label: 'Attachments',
      value: addHTMLOrderedList(attachments.map((attachment) => {
        const {label = '', description='', file = {}} = attachment || {};
        const {originalname='Attachment'} = file || {};
        return `${label ? label : originalname}${description ? ': ' + description : ''}`;
      })),
      visible: attachments.length > 0
    },
    {
      label: 'Evaluation Considerations',
      value: Object.keys(evaluation).map(section => {
        // confirm section is included in category
        if (schemaServices.checkSection(section, category)) {
          // Allow only a super restricted set of tags and attributes
          const html = sanitizeHtml(evaluation[section], {
            allowedTags: allowedTags,
          });
          return `<h3>${schemaServices.lookup('evaluationSections', section)}</h3><div>${html}</div>`;
        }
      }).join(' '),
      visible: Object.keys(evaluation).length > 0
    },
  ];

  // create html template for nomination
  return `<!DOCTYPE html><html lang="en/us">
            <head>
            <title>${title}</title>
            <link href='${customFontURL}' rel='stylesheet' type='text/css'>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
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
}


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
    const uint8Array = fs.readFileSync(document)
    const pdfDoc = await PDFDocument.load(uint8Array, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
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

const generateNominationPDF = async function(data, callback) {

  // destructure nomination data
  const {
    _id='',
    seq='',
    attachments= []
  } = data || {};

  // - use unique sequence number to label file
  // - pad sequence with 00000
  // - creates (1) nomination PDF and (2) merged PDF
  const fileId = ('00000' + parseInt(seq)).slice(-5);
  const basename = `${fileId}-nomination`;
  const nominationFilename = `${basename}.pdf`;
  const dirPath = path.join(dataPath, 'generated', _id.toString());
  const nominationFilePath = path.join(dirPath, nominationFilename);
  const mergedFilename = `${basename}-merged.pdf`;
  const mergedFilePath = path.join(dirPath, mergedFilename);

  // ensure directory path exists
  fs.mkdir(dirPath, { recursive: true }, (err) => {
    if (err) throw err;
  });

  // build nomination html string
  const nominationHTML = generateNominationHTML(data);

  // convert html to pdf stream
  const file = fs.createWriteStream(nominationFilePath);
  const pdfConverterURL = process.env.PDF_CONVERT_URL;
  const response = await axios({
    method: 'post',
    url: pdfConverterURL,
    data: {html: nominationHTML, footer: 'Premier\'s Awards'},
    contentType: 'application/json',
    responseType: 'stream'
  });

  // save PDF file locally
  const stream = response.data.pipe(file);
  stream.on('finish', async () => {

  // get document page range for nomination portion
  // const range = doc.bufferedPageRange();
  // console.log('Pages to submission:', range.start + range.count);

    try {
      // [2] merge attachments with main nomination document
      // console.log(`Merging and saving PDF to ${mergedFilePath}`);

      let docs = [nominationFilePath];
      docs.push.apply(docs, attachments.map(attachment => {
        const {file = {}} = attachment || {};
        const {path = ''} = file || {};
        return path;
      }));
      await mergePDFDocuments(docs, mergedFilePath);

      // check if page count is exceeded
      // if (await getPageCount(mergedFilePath) > pageCountMaximum) {
      //   console.error('Error: Page count limit exceeded');
      //   return callback(Error('maxPagesExceeded'));
      // }
      console.log(`Merged PDF file ${mergedFilename} saved.`);
    } catch (err) {
      console.warn(err);
      return callback(Error('PDFCorrupted'));
    }
  });
  return [mergedFilePath, nominationFilePath];
}
exports.generateNominationPDF = generateNominationPDF;


