/*!
 * Schema services
 * File: schema.services.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const SettingsModel = require("../models/settings.admin.model");

/**
 * get enumerated data by key
 * **/

exports.get = async (key) => {
  return await SettingsModel.findOne({ type: key });
};

/**
 * get enumerated data by key
 * **/

exports.lookup = async (settingType, value) => {
  try {
    const setting = await SettingsModel.findOne({ type: settingType }).exec();
    console.log(settingType, value);
    console.log(setting);
    if (setting === "undefined") return null;
    const found = setting.value.filter((item) => item.value === value);
    return found.length > 0 ? found[0].text : null;
  } catch (e) {
    console.log(e);
  }
};

exports.lookupByKey = async (settingType, lookupKey) => {
  let setting = await SettingsModel.findOne({ type: settingType }).exec();
  //let setting = "undefined";
  if (setting === "undefined") return null;
  const found = setting.value.filter((item) => item.key === lookupKey);
  return found.length > 0 ? found[0].label : null;
};

/**
 * check if category contains given section
 * **/

exports.checkSection = async (section, category) => {
  const categories = (await SettingsModel.findOne({ type: "categories" }))
    .value;

  /*
    // Not being used.
    const filter = categories.filter((cat) => {
      return (
        cat.key === category && cat.evaluation.find((sec) => sec.id === section)
      );
    });
  */
  return (
    categories.filter((cat) => {
      return (
        cat.key === category &&
        // duplicate check cat.key === category &&
        cat.evaluation.find((sec) => sec === section)
      );
    }).length > 0
  );
};

/**
 * check if category exists
 * **/

exports.checkCategory = async (category) => {
  // Changed to (await .findOne()).value
  let categories = (await SettingsModel.findOne({ type: "categories" }))
    .value;
  return (
    categories.filter((cat) => {
      
      // Change from .value to .key for matching
      return cat.key === category;
    }).length > 0
  );
};
