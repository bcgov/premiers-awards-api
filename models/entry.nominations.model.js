/*!
 * Nominations: Nomination entry model
 * File: entry.nominations.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Organization schema
 */

// const OrganizationSchema = new Schema({
//     key    : String,
//     label  : String
// });

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
        },
        guid: {
            type: String,
            required: true
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        submitted: {
            type: Boolean,
            required: true
        },
        filePaths: {
            nomination: {
                type: String,
                default: '',
            },
            merged: {
                type: String,
                default: '',
            },
        },
        organizations: [{
            type: String,
            required: function() { return this.submitted }
        }],
        title: {
            type: String
        },
        nominee: {
            firstname: {
                type: String,
                default: '',
            },
            lastname: {
                type: String,
                default: '',
            },
            organization: {
                type: String,
                default: '',
            }
        },
        nominees: {
            type: Number,
            default: 0,
        },
        partners: [PartnerSchema],
        contacts: {
            primary: {
                firstname: {
                    type: String,
                    default: '',
                },
                lastname: {
                    type: String,
                    default: '',
                },
                email: {
                    type: String,
                    default: '',
                },
                phone: {
                    type: String,
                    default: '',
                }
            },
            video: {
                firstname: {
                    type: String,
                    default: '',
                },
                lastname: {
                    type: String,
                    default: '',
                },
                email: {
                    type: String,
                    default: '',
                },
                phone: {
                    type: String,
                    default: '',
                },
                locations: [LocationSchema]
            }
        },
        nominators: [NominatorSchema],
        acknowledgment: {
            type: Boolean,
            default: false,
            required: function() { return this.submitted }
        },
        evaluation: {
            summary: {
                type: String,
                default: '',
            },
            context: {
                type: String,
                default: '',
            },
            complexity: {
                type: String,
                default: '',
            },
            approach: {
                type: String,
                default: '',
            },
            valuing_people: {
                type: String,
                default: '',
            },
            commitment: {
                type: String,
                default: '',
            },
            contribution: {
                type: String,
                default: '',
            },
            impact: {
                type: String,
                default: '',
            }
        },
        attachments: [{
            type: Schema.Types.ObjectId,
            ref: 'Attachment'
        }]
    },
    { timestamps: true }
);

const EntryNominationsModel = mongoose.model('Nomination', NominationSchema, 'nominations');
module.exports = EntryNominationsModel;
