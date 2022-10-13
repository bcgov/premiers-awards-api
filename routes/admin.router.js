/*!
 * Admin router
 * File: admin.router.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/users.admin.controller');
const {authorizeAdmin, authorizeSuperAdmin, authorizeData} = require('../services/auth.services')
const settingsController = require("../controllers/settings.admin.controller");

/**
 * Admin user routes.
 */

router.post('/users/register', authController.register);
router.get('/users/login/', authController.login);
router.get('/users/logout/', authController.logout);
router.get('/users/info', authController.info);
router.get('/users/activate/:guid', authorizeAdmin, authController.activate);
router.get('/users/view/', authorizeAdmin, authController.getAll);
router.get('/users/view/:guid', authorizeAdmin, authController.get);
router.post('/users/update/:guid', authorizeAdmin, authController.update);
router.get('/users/delete/:guid', authorizeAdmin, authController.remove);
router.post('/users/assign/:guid', authorizeSuperAdmin, authController.assign);

/**
 * Admin settings routes.
 */

router.get('/settings/get/:id', authorizeData, settingsController.get);
router.get('/settings/type/:type/', authorizeData, settingsController.getByType);

module.exports = router;
