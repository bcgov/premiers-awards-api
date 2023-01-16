/*!
 * Index indexRouter
 * File: indexRouter.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const express = require('express')
const router = express.Router()

/**
 * Main API indexRouter
 */

router.get('/', function (req, res, next) {
  res.json('API is running.');
});

// ignore favicon requests (browser tests)
router.get('/favicon.ico', (req, res) => res.status(204));

module.exports = router;
