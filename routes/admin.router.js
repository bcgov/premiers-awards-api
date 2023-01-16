/*!
 * Admin router
 * File: admin.index.router.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/users.admin.controller');
const settingsController = require("../controllers/settings.admin.controller");
const {authorizeAdmin, authorizeSuperAdmin, authorizeData} = require('../services/auth.services');

/**
 * Admin user routes.
 */

router.post('/users/register', userController.register);
router.get('/users/login/', userController.login);
router.get('/users/logout/', userController.logout);
router.get('/users/info', userController.info);
router.get('/users/view/', authorizeAdmin, userController.getAll);
router.get('/users/view/:guid', authorizeAdmin, userController.get);
router.post('/users/update/:guid', authorizeAdmin, userController.update);
router.get('/users/delete/:guid', authorizeSuperAdmin, userController.remove);

/**
 * Admin settings routes.
 */

router.get('/settings/get/:id', authorizeData, settingsController.get);
router.get('/settings/type/:type/', authorizeData, settingsController.getByType);

module.exports = router;
