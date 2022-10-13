/*!
 * Authentication services
 * File: auth.services.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const axios = require("axios");
const UserModel = require("../models/user.admin.model");
const NominationModel = require("../models/entry.nominations.model");
const AttachmentModel = require("../models/attachment.nominations.model");
const { validateEmail } = require("./validation.services");

"use strict";

/**
 * Authenticate user based on IDIR credentials.
 * - retrieves current session data from SAML authenticator
 * - returns user data to client in session cookies
 *
 * @param req
 * @param res
 * @param {Array} allowedRoles
 * @src public
 */

exports.authenticate = async (req, res, next) => {
  try {
    // skip authentication if testing on local development
    if (process.env.NODE_ENV === "local") {
      res.locals.user = (await UserModel.findOne({
        guid: process.env.TEST_ADMIN_GUID,
      })) || {
        guid: process.env.TEST_ADMIN_GUID,
        username: process.env.TEST_ADMIN_ID,
      };
      console.log("Authenticating test user", res.locals.user);
      return next();
    }

    // get current user data (if authenticated)
    const { session = null, SMSESSION = "" } = req.cookies || {};
    let date = new Date();
    const expDays = 1;
    date.setTime(date.getTime() + expDays * 24 * 60 * 60 * 1000);
    const expires = "expires=" + date.toUTCString();
    const SMSCookie =
        "SMSESSION=" +
        SMSESSION +
        "; " +
        expires +
        "; path=/; HttpOnly; Secure=true;";
    const SessionCookie =
        "session=" +
        session +
        "; " +
        expires +
        "; path=/; HttpOnly; Secure=true;";

    // call SAML API - user data endpoint
    let response = await axios.get(`${process.env.APP_BASE_URL}/user_info`, {
      headers: {
        Cookie: `${SessionCookie} ${SMSCookie}`,
      },
    });
    const { data = {} } = response || {};
    const { SMGOV_GUID = [null], username = [null] } = data || {};

    // test that tokens exist
    if (!data || !SMGOV_GUID[0] || !username[0])
      return next(new Error("noAuth"));

    // reformat guest user data
    const guestUserData = {
      guid: SMGOV_GUID[0],
      username: username[0],
      role: "inactive",
    };

    // check if user is registered
    const registeredUserData = await UserModel.findOne({
      guid: guestUserData.guid,
    });

    // store user data in response for downstream middleware
    res.locals.user = registeredUserData || guestUserData;
    return next();
  } catch (err) {
    return next(err);
  }
};

/**
 * Authorize user access based on ID submitted.
 *
 * @param req
 * @param res
 * @param {Array} allowedRoles
 * @src public
 */

exports.authorizeData = async (req, res, next) => {
  try {
    if (
        res.locals.user.role === "administrator" ||
        res.locals.user.role === "super-administrator"
    ) {
      return next();
    }
    const { id = null } = req.params || {};
    const nomination = await NominationModel.findById(id);
    const { guid = "" } = nomination || {};
    if (res.locals.user.guid === guid) {
      return next();
    } else {
      return next(new Error("noAuth"));
    }
  } catch (err) {
    return next(err);
  }
};

/**
 * Authorize user access based on attachment ID submitted.
 *
 * @param req
 * @param res
 * @param {Array} allowedRoles
 * @src public
 */

exports.authorizeAttachment = async (req, res, next) => {
  try {
    if (
        res.locals.user.role === "administrator" ||
        res.locals.user.role === "super-administrator"
    ) {
      return next();
    }
    const { id = null } = req.params || {};
    const attachment = await AttachmentModel.findById(id);
    const nomination = await NominationModel.findById(
        attachment.nomination || ""
    );
    const { guid = "", role = "" } = nomination || {};
    // reject unregistered users
    if (!role || role === "inactive") return next(new Error("noAuth"));
    if (res.locals.user.guid === guid) {
      return next();
    } else {
      return next(new Error("noAuth"));
    }
  } catch (err) {
    return next(err);
  }
};

/**
 * Authorize user access based on GUID.
 *
 * @param req
 * @param res
 * @param {Array} allowedRoles
 * @src public
 */

exports.authorizeUser = async (req, res, next) => {
  try {
    // reject unauthenticated users
    if (!res.locals.user) return next(new Error("noAuth"));
    const { role = "" } = res.locals.user || {};
    const { guid = null } = req.params || {};
    // reject unregistered users
    if (!role || role === "inactive") return next(new Error("noAuth"));
    // ensure GUID attached to the nomination matches the user GUID
    if (
        res.locals.user.guid === guid ||
        role === "administrator" ||
        role === "super-administrator"
    ) {
      return next();
    } else {
      return next(new Error("noAuth"));
    }
  } catch (err) {
    return next(err);
  }
};

/**
 * Authorize user access based on user privileges.
 *
 * @param req
 * @param res
 * @param {Array} allowedRoles
 * @src public
 */

exports.authorizeRegistrar = async (req, res, next) => {
  if (!res.locals.user) return next(new Error("noAuth"));
  const { role = "" } = res.locals.user || {};
  if (
      role === "registrar" ||
      role === "nominator" ||
      role === "administrator" ||
      role === "super-administrator"
  ) {
    next();
  } else {
    return next(new Error("noAuth"));
  }
};

exports.authorizeAdmin = async (req, res, next) => {
  if (!res.locals.user) return next(new Error("noAuth"));
  const { role = "" } = res.locals.user || {};
  if (role === "administrator" || role === "super-administrator") {
    next();
  } else {
    return next(new Error("noAuth"));
  }
};

exports.authorizeSuperAdmin = async (req, res, next) => {
  if (!res.locals.user) return next(new Error("noAuth"));
  const { role = "" } = res.locals.user || {};
  if (role === "super-administrator") {
    next();
  } else {
    return next(new Error("noAuth"));
  }
};

/**
 * Create admin user
 *
 * @public
 * @return {Promise}
 */

const createUser = async (userData) => {
  const {
    guid = null,
    username = null,
    firstname = "",
    lastname = "",
    email = "",
    role = "",
  } = userData || {};

  // Validate user input
  if (!(guid && username && role)) {
    throw new Error("invalidInput");
  }
  if (!!email && !validateEmail(email)) {
    throw new Error("invalidEmail");
  }

  // validate if user exists in database
  const existingUser = await UserModel.findOne({ guid: guid });
  if (existingUser) {
    throw new Error("userExists");
  }

  // Create user in our database
  return await UserModel.create({
    guid: guid,
    username: username,
    firstname: firstname,
    lastname: lastname,
    email: email.toLowerCase(),
    role: role,
  });
};
exports.create = createUser;

/**
 * Initialize users collection
 * - creates default super-admin user (if none exists)
 */

const initUsers = async () => {
  if (!process.env.ADMIN_GUID || !process.env.ADMIN_ID) {
    console.warn("Default super-administrator not initialized.");
    return;
  }
  const user = await UserModel.findOne({ guid: process.env.ADMIN_GUID });
  if (!user) {
    await createUser({
      guid: process.env.ADMIN_GUID,
      username: process.env.ADMIN_ID,
      role: "super-administrator",
    });
    console.log("Default super-administrator created.");
  } else {
    console.log("Default super-administrator initialized.");
  }
};
initUsers().catch(console.error);
