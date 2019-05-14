import async from "async";
import moment from "moment";
import mongoose from "mongoose";
import { Request, Response, NextFunction } from "express";

import { body, validationResult } from "express-validator/check";
import { sanitizeBody } from "express-validator/filter";

import { PageInfo, getNewPageInfo } from "../util/pagination";
import * as selectOption from "../util/selectOption";
import * as backUrl from "../util/backUrl";
import { Logger } from "../util/logger";
import RecruiterModel, { IRecruiter } from "../models/Recruiter";
import CreditAccountModel from "../models/CreditAccount";

const logger = new Logger("controllers.recruiter");

const DEFAULT_ROW_PER_PAGE: number = 10;

/**
 * GET /recruiters
 * Recruiter listing page.
 */
export let getRecruiters = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const searchName: string = req.query.searchName;
        const searchEmail: string = req.query.searchEmail;
        const searchMobileNo: string = req.query.searchMobileNo;

        let newPageNo: number = parseInt(req.query.newPageNo);
        if (!newPageNo) {
            newPageNo = 1; // default
        }

        let rowPerPage: number = parseInt(req.query.rowPerPage);
        if (!rowPerPage) {
            rowPerPage = DEFAULT_ROW_PER_PAGE; // default
        }

        const query = RecruiterModel.find();

        // filter records
        if (searchName) {
            const regex = new RegExp(searchName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "i");
            query.where("name").regex(regex);
        }

        if (searchEmail) {
            const regex = new RegExp(searchEmail.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "i");
            query.where("email").regex(regex);
        }

        if (searchMobileNo) {
            const regex = new RegExp(searchMobileNo.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "i");
            query.where("mobileNo").regex(regex);
        }

        query.where("status").in(["A", "T"]);

        let pageInfo: PageInfo;
        let item_list: any;

        const count = await query.count();
        if (count > 0) {
            pageInfo = getNewPageInfo(count, rowPerPage, newPageNo);

            query.find();
            query.skip(pageInfo.rowNoStart - 1);
            query.limit(rowPerPage);
            query.sort([["name", "ascending"], ["createdAt", "descending"]]);

            item_list = await query.exec();
        }
        if (!pageInfo) {
            pageInfo = getNewPageInfo(count, rowPerPage, newPageNo);
        }

        let rowPerPageOptions, pageNoOptions;
        if (pageInfo) {
            rowPerPageOptions = selectOption.OPTIONS_ROW_PER_PAGE();
            selectOption.markSelectedOption(rowPerPage.toString(), rowPerPageOptions);

            pageNoOptions = selectOption.OPTIONS_PAGE_NO(pageInfo.totalPageNo);
            selectOption.markSelectedOption(pageInfo.curPageNo.toString(), pageNoOptions);
        }

        // client side script
        const includeScripts = ["/js/recruiter/list.js", "/js/util/pagination.js"];

        res.render("recruiter/list", {
            title: "Recruiter",
            title2: "Recruiter List",
            item_list: item_list,
            rowPerPageOptions: rowPerPageOptions,
            pageNoOptions: pageNoOptions,
            pageInfo: pageInfo,
            includeScripts: includeScripts,
            searchName: searchName,
            searchEmail: searchEmail,
            searchMobileNo: searchMobileNo,
        });

    } catch (err) {
        logger.error((<Error>err).stack);
        req.flash("errors", { msg: "Unexpected error. Please try again later. Contact Support Team if the problem persists." });
        res.redirect("/recruiters");
    }
};

/**
 * GET /recruiter/create
 * Create Recruiter page.
 */
