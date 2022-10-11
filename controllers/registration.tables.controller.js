/*!
 * User controller
 * File: user.admin.controller.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const { default: mongoose } = require("mongoose");
const { genID } = require("../services/validation.services.js");
const GuestModel = require("../models/guest.model.js");
const RegistrationModel = require("../models/registration.model.js");

/**
 * Retrieve all registration data.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.getAllRegistrations = async (req, res, next) => {
  try {
    const registrations = await RegistrationModel.find({});
    return res.status(200).json(registrations);
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

exports.getAllGuests = async (req, res, next) => {
  try {
    const guests = await GuestModel.find({});
    //console.log(guests);
    return res.status(200).json(guests);
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

exports.getRegistration = async (req, res, next) => {
  try {
    const id = req.params.id;
    let registration;

    if (mongoose.Types.ObjectId.isValid(id)) {
      registration = await RegistrationModel.find({
        _id: id,
      });
    } else {
      registration = await RegistrationModel.find({
        guid: id,
      });
    }

    return res.status(200).json(registration);
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

exports.getRegistrationGuests = async (req, res, next) => {
  try {
    const id = req.params.id;

    // look up guests exist on registration

    let guests;

    if (mongoose.Types.ObjectId.isValid(id)) {
      guests = await RegistrationModel.find({
        _id: id,
      }).populate("guests");
    } else {
      guests = await RegistrationModel.find({
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
 * Submit new registration
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method post
 * @src public
 */

exports.registerTable = async (req, res, next) => {
  try {
    const userGUID = req.params.id;
    const {
      guid = "",
      registrar = "",
      organization = "",
      branch = "",
      primarycontact = "",
      primaryemail = "",
      financialcontact = "",
      clientministry = "",
      respcode = "",
      serviceline = "",
      stob = "",
      project = "",
    } = req.body || {};

    // insert new record into collection
    const registration = await RegistrationModel.create({
      guid,
      registrar,
      organization,
      branch,
      primarycontact,
      primaryemail,
      financialcontact,
      clientministry,
      respcode,
      serviceline,
      stob,
      project,
    });

    res.status(200).json(registration);
  } catch (err) {
    return next(err);
  }
};

/**
 * Update Financial Registration data
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
    const table = await RegistrationModel.findById(id);
    if (!table) return next(Error("invalidInput"));
    await RegistrationModel.updateOne({ _id: id }, data);
    const newTable = await RegistrationModel.findById(id);
    res.status(200).json(newTable);
  } catch (err) {
    return next(err);
  }
};

exports.registerGuest = async (req, res, next) => {
  try {
    const gu_id = genID();
    const {
      guid = gu_id,
      registration = "",
      organization = "",
      firstname = "",
      lastname = "",
      attendancetype = "",
      accessibility = {
        wheelchairrequired: false,
        attendantrequired: false,
        othermobilityneeds: false,
      },
      dietary = {
        dairyfree: false,
        glutenfree: false,
        sugarfree: false,
        shellfishfree: false,
        vegetarian: false,
        vegan: false,
        peanutfree: false,
        nutfree: false,
        other: false,
      },
    } = req.body || {};
    // insert new record into collection
    const newGuest = await GuestModel.create({
      guid,
      registration,
      organization,
      firstname,
      lastname,
      attendancetype,
      accessibility,
      dietary,
    });
    //const { id = null } = registration || {};

    // check that registration exists
    // if (!id) return next(new Error("noRecord"));

    res.status(200).json(newGuest);
  } catch (err) {
    return next(err);
  }
};

/**
 * Update Guest data
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.updateGuest = async (req, res, next) => {
  try {
    const data = req.body;
    const id = req.params.id;

    // look up guest exists
    const guest = await GuestModel.findById(id);
    if (!guest) return next(Error("invalidInput"));

    // reject updates to submitted guests
    // if (guest.submitted)
    //   return next(Error('alreadySubmitted'));

    // update existing guest in collection
    const response = await GuestModel.updateOne({ _id: id }, data);
    res.status(200).json(response);
  } catch (err) {
    return next(err);
  }
};

/**
 * Remove guest
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.deleteGuest = async (req, res, next) => {
  try {
    const id = req.params.id;

    // look up guest exists
    const guest = await GuestModel.findById(id);
    if (!guest) return next(Error("invalidInput"));

    const response = await GuestModel.deleteOne({ _id: id });

    res.status(200).json(response);
  } catch (err) {
    return next(err);
  }
};

/**
 * Removes regisration and all connected guests
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.deleteRegistration = async (req, res, next) => {
  try {
    const id = req.params.id;

    // look up registration exists
    const registration = await RegistrationModel.findById(id);
    if (!registration) return next(Error("invalidInput"));

    for (let each of registration.guests) {
      const guestID = each._id;
      await GuestModel.deleteOne({ _id: guestID });
    }

    const response = await RegistrationModel.deleteOne({ _id: id });

    res.status(200).json(response);
  } catch (err) {
    return next(err);
  }
};
