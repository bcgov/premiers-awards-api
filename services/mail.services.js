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
 * Send user registration confirmation & admin a notification
 * @param user
 */
module.exports.sendRegistrationNotification = async (user) => {
  const adminEmails = await _getAdminEmails();

  const from = process.env.MAIL_FROM_ADDRESS;
  const fromName = process.env.MAIL_FROM_NAME;

  const adminTemplate = "email-user-account-admin-alert.ejs";
  const userTemplate = "email-user-account-pending-registration.ejs";

  // send ADMIN approval alert email
  const [error1, response1] = await sendMail(
    adminEmails,
    "Registration Approval Request",
    adminTemplate,
    user,
    from,
    fromName,
    [],
    null
  );

  // send USER confirmation mail
  const [error2, response2] = await sendMail(
    [user.email || ""],
    "User Registration Pending Approval",
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
  // send confirmation mail to user
  if (roles.includes("registrar")) {
    return await sendMail(
      [email],
      "Account Approved",
      "email-user-account-approved-registrar.ejs",
      roles,
      process.env.MAIL_FROM_ADDRESS,
      process.env.MAIL_FROM_NAME,
      [],
      null
    );
  } else {
    return await sendMail(
      [email],
      "Account Approved",
      "email-user-account-approved-nominator.ejs",
      roles,
      process.env.MAIL_FROM_ADDRESS,
      process.env.MAIL_FROM_NAME,
      [],
      null
    );
  }
};