export let getRecruiterCreate = (req: Request, res: Response, next: NextFunction) => {
    // TODO: for local testing only
    const recruiterInput = new RecruiterModel({
        name: "Recruiter #2",
        nric: "A0000002",
        email: "some2@e.mail",
        mobileNo: "+60122222222",
        nationality: "MY",
        race: "M",
        language: "ms",
        dob: moment("1992-03-15"),
        gender: "M",
        billTo: {
            name: "Company #2",
            address: "ADDR LINE 1"
                + "\r\nADDR LINE 2"
                + "\r\nADDR LINE 3"
                + "\r\n15150 KOTA BHARU"
                + "\r\nKELANTAN"
                + "\r\nMALAYSIA"
        },
    });

    // // set default values
    // const recruiterInput = new RecruiterModel({

    // });

    // client side script
    const includeScripts = ["/js/recruiter/form.js"];

    const nationalityOptions = selectOption.OPTIONS_NATIONALITY();
    selectOption.markSelectedOption(recruiterInput.nationality, nationalityOptions);

    const raceOptions = selectOption.OPTIONS_RACE();
    selectOption.markSelectedOption(recruiterInput.race, raceOptions);

    const languageOptions = selectOption.OPTIONS_LANGUAGE();
    selectOption.markSelectedOption(recruiterInput.language, languageOptions);

    const genderOptions = selectOption.OPTIONS_GENDER();
    selectOption.markSelectedOption(recruiterInput.gender, genderOptions);

    res.render("recruiter/form", {
        title: "Recruiter",
        title2: "Create Recruiter",
        recruiter: recruiterInput,
        includeScripts: includeScripts,
        nationalityOptions: nationalityOptions,
        raceOptions: raceOptions,
        languageOptions: languageOptions,
        genderOptions: genderOptions,
        bu: req.query.bu,
    });
};

/**
 * POST /recruiter/create
 * Create a new Recruiter.
 */
