/*!
 * Registration router
 * File: tables.router.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const express = require("express");
const router = express.Router();
const registrationController = require("../controllers/registration.tables.controller");
//const {authorizeAdmin, authorizeSuperAdmin} = require('../services/auth.services')

/**
 * Registration routes.
 */

router.post("/registrations", registrationController.registerTable);
router.post("/registrations/:id", registrationController.updateTable);
router.post(
  "/registrations/delete/:id",
  registrationController.deleteRegistration
);
router.post("/guests", registrationController.registerGuest);
router.post("/guests/:id", registrationController.updateGuest);
router.post("/guests/delete/:id", registrationController.deleteGuest);
router.get("/guests", registrationController.getAllGuests);
router.get("/registrations", registrationController.getAllRegistrations);
router.get("/registrations/:id/", registrationController.getRegistration);
router.get(
  "/registrations/:id/guests",
  registrationController.getRegistrationGuests
);

module.exports = router;
