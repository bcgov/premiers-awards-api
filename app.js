/*!
 * Premier's Awards Web API
 * File: app.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

"use strict";

// express init
const express = require("express");
const cors = require("cors");
require('dotenv').config();

// logging
const { requestLogger} = require("./logger");

// Database
require("./db");
const mongoSanitize = require("express-mongo-sanitize");

// Handlers
const { notFoundHandler, globalHandler } = require("./error");
const cookieParser = require("cookie-parser");
const { authenticate } = require("./services/auth.services");

// const helmet = require('helmet');

/**
 * Express Security Middleware
 *
 * Hide Express usage information from public.
 * Use Helmet for security HTTP headers
 * - Strict-Transport-Security enforces secure (HTTP over SSL/TLS)
 *   connections to the server
 * - X-Frame-Options provides click-jacking protection
 * - X-XSS-Protection enables the Cross-site scripting (XSS)
 *   filter built into most recent web browsers
 * - X-Content-Type-Options prevents browsers from MIME-sniffing
 *   a response away from the declared _static-type
 *   Content-Security-Policy prevents a wide range of attacks,
 *   including Cross-site scripting and other cross-site injections
 *
 *   Online checker: http://cyh.herokuapp.com/cyh.
 */

// base API/application url
const baseURL = process.env.APP_BASE_URL;
const nodeENV = process.env.NODE_ENV;

// API Routers
const indexRouter = require("./router");
const apiRouters = [
    {path: '/admin', router: require("./routes/admin.router")},
    {path: '/nominations', router: require("./routes/nominations.router")},
    {path: '/tables', router: require("./routes/events.router")}
];


// configure frontend applications
const appsConfig = [
    {
        name: 'admin',
        port: process.env.ADMIN_APP_PORT,
    },
    {
        name: 'nominations',
        port: process.env.NOMINATIONS_APP_PORT,
    },
    {
        name: 'table-registrations',
        port: process.env.TABLE_REGISTRATIONS_APP_PORT,
    },
];

// configure CORS allowed hostnames
const allowedOrigins = process.env.NODE_ENV === "local"
    ? appsConfig.map(app => {return `${baseURL}${nodeENV === 'local' ? `:${app.port}` : ''}`})
    : [process.env.APP_BASE_URL];

const corsConfig = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg =
                "The CORS policy for this site does not allow access from the specified origin: \n" +
                origin;
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ["GET", "POST"],
    credentials: true,
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};

/**
 * Set up API server (Node)
 */

const api = express();
api.disable("x-powered-by");
// api.use(helmet({contentSecurityPolicy: false}));
api.use(express.json());
api.use(express.urlencoded({ extended: true }));
api.use(cors(corsConfig));

// parse cookies to store session data
api.use(cookieParser(process.env.COOKIE_SECRET));

// sanitize db keys to prevent injection
api.use(mongoSanitize());

// log requests
api.use(requestLogger);

// initialize routers for API requests

// status route (no authentication)
api.use('/', indexRouter);

// secure routes
apiRouters.forEach(apiRouter => {
    indexRouter.use(apiRouter.path, authenticate);
    indexRouter.use(apiRouter.path, apiRouter.router);
});

// handle generic errors
api.use(globalHandler);

// handle 404 errors
api.use(notFoundHandler);

// Run API server
api.listen(process.env.API_PORT, () => {
    console.log(`============================================`);
    const url = `${baseURL}${nodeENV === 'local' ? `:${process.env.API_PORT}` : ''}`
    console.log(`API running on port ${process.env.API_PORT}.`);
    console.log(`\t- Node environment: ${nodeENV}`);
    console.log(`\t- Available on a web browser at: ${url}`);
    console.log(`\t- Allowed origins:`, allowedOrigins.join(', '));
    console.log(`============================================`);
});

// expose API
exports.api = api;