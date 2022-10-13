/*!
 * Index router
 * File: router.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const express = require('express')
const router = express.Router()

/**
 * Main API router
 */

router.get('/', function (req, res, next) {
  res.json('API is running.');
});
module.exports = router;
