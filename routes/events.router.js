/*!
 * Events: Registration router
 * File: events.index.router.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const express = require("express");
const router = express.Router();
const registrationController = require("../controllers/registration.events.controller");
const tableController = require("../controllers/table.events.controller");
const EventSettingsController = require("../controllers/settings.events.controller");
const {
  authorizeAdmin,
  authorizeRegistrar,
} = require("../services/auth.services");

/**
 * Registration routes.
 */

router.post(
  "/registrations",
  authorizeRegistrar,
  registrationController.registerTable
);
router.post(
  "/registrations/delete/:id",
  authorizeRegistrar,

  registrationController.deleteRegistration
);

router.post(
  "/registrations/:id/push",
  authorizeRegistrar,
  registrationController.pushDetails
);

router.post(
  "/registrations/:id/pull",
  authorizeRegistrar,
  registrationController.pullDetails
);

router.post(
  "/registrations/:id",
  authorizeRegistrar,
  registrationController.updateTable
);

router.post(
  "/guests",
  authorizeRegistrar,
  registrationController.registerGuest
);
router.post(
  "/guests/delete/:id",
  authorizeRegistrar,
  registrationController.deleteGuest
);
router.post(
  "/guests/:id",
  authorizeRegistrar,
  registrationController.updateGuest
);
router.get("/guests", authorizeRegistrar, registrationController.getAllGuests);
router.get(
  "/registrations",
  authorizeRegistrar,
  registrationController.getAllRegistrations
);
router.get(
  "/registrations/:id/all",
  authorizeRegistrar,
  registrationController.getUserRegistrations
);
router.get(
  "/registrations/:id/",
  authorizeRegistrar,
  registrationController.getRegistration
);
router.get(
  "/registrations/:id/guests",
  authorizeRegistrar,
  registrationController.getRegistrationGuests
);

router.post("/seating", authorizeAdmin, tableController.createTable);
router.post("/seating/delete/:id", authorizeAdmin, tableController.deleteTable);
router.post(
  "/seating/generate",
  authorizeAdmin,
  tableController.generateTableSetup
);
router.post("/seating/deleteall", authorizeAdmin, tableController.deleteAll);
router.post(
  "/seating/:id/push",
  authorizeAdmin,
  tableController.pushTableDetails
);
router.post(
  "/seating/:id/pull",
  authorizeAdmin,
  tableController.pullTableDetails
);
router.post("/seating/:id", authorizeAdmin, tableController.updateTable);

router.get("/seating", authorizeRegistrar, tableController.getAllTables);
router.get(
  "/seating/:id/guests",
  authorizeAdmin,
  tableController.getTableGuests
);
router.get("/seating/count", authorizeAdmin, tableController.getTableCount); // PA-185 Added new count to route for future use
router.get("/seating/pdf", authorizeAdmin, tableController.getPdfLayout);
router.get("/seating/:id/", authorizeAdmin, tableController.getTable);

//settings routes
router.get("/settings", EventSettingsController.getSettings);
router.post(
  "/settings",
  authorizeAdmin,
  EventSettingsController.updateSettings
);

module.exports = router;
