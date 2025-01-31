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

  const filter = categories.filter((cat) => {
    return (
      cat.key === category && cat.evaluation.find((sec) => sec.id === section)
    );
  });
  return (
    categories.filter((cat) => {
      return (
        cat.key === category &&
        cat.key === category &&
        cat.evaluation.find((sec) => sec === section)
      );
    }).length > 0
  );
};

/**
 * check if category exists
 * **/

exports.checkCategory = async (category) => {
  let categories = await SettingsModel.find({ type: "categories" });
  return (
    categories.filter((cat) => {
      return cat.value === category;
    }).length > 0
  );
};
