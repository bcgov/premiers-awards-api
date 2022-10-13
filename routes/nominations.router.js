/*!
 * Nominations controller
 * File: entries.nominations.controller.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const express = require('express');
const router = express.Router();
const dataController = require('../controllers/entries.nominations.controller');
const attachmentController = require("../controllers/attachments.nominations.controller");
const {authorizeData, authorizeUser, authorizeAdmin, authorizeAttachment} = require('../services/auth.services')
const {uploader} = require("../services/files.services");

/**
 * Nomination data routes
 */

router.get('/data/view/:id', authorizeData, dataController.get);
router.get('/data/view/', authorizeAdmin, dataController.getAll);
router.get('/data/user/:guid', authorizeUser, dataController.getByUserID);
router.post('/data/create', dataController.create);
router.post('/data/update/:id', authorizeData, dataController.update);
router.post('/data/submit/:id', authorizeData, dataController.submit);
router.get('/data/unsubmit/:id', authorizeAdmin, dataController.unsubmit);
router.get('/data/delete/:id', authorizeData, dataController.delete);
router.post('/data/export/:format', authorizeAdmin, dataController.exporter);
router.post('/data/download/:id', authorizeAdmin, dataController.download);

/**
 * Nomination attachments routes
 */

router.post('/attachments/upload/:year/:id', uploader, attachmentController.upload);
router.get('/attachments/view/:id', authorizeData, attachmentController.getByNomination);
router.get('/attachments/download/:id', authorizeAttachment, attachmentController.download);
router.get('/attachments/delete/:id', authorizeAttachment, attachmentController.delete);

module.exports = router;