export let postRecruiterCreate = [
    // convert multiple selection input into array
    (req: Request, res: Response, next: NextFunction) => {
        // if (!(req.body.location instanceof Array)) {
        //     if (typeof req.body.location === "undefined") {
        //         req.body.location = [];
        //     }
        //     else {
        //         req.body.location = new Array(req.body.location);
        //     }
        // }
        next();
    },

    // validate values
    body("name").isLength({ min: 1 }).trim().withMessage("Name as per NRIC is required."),
    body("email").isLength({ min: 1 }).trim().withMessage("Email is required."),
    body("mobileNo").isLength({ min: 1 }).trim().withMessage("Mobile Phone No. is required."),

    body("dob").isLength({ min: 1 }).trim().withMessage("Date of Birth is required.")
    .isISO8601().withMessage("Date of Birth is invalid."),

    // TODO: must be >= 18 years old

    body("billToName").isLength({ min: 1 }).trim().withMessage("Billing Name is required."),
    body("billToAddress").isLength({ min: 1 }).trim().withMessage("Billing Address is required."),

    // sanitize values
    sanitizeBody("*").trim().escape(),
    // sanitizeBody("dob").toDate(),

    // process request
    async (req: Request, res: Response, next: NextFunction) => {
        const mongodbSession = await mongoose.startSession();
        mongodbSession.startTransaction();
        const opts = { session: mongodbSession, new: true };

        try {
            const errors = validationResult(req);

            const recruiterInput = new RecruiterModel({
                name: req.body.name,
                nric: req.body.nric,
                email: (<string>req.body.email).toLowerCase(),
                mobileNo: req.body.mobileNo,
                nationality: req.body.nationality,
                race: req.body.race,
                language: req.body.language,
                dobInput: req.body.dob,
                gender: req.body.gender,
                billTo: {
                    name: req.body.billToName,
                    address: req.body.billToAddress,
                },
                status: "A",
                createdBy: req.user.id
            });

            if (errors.isEmpty()) {
                // check unique email address
                // TODO: check unique mobile no.
                // TODO: check unique nric if provided.
                const existingRecruiter = await RecruiterModel.findOne({
                    email: (<string>req.body.email).toLowerCase(),
                    status: { $in: ["A", "T"] }
                });

                if (existingRecruiter) {
                    req.flash("errors", { msg: "Recruiter with the same Email already exists." });
                } else {
                    const recruiterCreated = await recruiterInput.save(opts);

                    // auto-create CreditAccount
                    const validDateStart = moment();
                    const validDateEnd = moment(validDateStart).add(6, "months");

                    const creditAccountInput = new CreditAccountModel({
                        recruiter: recruiterCreated._id,
                        validDateStartInput: validDateStart.format("YYYY-MM-DD"),
                        validDateEndInput: validDateEnd.format("YYYY-MM-DD"),
                        creditBalance: 0,
                        creditLocked: 0,
                        status: "A",
                        createdBy: req.user.id
                    });

                    const creditAccountCreated = await creditAccountInput.save(opts);

                    // update recruiter.creditAccount
                    recruiterCreated.creditAccount = creditAccountCreated._id;
                    const recruiterUpdated = await RecruiterModel.findByIdAndUpdate(recruiterCreated._id, recruiterCreated, opts);

                    // only commmit data changes in this block
                    await mongodbSession.commitTransaction();
                    mongodbSession.endSession();

                    req.flash("success", { msg: "New Recruiter created: " + recruiterUpdated._id });
                    return res.redirect("/recruiters");
                }

            } else {
                req.flash("errors", errors.array());
            }

            // default routing
            const nationalityOptions = selectOption.OPTIONS_NATIONALITY();
            selectOption.markSelectedOption(req.body.nationality, nationalityOptions);

            const raceOptions = selectOption.OPTIONS_RACE();
            selectOption.markSelectedOption(req.body.race, raceOptions);

            const languageOptions = selectOption.OPTIONS_LANGUAGE();
            selectOption.markSelectedOption(req.body.language, languageOptions);

            const genderOptions = selectOption.OPTIONS_GENDER();
            selectOption.markSelectedOption(req.body.gender, genderOptions);

            // client side script
            const includeScripts = ["/js/recruiter/form.js"];

            res.render("recruiter/form", {
                title: "Recruiter",
                title2: "Create Recruiter",
                recruiter: recruiterInput,
                includeScripts: includeScripts,
                nationalityOptions: nationalityOptions,
                raceOptions: raceOptions,
                languageOptions: languageOptions,
                genderOptions: genderOptions,
                bu: req.body.bu,
            });

            // default transaction handling: rollback
            await mongodbSession.abortTransaction();
            mongodbSession.endSession();

        } catch (err) {
            logger.error((<Error>err).stack);

            await mongodbSession.abortTransaction();
            mongodbSession.endSession();

            req.flash("errors", { msg: "Unexpected error. Please try again later. Contact Support Team if the problem persists." });
            res.redirect("/recruiters");
        }
    }
];

/**
 * GET /recruiter/:id
 * View Recruiter Detail page.
 */
export let getRecruiterDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const recruiterDb = await RecruiterModel.findById(req.params.id);

        if (!recruiterDb) {
            req.flash("errors", { msg: "Recruiter not found." });
            const bu = backUrl.decodeBackUrl(req.query.bu);
            if (bu) {
                return res.redirect(bu);
            } else {
                return res.redirect("/recruiters");
            }
        }

        const nationalityOptions = selectOption.OPTIONS_NATIONALITY();
        selectOption.markSelectedOption(recruiterDb.nationality, nationalityOptions);

        const raceOptions = selectOption.OPTIONS_RACE();
        selectOption.markSelectedOption(recruiterDb.race, raceOptions);

        const languageOptions = selectOption.OPTIONS_LANGUAGE();
        selectOption.markSelectedOption(recruiterDb.language, languageOptions);

        const genderOptions = selectOption.OPTIONS_GENDER();
        selectOption.markSelectedOption(recruiterDb.gender, genderOptions);

        // client side script
        const includeScripts = ["/js/recruiter/detail.js"];

        return res.render("recruiter/detail", {
            title: "Recruiter",
            title2: "Recruiter Detail",
            recruiter: recruiterDb,
            recruiterId: recruiterDb._id,
            includeScripts: includeScripts,
            bu: req.query.bu,
            nationalityOptions: nationalityOptions,
            raceOptions: raceOptions,
            languageOptions: languageOptions,
            genderOptions: genderOptions,
        });
    } catch (err) {
        logger.error((<Error>err).stack);
        req.flash("errors", { msg: "Unexpected error. Please try again later. Contact Support Team if the problem persists." });
        res.redirect("/recruiters");
    }
};

