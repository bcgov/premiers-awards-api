/*!
 * PDF processing services
 * File: pdf.services.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const puppeteer = require('puppeteer');
const PDFMerger = require('pdf-merger-js');
const pdfParser = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const schemaServices = require('./schema.services');
const sanitizeHtml = require('sanitize-html');
const {jsPDF} = require("jspdf");
const PCR = require("puppeteer-chromium-resolver");


/**
 * Configuration settings
 * */
const dataPath = process.env.DATA_PATH;
const allowedTags = [ 'div', 'p', 'br', 'b', 'i', 'em', 'strong', 'ol', 'ul', 'li', 'blockquote' ];
const pageCountMaximum = 5;
const customFontURL = 'https://fonts.googleapis.com/css?family=Roboto';

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

  const nominationTableItems = [
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
            allowedIframeHostnames: ['www.youtube.com']
          });
          return `<h3>${schemaServices.lookup('evaluationSections', section)}</h3><div>${html}</div>`;
        }
      }).join(' '),
      visible: Object.keys(evaluation).length > 0
    },
  ];

  // create html template for nomination
  return `<html lang="en/us">
        <head>
            <title>${title}</title>
            <style>
              @import url(${customFontURL});
              body {
                font-family: "Roboto", serif, sans-serif;
              }
                main {display: flex;}
                main > * {border: 1px solid;}
                table {
                    border-collapse: collapse; 
                    font-family: inherit, helvetica, sans-serif
                }
                td, th {
                    border-bottom: 1px solid #888888;
                    padding: 10px;
                    min-width: 200px;
                    background: white;
                    box-sizing: border-box;
                    text-align: left;
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

  // create formatted PDF document [PDFKit]
  //const doc = await buildNominationDoc(data);

  const stats = PCR.getStats();
  if (stats) {
    stats.puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: stats.executablePath
    }).then(async(browser) => {
      const page = await browser.newPage();
      const headerHTML = `<div>Premier's Awards</div>`;
      const footerHTML = `<div style=\"text-align: right;width: 297mm;font-size: 8px;\">
                              <span style=\"margin-right: 1cm\">
                                  <span class=\"pageNumber\"></span> of <span class=\"totalPages\"></span>
                              </span>
                          </div>`;
      const nominationHTML = generateNominationHTML(data);
      // To use custom fonts, need puppeteer to wait for network idle status
      await page.setContent(nominationHTML, { waitUntil: 'networkidle2' });

      await page.pdf({
        path: nominationFilePath,
        margin: { top: '100px', right: '50px', bottom: '100px', left: '50px' },
        printBackground: true,
        format: 'A4',
        displayHeaderFooter: true,
        headerTemplate: headerHTML,
        footerTemplate: footerHTML
      });

    }).catch(function(error) {
      console.log(error);
    });
  }

  // const browser = await puppeteer.launch({
  //   headless: true,
  //   args: ["--no-sandbox", "--disable-setuid-sandbox"]
  // });
  // const page = await browser.newPage();
  // const headerHTML = `<div>Premier's Awards</div>`;
  // const footerHTML = `<div style=\"text-align: right;width: 297mm;font-size: 8px;\">
  //                         <span style=\"margin-right: 1cm\">
  //                             <span class=\"pageNumber\"></span> of <span class=\"totalPages\"></span>
  //                         </span>
  //                     </div>`;
  // const nominationHTML = generateNominationHTML(data);
  // // To use custom fonts, need puppeteer to wait for network idle status
  // await page.setContent(nominationHTML, { waitUntil: 'networkidle2' });

  // // Save PDF locally
  // await page.pdf({
  //   path: nominationFilePath,
  //   margin: { top: '100px', right: '50px', bottom: '100px', left: '50px' },
  //   printBackground: true,
  //   format: 'A4',
  //   displayHeaderFooter: true,
  //   headerTemplate: headerHTML,
  //   footerTemplate: footerHTML
  // });



  // get document page range for nomination portion
  // const range = doc.bufferedPageRange();
  // console.log('Pages to submission:', range.start + range.count);

  // [1] create nomination metadata file stream and write to file
  // const stream = fs.createWriteStream(nominationFilePath);
  // doc.pipe(stream);
  // doc.end();
  // stream.on('error', (err)=>{callback(err)});
  // stream.on('close', async ()=>{
    try {
      // [2] merge attachments with main document
      const merger = new PDFMerger();
      // include submission PDF file
      await merger.add(nominationFilePath);
      // include file attachments
      console.log(`Merging and saving PDF to ${nominationFilePath}`);
      await Promise.all(
        attachments.map(async (attachment) => {
          const {file = {}} = attachment || {};
          const {path = ''} = file || {};
          await merger.add(path);
        }));
      //save under given name and reset the internal document
      await merger.save(mergedFilePath);
      // check if page count is exceeded
      if (await getPageCount(mergedFilePath) > pageCountMaximum) {
        console.error('Error: Page count limit exceeded');
        return callback(Error('maxPagesExceeded'));
      }
      console.log(`Merged PDF file ${mergedFilename} saved.`);
    } catch (err) {
      console.warn(err);
      return callback(Error('PDFCorrupted'));
    }
  // })

  return [mergedFilePath, nominationFilePath];
}
exports.generateNominationPDF = generateNominationPDF;


