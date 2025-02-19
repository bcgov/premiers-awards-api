/*!
 * Admin router
 * File: admin.index.router.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const express = require("express");
const router = express.Router();
const userController = require("../controllers/users.admin.controller");
const settingsController = require("../controllers/settings.admin.controller");
const {
  authorizeAdmin,
  authorizeSuperAdmin,
  authorizeData,
} = require("../services/auth.services");

/**
 * Admin user routes.
 */

router.post("/users/register", userController.register);
router.get("/users/login/", userController.login);
router.get("/users/logout/", userController.logout);
router.get("/users/info", userController.info);
router.get("/users/view/", authorizeAdmin, userController.getAll);
router.get("/users/view/:guid", authorizeAdmin, userController.get);
router.post("/users/update/:guid", authorizeAdmin, userController.update);
router.get("/users/delete/:guid", authorizeSuperAdmin, userController.remove);
router.get("/users/resetusers/", authorizeAdmin, userController.resetUsers);

/**
 * Admin settings routes.
 */

router.get("/settings/view/", settingsController.getAll);
router.get("/settings/view/:id", settingsController.get);
router.get(
  "/settings/type/:type/",
  authorizeData,
  settingsController.getByType
);
router.post("/settings/create", authorizeSuperAdmin, settingsController.create);
router.post(
  "/settings/update/:id",
  authorizeSuperAdmin,
  settingsController.update
);
router.get(
  "/settings/delete/:id",
  authorizeSuperAdmin,
  settingsController.delete
);
router.get(
  "/settings/regeneratenominationpdfs",
  settingsController.regenerateNominationPDFs
);

module.exports = router;