/**
 * GET /recruiter/:id/update
 * Update Recruiter page.
 */
export let getRecruiterUpdate = (req: Request, res: Response, next: NextFunction) => {
    async.parallel({
        recruiter: function(callback) {
            RecruiterModel.findById(req.params.id)
                .exec(callback);
        }
    }, function(err, results) {
        if (err) { return next(err); }

        if (!results.recruiter) {
            req.flash("errors", { msg: "Recruiter not found." });
            const bu = backUrl.decodeBackUrl(req.query.bu);
            if (bu) {
                return res.redirect(bu);
            } else {
                return res.redirect("/recruiters");
            }
        }

        const recruiterDb = results.recruiter as IRecruiter;

        const nationalityOptions = selectOption.OPTIONS_NATIONALITY();
        selectOption.markSelectedOption(recruiterDb.nationality, nationalityOptions);

        const raceOptions = selectOption.OPTIONS_RACE();
        selectOption.markSelectedOption(recruiterDb.race, raceOptions);

        const languageOptions = selectOption.OPTIONS_LANGUAGE();
        selectOption.markSelectedOption(recruiterDb.language, languageOptions);

        const genderOptions = selectOption.OPTIONS_GENDER();
        selectOption.markSelectedOption(recruiterDb.gender, genderOptions);

        // client side script
        const includeScripts = ["/js/recruiter/form.js"];

        res.render("recruiter/form", {
            title: "Recruiter",
            title2: "Edit Recruiter Detail",
            recruiter: recruiterDb,
            recruiterId: recruiterDb._id,
            includeScripts: includeScripts,
            bu: req.query.bu,
            nationalityOptions: nationalityOptions,
            raceOptions: raceOptions,
            languageOptions: languageOptions,
            genderOptions: genderOptions,
            isEdit: "Y",
        });

    });
};

/**
 * POST /recruiter/:id/update
 * Update an existing Job.
 */
