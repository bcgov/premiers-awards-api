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
const {
    authorizeData,
    authorizeMultiData,
    authorizeUser,
    authorizeAdmin,
    authorizeAttachment,
    authorizeNominator
} = require('../services/auth.services')
const {uploader} = require("../services/files.services");

/**
 * Nomination data routes
 */

router.get('/create/:category', authorizeNominator, dataController.create);
router.get('/view/user/:guid', authorizeUser, dataController.getByUserID);
router.get('/view/:id', authorizeData, dataController.get);
router.get('/view/', authorizeData, dataController.getAll);
router.post('/update/:id', authorizeData, dataController.update);
router.post('/submit/:id', authorizeData, dataController.submit);
router.get('/unsubmit/:id', authorizeAdmin, dataController.unsubmit);
router.post('/delete/:id', authorizeData, dataController.delete);
router.get('/export/:format', authorizeMultiData, dataController.exporter);
router.get('/download/:id', authorizeData, dataController.download);

/**
 * Nomination attachments routes
 */

router.post('/attachments/upload/:id', uploader, attachmentController.upload);
router.post('/attachments/update/:id', authorizeAttachment, attachmentController.update);
router.get('/attachments/view/:id', authorizeData, attachmentController.getByNomination);
router.get('/attachments/download/:id', authorizeAttachment, attachmentController.download);
router.get('/attachments/delete/:id', authorizeAttachment, attachmentController.delete);

module.exports = router;
