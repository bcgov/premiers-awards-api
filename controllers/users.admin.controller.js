/*!
 * User controller
 * File: users.admin.controller.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const UserModel = require("../models/user.admin.model");
const auth = require("../services/auth.services");
const opts = { runValidators: true };

/**
 * Register new user
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method post
 * @src public
 */

exports.register = async (req, res, next) => {
  try {
    const {
      guid = "",
      username = "",
      firstname = "",
      lastname = "",
      email = "",
      eventregistrar = false,
    } = req.body || {};
    // ensure role is set to 'inactive' for non-activated users
    const user = await auth.create({
      role: "inactive",
      guid: guid,
      username: username,
      firstname: firstname,
      lastname: lastname,
      email: email,
      eventregistrar: eventregistrar,
    });
    res.status(201).json(user);
  } catch (err) {
    return next(err);
  }
};

/**
 * Activate registered nominator
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method post
 * @src public
 */

exports.activate = async (req, res, next) => {
  try {
    const { guid = null } = req.params || {};
    const user = await UserModel.findOne({ guid: guid });
    if (!user) return next(Error("noRecord"));

    // update user role to nominator
    const response = await UserModel.updateOne(
      { guid: guid },
      { role: "nominator" },
      opts
    );

    // return new user
    res.status(201).json(response);
  } catch (err) {
    return next(err);
  }
};

/**
 * Assign registered user new role
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method post
 * @src public
 */

exports.assign = async (req, res, next) => {
  try {
    const { guid = null } = req.params || {};
    const { role = null } = req.body || {};
    const user = await UserModel.findOne({ guid: guid });
    if (!user) return next(Error("noRecord"));
    // update user role
    const response = await UserModel.updateOne(
      { guid: guid },
      { role: role },
      opts
    );
    res.status(201).json(response);
  } catch (err) {
    return next(err);
  }
};

/**
 * Get user data from SAML authenticator
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method post
 * @src public
 */

exports.info = async (req, res, next) => {
  try {
    res.status(200).json(res.locals.user);
  } catch (err) {
    return next(err);
  }
};

/**
 * Find user by GUID
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.get = async (req, res, next) => {
  try {
    const { guid = null } = req.params || {};
    const user = await UserModel.findOne({ guid: guid });
    return res.status(200).json(user);
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

/**
 * Retrieve all registered (admin) users.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.getAll = async (req, res, next) => {
  try {
    const users = await UserModel.find({});
    return res.status(200).json(users);
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

/**
 * Update user data.
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method post
 * @src public
 */

exports.update = async (req, res, next) => {
  try {
    let guid = req.params.guid;
    let data = req.body;

    // look up user
    const user = await UserModel.findOne({ guid: guid });
    if (!user) return next(Error("noRecord"));

    // update user data in collection
    const response = await UserModel.updateOne({ _id: user.id }, data, opts);
    res.status(200).json(response);
  } catch (err) {
    return next(err);
  }
};

/**
 * Delete user.
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method post
 * @src public
 */

exports.remove = async (req, res, next) => {
  try {
    // get requested user GUID
    let guid = req.params.guid;

    // look up user
    const user = await UserModel.findOne({ guid: guid });
    if (!user) return next(Error("noRecord"));

    // ensure user not deleting themselves
    if (res.locals.user.guid === guid) return next(Error("invalidInput"));

    // delete user data from collection
    const response = await UserModel.deleteOne({ guid: guid });

    res.status(200).json(response);
  } catch (err) {
    return next(err);
  }
};

/**
 * Admin auto-login using SSO GUID and username
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method post
 * @src public
 */

exports.login = async (req, res, next) => {
  try {
    // user data has not been retrieved
    if (!res.locals.user) return next(new Error("noAuth"));

    const { guid = "", username = "" } = res.locals.user;

    console.log("Authenticating:", guid, username);

    // user is not properly authenticated
    if (!guid || !username) return next(new Error("noAuth"));

    // check if user is an administrator
    const adminUser = (await UserModel.findOne({ guid: guid })) || {};
    const {
      email = "",
      role = "",
      firstname = "",
      lastname = "",
      eventregistrar = false,
    } = adminUser || {};

    // successful login
    res.status(200).json({
      message: { msg: "Login successful!", type: "success" },
      user: {
        guid: guid,
        username: username,
        email: email,
        role: role,
        firstname: firstname,
        lastname: lastname,
        eventregistrar: eventregistrar,
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * User sign out.
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method post
 * @src public
 */

exports.logout = async (req, res, next) => {
  try {
    // clear session data
    res.cookie("session", null, {
      httpOnly: true,
      sameSite: "strict",
      signed: true,
      maxAge: 0,
    });
    res.cookie("SMSESSION", null, {
      httpOnly: true,
      sameSite: "strict",
      signed: true,
      maxAge: 0,
    });

    // successful login
    res.status(200).json({
      message: { msg: "Logout successful!", type: "success" },
      user: {},
    });
  } catch (err) {
    return next(err);
  }
};
