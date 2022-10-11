/*!
 * Global settings controller
 * File: settings.admin.controller.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const SettingsModel = require('../models/settings.model')

/**
 * Get global settings.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.get = async (req, res, next) => {

  try {
    let id = req.params.id;
    const setting = await SettingsModel.findById(id);
    return res.status(200).json(setting);
  } catch (err) {
    console.error(err)
    return next(err);
  }
};

/**
 * Get settings data for requested type.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.getByType = async (req, res, next) => {
  try {
    const { type=null } = req.params || {};
    // retrieve settings for given type
    const settings = await SettingsModel.find({type: type});
    return res.status(200).json(settings);
  } catch (err) {
    console.error(err)
    return next(err);
  }
};

/**
 * Create new setting
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.create = async (req, res, next) => {
  try {
    let data = req.body;
    const { type='', value='' } = data || {};

    if (!type || !value)
      return next(new Error('invalidInput'));

    // check if setting already exists in collection
    const currentSettings = await SettingsModel.find({type: type, value: value});
    if (currentSettings)
      return next(new Error('recordExists'));

    // insert new record into collection
    const setting = await SettingsModel.create(data);
    res.status(200).json(setting);

  } catch (err) {
    return next(err);
  }
};


/**
 * Update setting
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.update = async (req, res, next) => {
  try {
    let id = req.params.id;
    let data = req.body;

    // look up setting
    const setting = await SettingsModel.findById(id);
    if (!setting)
      return next(Error('invalidInput'));

    // update setting in collection
    const response = await SettingsModel.updateOne({ _id: id }, data);
    res.status(200).json(response);
  } catch (err) {
    return next(err);
  }
};

/**
 * Remove setting
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.delete = async (req, res, next) => {
  try {

    // get requested nomination ID
    let id = req.params.id;

    // look up setting
    const setting = await SettingsModel.findById(id);
    if (!setting)
      return next(Error('noRecord'));

    const response = await SettingsModel.deleteOne({_id: id})

    res.status(200).json(response);

  } catch (err) {
    return next(err);
  }
};

