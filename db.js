/*!
 * Database initialization
 * File: db.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const mongoose = require("mongoose");
require('dotenv').config();

// Database configuration settings
const protocol = 'mongodb://'
const databaseHost = process.env.DATABASE_HOST;
const databasePort = process.env.DATABASE_PORT;
const databaseUser = process.env.DATABASE_USER;
const databasePassword = process.env.DATABASE_PASSWORD;
// const databaseConnectionOpts = process.env.DATABASE_CONNECTION_OPTIONS;
const databaseName = process.env.DATABASE_NAME;

// create db connection
mongoose.connect(`${protocol}${databaseHost}:${databasePort}/${databaseName}`, {
  auth: {
    username: databaseUser,
    password: databasePassword
  },
  authSource: process.env.DATABASE_AUTH,
  useUnifiedTopology: true,
  useNewUrlParser: true
}, (err)=>{ if (err) console.error(err); });

// Bind connection to error event (to get notification of connection errors)
// mongoose.connection.on('error',
//   console.error.bind(console, 'MongoDB connection error:')
// );

// Connect to MongoDB
mongoose.connection.on('connected', () => {
  console.log('\nConnected to MongoDB @ 27017\n\n*\t*\t*');
});
