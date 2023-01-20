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
    } = req.body || {};
    // ensure role is set to 'inactive' for non-activated users
    const user = await auth.create({
      roles: ["inactive"],
      guid: guid,
      username: username,
      firstname: firstname,
      lastname: lastname,
      email: email,
    });
    res.status(200).json(user);
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
 * Find user by GUID or IDIR
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.get = async (req, res, next) => {
  try {
    const { guid = null } = req.params || {};
    const user =
      (await UserModel.findOne({ guid: guid })) ||
      (await UserModel.findOne({ username: guid }));
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
    const { id = "" } = user || {};
    const {
      roles = [],
      username = "",
      firstname = "",
      lastname = "",
      email = "",
    } = data || {};

    // restrict administrator role updates to super-administrator users
    const adminRoles = ["super-administrator", "administrator"];
    if (
      user.hasOwnProperty("roles") &&
      !res.locals.user.roles.includes("super-administrator") &&
      (adminRoles.some((r) => user.roles.includes(r)) ||
        adminRoles.some((r) => roles.includes(r)))
    ) {
      return next(new Error("noAuth"));
    }

    // update user data in collection
    const response = await UserModel.updateOne(
      { _id: id },
      {
        username: username,
        firstname: firstname,
        lastname: lastname,
        email: email,
        $set: { roles: roles },
      },
      opts
    );

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
 * Auto-login using SSO GUID and username
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

    // get user data
    const user = (await UserModel.findOne({ guid: guid })) || {};
    const {
      email = "",
      roles = [],
      firstname = "",
      lastname = "",
    } = user || {};

    // successful login
    res.status(200).json({
      message: { msg: "Login successful!", type: "success" },
      user: {
        guid: guid,
        username: username,
        email: email,
        roles: roles,
        firstname: firstname,
        lastname: lastname,
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