export let postRecruiterUpdate = [
    // convert multiple selection input into array
    (req: Request, res: Response, next: NextFunction) => {
        // if (!(req.body.location instanceof Array)) {
        //     if (typeof req.body.location === "undefined") {
        //         req.body.location = [];
        //     }
        //     else {
        //         req.body.location = new Array(req.body.location);
        //     }
        // }
        next();
    },

    // validate values
    body("name").isLength({ min: 1 }).trim().withMessage("Name as per NRIC is required."),
    body("email").isLength({ min: 1 }).trim().withMessage("Email is required."),
    body("mobileNo").isLength({ min: 1 }).trim().withMessage("Mobile Phone No. is required."),

    body("dob").isLength({ min: 1 }).trim().withMessage("Date of Birth is required.")
    .isISO8601().withMessage("Date of Birth is invalid."),

    // // TODO: must be >= 18 years old

    body("billToName").isLength({ min: 1 }).trim().withMessage("Billing Name is required."),
    body("billToAddress").isLength({ min: 1 }).trim().withMessage("Billing Address is required."),

    // sanitize values
    sanitizeBody("*").trim().escape(),
    // sanitizeBody("dob").toDate(),

    // process request
    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);

        const recruiterInput = new RecruiterModel({
            name: req.body.name,
            nric: req.body.nric,
            // email: (<string>req.body.email).toLowerCase(), // email is not editable
            mobileNo: req.body.mobileNo,
            nationality: req.body.nationality,
            race: req.body.race,
            language: req.body.language,
            dobInput: req.body.dob,
            gender: req.body.gender,
            billTo: {
                name: req.body.billToName,
                address: req.body.billToAddress,
            },
            _id: req.params.id,
            updatedBy: req.user.id
        });

        if (errors.isEmpty()) {
            RecruiterModel.findById(req.params.id, (err, targetRecruiter) => {
                if (err) { return next(err); }

                if (!targetRecruiter) {
                    req.flash("errors", { msg: "Recruiter not found." });
                    const bu = backUrl.decodeBackUrl(req.body.bu);
                    if (bu) {
                        return res.redirect(bu);
                    } else {
                        return res.redirect("/recruiters");
                    }
                }

                RecruiterModel.findByIdAndUpdate(req.params.id, recruiterInput, (err, recruiterUpdated: IRecruiter) => {
                    if (err) { return next(err); }
                    req.flash("success", { msg: "Recruiter successfully updated." });
                    return res.redirect(recruiterUpdated.url + "?bu=" + req.body.bu);
                });
            });
        } else {
            req.flash("errors", errors.array());

            const nationalityOptions = selectOption.OPTIONS_NATIONALITY();
            selectOption.markSelectedOption(req.body.nationality, nationalityOptions);

            const raceOptions = selectOption.OPTIONS_RACE();
            selectOption.markSelectedOption(req.body.race, raceOptions);

            const languageOptions = selectOption.OPTIONS_LANGUAGE();
            selectOption.markSelectedOption(req.body.language, languageOptions);

            const genderOptions = selectOption.OPTIONS_GENDER();
            selectOption.markSelectedOption(req.body.gender, genderOptions);

            // client side script
            const includeScripts = ["/js/recruiter/form.js"];

            res.render("recruiter/form", {
                title: "Recruiter",
                title2: "Edit Recruiter",
                recruiter: recruiterInput,
                recruiterId: recruiterInput._id,
                includeScripts: includeScripts,
                nationalityOptions: nationalityOptions,
                raceOptions: raceOptions,
                languageOptions: languageOptions,
                genderOptions: genderOptions,
                bu: req.body.bu,
                isEdit: "Y",
            });
        }
    }
];

/**
 * POST /recruiter/:id/terminate
 * Terminate an existing Recruiter.
 */
export let postRecruiterTerminate = [
    // validate values
    body("id").isLength({ min: 1 }).trim().withMessage("Recruiter ID is required."),

    // process request
    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);

        const recruiterInput = new RecruiterModel({
            _id: req.params.id,
            status: "T",
            updatedBy: req.user.id
        });

        if (errors.isEmpty()) {
            RecruiterModel.findById(req.params.id, (err, targetRecruiter) => {
                if (err) { return next(err); }

                if (!targetRecruiter) {
                    req.flash("errors", { msg: "Recruiter not found." });
                    const bu = backUrl.decodeBackUrl(req.body.bu);
                    if (bu) {
                        return res.redirect(bu);
                    } else {
                        return res.redirect("/recruiters");
                    }
                }

                RecruiterModel.findByIdAndUpdate(req.params.id, recruiterInput, (err, recruiterUpdated: IRecruiter) => {
                    if (err) { return next(err); }
                    req.flash("success", { msg: "Recruiter successfully terminated." });
                    const bu = backUrl.decodeBackUrl(req.body.bu);
                    if (bu) {
                        return res.redirect(bu);
                    } else {
                        return res.redirect("/recruiters");
                    }
                });
            });
        } else {
            req.flash("errors", errors.array());
            const bu = backUrl.decodeBackUrl(req.body.bu);
            if (bu) {
                return res.redirect(bu);
            } else {
                return res.redirect("/recruiters");
            }
        }
    }
];