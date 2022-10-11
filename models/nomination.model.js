/*!
 * Nomination data db model
 * File: nomination.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Partner schema
 */

const PartnerSchema = new Schema({
    organization    : String
});

/**
 * Nominator schema
 */

const NominatorSchema = new Schema({
    firstname       : String,
    lastname        : String,
    title           : String,
    email           : String
});

/**
 * Location schema
 */

const LocationSchema = new Schema({
    address         : String,
    city            : String
});

/**
 * Nomination schema
 */

const NominationSchema = new Schema(
    {
        seq: {
            type: Number
        },
        category: {
            type: String,
            required: true
        },
        year: {
            type: Number,
            required: true
        },
        guid: {
            type: String,
            required: true
        },
        submitted: {
            type: Boolean,
            required: true
        },
        filePath: {
            type: String
        },
        organization: {
            type: String,
            required: function() { return this.submitted }
        },
        title: {
            type: String
        },
        nominee: {
            firstname: String,
            lastname: String,
            organization: String
        },
        nominees: {
            type: Number
        },
        partners: [PartnerSchema],
        contacts: {
            primary: {
                firstname: String,
                lastname: String,
                email: String,
                phone: String
            },
            video: {
                firstname: String,
                lastname: String,
                email: String,
                locations: [LocationSchema]
            }
        },
        nominators: [NominatorSchema],
        acknowledgment: {
            type: String,
            enum: ['accepted', 'not_accepted'],
            default: 'not_accepted',
            required: function() { return this.submitted }
        },
        evaluation: {
            summary: String,
            context: String,
            complexity: String,
            approach: String,
            valuing_people: String,
            commitment: String,
            contribution: String,
            impact: String
        },
        attachments: [{
            type: Schema.Types.ObjectId,
            ref: 'Attachment'
        }]
    },
    { timestamps: true }
);

const NominationModel = mongoose.model('Nomination', NominationSchema, 'nominations');
module.exports = NominationModel;
