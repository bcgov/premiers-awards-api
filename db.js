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
const authSource = process.env.DATABASE_AUTH || databaseHost
// const databaseConnectionOpts = process.env.DATABASE_CONNECTION_OPTIONS;
const databaseName = process.env.DATABASE_NAME;
const connectionURL = `${protocol}${databaseHost}:${databasePort}/${databaseName}`;

// DEBUG db connection URL
if (process.env.DEBUG === 'true') {
  console.log('\n\n=== DEBUG ===')
  console.log(`Connection URL:\t\t${connectionURL}`);
  console.log(`\t- User:\t\t${databaseUser}\n\t- Password:\t${databasePassword}`);
  console.log('=== \n\n')
}

// create db connection
mongoose.connect(connectionURL, {
  auth: {
    username: databaseUser,
    password: databasePassword
  },
  directConnection: true,
  authSource: authSource,
  useUnifiedTopology: true,
  useNewUrlParser: true
}, (err)=>{ if (err) console.error(err); });

// Bind connection to error event (to get notification of connection errors)
// mongoose.connection.on('error',
//   console.error.bind(console, 'MongoDB connection error:')
// );

// Connect to MongoDB
mongoose.connection.on('connected', () => {
  console.log(`Connected to MongoDB on port ${databasePort}.`);
  console.log(`\t- Host: ${databaseHost}`);
  console.log(`\t- Database: ${databaseName}`);
  console.log(`\t- Auth: ${authSource}`);
  console.log(`\t- User: ${databaseUser}`);
  console.log(`============================================`);
});
