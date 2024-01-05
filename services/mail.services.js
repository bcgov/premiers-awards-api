/*!
 * Mail processing services
 * File: mail.services.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

"use strict";
const ejs = require("ejs");
const nodemailer = require("nodemailer");
const path = require("path");
// const fs = require("fs");
//const Transaction = require("../models/transactions.model");
const { decodeError } = require("../error");
const { format } = require("date-fns");

const UserModel = require("../models/user.admin.model");

// template directory
const dirPath = "/resources/email_templates/";

/**
 * Log mail event
 * @param error
 * @param recipient
 * @param response
 * @private
 */

const _logMail = async (error, response, recipient) => {
  const parsedError = error
    ? decodeError(error)
    : { hint: "N/A", msg: "Mail delivered successfully" };
  const { hint, msg } = parsedError || {};
  const { id, user } = !!recipient.recipient
    ? recipient.recipient
    : recipient || {};
  const transaction = {
    recipient: id,
    error: !!error,
    code: error ? "failedMailSend" : "successMailSend",
    description: `${msg ? msg : "Error not indexed"} (${
      hint ? hint : "N/A"
    })`.slice(0, 256),
    details: `[${JSON.stringify(error)}, ${JSON.stringify(response)}]`,
  };

  // include user ID if present
  if (user) {
    const { id } = user || {};
    transaction.user = id || null;
  }

  // TODO: log event in transaction table
  //await Transaction.create(transaction);
};

const _getAdminEmails = async (error, emails) => {
  var admins = await UserModel.find({
    roles: {
      $in: ["super-administrator", "administrator"],
    },
  });
  return admins.map((user) => user.email);
};

/**
 * Send mail
 * @param to (array)
 * @param subject
 * @param template
 * @param data
 * @param from
 * @param fromName
 // * @param attachments
 // * @param options
 */
const sendMail = async (
  to,
  subject,
  template,
  data,
  from,
  fromName
  // attachments,
  // options={},
) => {
  // set mail parameters
  const templatePath = path.join(__dirname, "..", dirPath, template);
  const templateData = { ...{ title: subject }, ...data };

  try {
    /**
     * Configure Nodemailer:
     * - create reusable transporter object using the default SMTP transport
     */

    let transporter = nodemailer.createTransport({
      host: process.env.MAIL_SERVER,
      port: process.env.MAIL_PORT,
      secure: false, // true for 465, false for other ports
      pool: true,
    });

    // generate html body using template file
    const body = await ejs.renderFile(templatePath, templateData, {
      async: true,
    });
    const response = await transporter.sendMail({
      from: `"${fromName}" <${from}>`, // sender address
      to: to.join(", "), // list of receivers
      subject: subject, // subject line
      html: body, // html body
    });
    // TODO: log send event
    // await _logMail(null, response, data);
    // return mail send response
    return [null, response];
  } catch (error) {
    console.error(error);
    // TODO: log error as transaction record
    // _logMail(
    //   error,
    //   {
    //     from: `"${fromName}" <${from}>`,
    //     to: to.join(", "),
    //     subject: subject,
    //   },
    //   data
    // ).catch(console.error);
    return [error, null];
  }
};

/**
 * Send registration email confirmation
 * @param user
 */
module.exports.sendRegistrationNotification = async (user) => {
  // check status of registration
  const { service, supervisor, contact } = user || {};
  const { confirmed, milestone } = service || {};
  const isLSA = milestone >= 25;

  // check if registration is confirmed
  if (!confirmed) return;

  // select confirmation email
  // - LSA registrations (milestone >= 25)
  // - Service Pin registration (milestone < 25)

  const from = process.env.MAIL_FROM_ADDRESS;
  const fromName = process.env.MAIL_FROM_NAME;

  const subject = "Premiers Awards - Registration Approval Request";

  const adminTemplate = "email-user-account-admin-approval.ejs";

  const userTemplate = "email-user-account-approval-needed.ejs";

  const adminEmails = _getAdminEmails();
  // send ADMIN approval alert email
  const [error1, response1] = await sendMail(
    adminEmails,
    subject,
    adminTemplate,
    user,
    from,
    fromName,
    [],
    null
  );

  // send USER confirmation mail
  const [error2, response2] = await sendMail(
    [contact.office_email || ""],
    subject,
    userTemplate,
    user,
    from,
    fromName,
    [],
    null
  );

  return [error1 || error2 || null, { response1, response2 }];
};

module.exports.sendRegistrationApprovedNotification = async (email, roles) => {
  // send confirmation mail to supervisor
  return await sendMail(
    [email],
    "Premiers Awards Account Approved",
    "email-user-account-approved.ejs",
    roles,
    process.env.MAIL_FROM_ADDRESS,
    process.env.MAIL_FROM_NAME,
    [],
    null
  );
};
