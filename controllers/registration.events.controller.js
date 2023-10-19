/*!
 * Events: Event registration controller
 * File: registration.events.controller.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const { default: mongoose } = require("mongoose");
const { genID } = require("../services/validation.services.js");
const GuestModel = require("../models/guest.events.model.js");
const RegistrationModel = require("../models/registration.events.model.js");

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
    if (!res.locals.user) return next(new Error("noAuth"));
    const { roles = [] } = res.locals.user || {};
    if (
      roles.includes("administrator") ||
      roles.includes("super-administrator")
    ) {
      const registrations = await RegistrationModel.find({});
      return res.status(200).json(registrations);
    } else if (roles.includes("registrar")) {
      const userOrg = res.locals.user.organization;

      if (userOrg === undefined || userOrg === "") {
        const registration = await RegistrationModel.find({
          guid: res.locals.user.guid,
        });
        const organization = registration[0].organization;
        const registrations = await RegistrationModel.find({
          organization: organization,
        });
        return res.status(200).json(registrations);
      } else {
        const registrations = await RegistrationModel.find({
          organization: userOrg,
        });
        return res.status(200).json(registrations);
      }
    }
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

exports.getAllGuests = async (req, res, next) => {
  try {
    const guests = await GuestModel.find({}).populate("registration");
    console.log(guests);
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

exports.getMinistryRegistrations = async (req, res, next) => {
  try {
    const id = req.params.id;
    const registration = await RegistrationModel.find({
      "users.guid": { $regex: id },
    });
    const ministry = registration.organization;
    //const registrations = wait RegistrationModel.find({})
    return res.status(200).json(registration);
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

exports.getUserRegistrations = async (req, res, next) => {
  try {
    const id = req.params.id;
    const registration = await RegistrationModel.find({
      "users.guid": { $regex: id },
    });
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
      })
        .populate("guests")
        .populate({
          path: "guests",
          populate: {
            path: "registration",
          },
        });
    } else {
      guests = await RegistrationModel.find({
        guid: id,
      }).populate({
        path: "guests",
        populate: {
          path: "registration",
        },
      });
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
      users = [],
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
      submitted = false,
    } = req.body || {};

    // insert new record into collection
    const registration = await RegistrationModel.create({
      guid,
      registrar,
      users,
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
      submitted,
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
    const registration = await RegistrationModel.findById(id);
    if (!registration) return next(Error("invalidInput"));
    await RegistrationModel.updateOne({ _id: id }, data);
    const newRegistration = await RegistrationModel.findById(id);
    res.status(200).json(newRegistration);
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
      pronouns = [],
      custompronouns = "",
      hascustompronouns = false || true,
      hasexternalorganization = false || true,
      supportingfinalist = "",
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
      pronouns,
      custompronouns,
      hascustompronouns,
      supportingfinalist,
      hasexternalorganization,
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

/**
 * Push Financial Registration information to registration
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.pushDetails = async (req, res, next) => {
  try {
    const data = req.body;
    const id = req.params.id;

    // look up guest exists
    const registration = await RegistrationModel.findById(id);
    if (!registration) return next(Error("invalidInput"));
    await RegistrationModel.updateOne({ _id: id }, { $push: data });
    const newRegistration = await RegistrationModel.findById(id);
    res.status(200).json(newRegistration);
  } catch (err) {
    return next(err);
  }
};

/**
 * Pull Financial Registration information from registration
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.pullDetails = async (req, res, next) => {
  try {
    const data = req.body;
    const id = req.params.id;

    // look up guest exists
    const registration = await RegistrationModel.findById(id);
    if (!registration) return next(Error("invalidInput"));
    await RegistrationModel.updateOne({ _id: id }, { $pull: data });
    const newRegistration = await RegistrationModel.findById(id);
    res.status(200).json(newRegistration);
  } catch (err) {
    return next(err);
  }
};
