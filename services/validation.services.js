/*!
 * Form validation services/utilities
 * File: validation.services.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

/**
 * Generate random ID string
 *
 * **/

exports.genID = function() {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let id = '';
  for ( let i = 0; i < chars.length; i++ ) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Get word count for given string (based on 5 character word length)
 * **/

exports.getWordCount = function (strRaw) {
  const str = strRaw.trim() || '';
  return str !== '' ? str.replace(/[^0-9a-zA-Z_ ]/g,'').split(' ').length : 0;
}

/**
 * Validate email address
 * Reference: https://stackoverflow.com/a/46181 (Retrieved Jan 18, 2022)
 * **/

exports.validateEmail = (email) => {
  return !!String(email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
};

/**
 * Validate phone number
 * Reference: https://stackoverflow.com/a/29767609 (Retrieved Jan 25, 2022)
 * Valid formats:
    (123) 456-7890
    (123)456-7890
    123-456-7890
    123.456.7890
    1234567890
    +31636363634
    075-63546725
 * **/

exports.validatePhone = (phone) => {
  return !!String(phone)
    .toLowerCase()
    .match(
      /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4}$/im
    );
};

/**
 * Validate year
 * TODO: make the year modifiable
 * **/

exports.validateYear = (year) => {
  return parseInt(year) === 2022
};
