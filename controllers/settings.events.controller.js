/*!
 * Events: Event settings controller
 * File: settings.events.controller.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const EventSettingsModel = require("../models/settings.events.model");

/**
 * Get global settings.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.getSettings = async (req, res, next) => {
  try {
    const result = await EventSettingsModel.exists({ _id: "globalSettings" });
    if (!result) {
      await EventSettingsModel.create({
        _id: "globalSettings",
        year: 2022,
        salesopen: "2022-10-24T08:00:00",
        salesclose: "2022-11-07T17:00:00",
      });
    }
    const settings = await EventSettingsModel.findById({
      _id: "globalSettings",
    });
    return res.status(200).json(settings);
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

/**
 * Update Settings data
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.updateSettings = async (req, res, next) => {
  try {
    const data = req.body._object.settings;

    // look up setting exists
    const result = await EventSettingsModel.exists({ _id: "globalSettings" });
    if (!result) return next(Error("invalidInput"));
    await EventSettingsModel.updateOne({ _id: "globalSettings" }, data);
    const newsettings = await EventSettingsModel.findById({
      _id: "globalSettings",
    });
    res.status(200).json(newsettings);
  } catch (err) {
    return next(err);
  }
};
