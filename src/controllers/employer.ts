import async from "async";
import { Request, Response, NextFunction } from "express";

import { body, validationResult } from "express-validator/check";
import { sanitizeBody } from "express-validator/filter";

import { PageInfo, getNewPageInfo } from "../util/pagination";
import * as selectOption from "../util/selectOption";
import * as backUrl from "../util/backUrl";
import { Logger } from "../util/logger";
import EmployerModel, { IEmployer, STATUS_ACTIVE } from "../models/Employer";
import RecruiterModel, { IRecruiter } from "../models/Recruiter";

const logger = new Logger("controllers.employer");

const DEFAULT_ROW_PER_PAGE: number = 10;

/**
 * GET /employers
 * Employer listing page.
 */
export let getEmployers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const recruiterId = req.query.recruiterId;
        let recruiterDisplay: string;

        const searchName: string = req.query.searchName;

        let newPageNo: number = parseInt(req.query.newPageNo);
        if (!newPageNo) {
            newPageNo = 1; // default
        }

        let rowPerPage: number = parseInt(req.query.rowPerPage);
        if (!rowPerPage) {
            rowPerPage = DEFAULT_ROW_PER_PAGE; // default
        }

        let pageInfo: PageInfo;
        let recordCount = 0;
        let item_list: any;

        if (!recruiterId) {
            req.flash("info", { msg: "Please select a Recruiter to proceed." });
        } else {
            const recruiterDb = await RecruiterModel.findById(recruiterId);
            if (!recruiterDb) {
                const error = new Error(`Recruiter not found for _id=${recruiterId}`);
                throw error;
            }
            recruiterDisplay = recruiterDb.name;

            const query = EmployerModel.find();

            // filter records
            query.where("recruiter").equals(recruiterId);

            if (searchName) {
                const regex = new RegExp(searchName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "i");
                query.where("name").regex(regex);
            }

            query.where("status").equals(STATUS_ACTIVE);

            recordCount = await query.countDocuments();
            if (recordCount > 0) {
                pageInfo = getNewPageInfo(recordCount, rowPerPage, newPageNo);

                query.find();
                query.skip(pageInfo.rowNoStart - 1);
                query.limit(rowPerPage);
                query.sort([["name", "ascending"], ["createdAt", "descending"]]);

                item_list = await query.exec();
            }
        }

        if (!pageInfo)
            pageInfo = getNewPageInfo(recordCount, rowPerPage, newPageNo);

        let rowPerPageOptions, pageNoOptions;
        if (pageInfo) {
            rowPerPageOptions = selectOption.OPTIONS_ROW_PER_PAGE();
            selectOption.markSelectedOption(rowPerPage.toString(), rowPerPageOptions);

            pageNoOptions = selectOption.OPTIONS_PAGE_NO(pageInfo.totalPageNo);
            selectOption.markSelectedOption(pageInfo.curPageNo.toString(), pageNoOptions);
        }

        // client side script
        const includeScripts = ["/js/employer/list.js", "/js/util/pagination.js", "/js/lib/typeahead.bundle.js"];

        res.render("employer/list", {
            title: "Employer",
            title2: "Employer List",
            item_list: item_list,
            rowPerPageOptions: rowPerPageOptions,
            pageNoOptions: pageNoOptions,
            pageInfo: pageInfo,
            includeScripts: includeScripts,
            searchName: searchName,
            recruiterId: recruiterId,
            recruiterDisplay: recruiterDisplay,
        });
    } catch (err) {
        logger.error((<Error>err).stack);
        req.flash("errors", { msg: "Unexpected error. Please try again later. Contact Support Team if the problem persists." });
        res.redirect("/employers");
    }

};

/**
 * GET /employer/create
 * Create Employer page.
 */
export let getEmployerCreate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const recruiterId = req.query.recruiterId;
        if (!recruiterId) {
            const error = new Error(`Recruiter Id is null`);
            throw error;
        }
        const recruiterDb = await RecruiterModel.findById(recruiterId);
        if (!recruiterDb) {
            const error = new Error(`Recruiter not found for _id=${recruiterId}`);
            throw error;
        }

        // // TODO: for local testing only
        // const employerInput = new EmployerModel({
        //     name: "Employer #2",
        //     about: "Something about this employer.",
        //     employeeSize: EMPLOYEESIZE_20,
        //     contact: "FB: https://www.facebook.com/Employer2",
        // });

        // set default values
        const employerInput = new EmployerModel({

        });

        // client side script
        const includeScripts = ["/js/employer/form.js"];

        const employeeSizeOptions = selectOption.OPTIONS_EMPLOYEE_SIZE();
        selectOption.markSelectedOption(employerInput.employeeSize, employeeSizeOptions);

        res.render("employer/form", {
            title: "Employer",
            title2: "Create Employer",
            recruiterId: recruiterId,
            recruiter: recruiterDb,
            employer: employerInput,
            includeScripts: includeScripts,
            employeeSizeOptions: employeeSizeOptions,
            bu: req.query.bu,
        });

    } catch (err) {
        logger.error((<Error>err).stack);
        req.flash("errors", { msg: "Unexpected error. Please try again later. Contact Support Team if the problem persists." });
        res.redirect("/employers");
    }
};

/**
 * POST /employer/create
 * Create a new Employer.
 */
export let postEmployerCreate = [
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
    body("recruiterId").isLength({ min: 1 }).trim().withMessage("Recruiter ID is required."),
    body("name").isLength({ min: 1 }).trim().withMessage("Employer Name is required."),
    body("about").isLength({ min: 1 }).trim().withMessage("About Employer is required."),
    body("employeeSize").isLength({ min: 1 }).trim().withMessage("Employee Size is required."),
    body("contact").isLength({ min: 1 }).trim().withMessage("Contacts/ Social Media is required."),

    // sanitize values
    sanitizeBody("*").trim().escape(),

    // process request
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const errors = validationResult(req);

            const recruiterId = req.body.recruiterId;
            const recruiterDb = await RecruiterModel.findById(recruiterId);
            if (!recruiterDb) {
                const error = new Error(`Recruiter not found for _id=${recruiterId}`);
                throw error;
            }

            const employerInput = new EmployerModel({
                recruiter: recruiterId,
                name: req.body.name,
                about: req.body.about,
                employeeSize: req.body.employeeSize,
                contact: req.body.contact,
                status: "A",
                createdBy: req.user.id
            });

            if (errors.isEmpty()) {
                // check unique employer name
                const existingEmployer = await EmployerModel.findOne(
                    {
                        recruiter: recruiterId,
                        name: { $regex: "^" + req.body.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "$" , $options : "i" }
                    }
                );

                if (existingEmployer) {
                    req.flash("errors", { msg: "Employer with the same Name already exists." });
                    // continue with default error handling
                } else {
                    const employerCreated = await employerInput.save();
                    req.flash("success", { msg: "New Employer created: " + employerCreated._id });
                    return res.redirect(`/employers?recruiterId=${recruiterId}`);
                }

            } else {
                req.flash("errors", errors.array());
            }

            // default error handling
            const employeeSizeOptions = selectOption.OPTIONS_EMPLOYEE_SIZE();
            selectOption.markSelectedOption(req.body.employeeSize, employeeSizeOptions);

            // client side script
            const includeScripts = ["/js/employer/form.js"];

            return res.render("employer/form", {
                title: "Employer",
                title2: "Create Employer",
                recruiterId: recruiterId,
                recruiter: recruiterDb,
                employer: employerInput,
                includeScripts: includeScripts,
                employeeSizeOptions: employeeSizeOptions,
                bu: req.body.bu,
            });

        } catch (err) {
            logger.error((<Error>err).stack);
            req.flash("errors", { msg: "Unexpected error. Please try again later. Contact Support Team if the problem persists." });
            res.redirect("/employers");
        }
    }
];

/**
 * GET /employer/:id
 * View Employer Detail page.
 */
export let getEmployerDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const recruiterId = req.query.recruiterId;
        const recruiterDb = await RecruiterModel.findById(recruiterId);
        if (!recruiterDb) {
            const error = new Error(`Recruiter not found for _id=${recruiterId}`);
            throw error;
        }

        const employerDb = await EmployerModel.findById(req.params.id);

        if (employerDb) {
            const employeeSizeOptions = selectOption.OPTIONS_EMPLOYEE_SIZE();
            selectOption.markSelectedOption(employerDb.employeeSize, employeeSizeOptions);

            // client side script
            const includeScripts = ["/js/employer/detail.js"];

            res.render("employer/detail", {
                title: "Employer",
                title2: "Employer Detail",
                recruiterId: recruiterId,
                recruiter: recruiterDb,
                employer: employerDb,
                employerId: employerDb._id,
                includeScripts: includeScripts,
                bu: req.query.bu,
                employeeSizeOptions: employeeSizeOptions,
            });

        } else {
            req.flash("errors", { msg: "Employer not found." });
            const bu = backUrl.decodeBackUrl(req.query.bu);
            if (bu) {
                return res.redirect(bu);
            } else {
                return res.redirect("/employers");
            }
        }

    } catch (err) {
        logger.error((<Error>err).stack);
        req.flash("errors", { msg: "Unexpected error. Please try again later. Contact Support Team if the problem persists." });
        res.redirect("/employers");
    }
};

/**
 * GET /employer/:id/update
 * Update Employer page.
 */
export let getEmployerUpdate = (req: Request, res: Response, next: NextFunction) => {
    try {
        async.parallel({
            recruiter: function(callback) {
                RecruiterModel.findById(req.query.recruiterId)
                    .exec(callback);
            },
            employer: function(callback) {
                EmployerModel.findById(req.params.id)
                    .exec(callback);
            }
        }, function(err, results) {
            if (err) { return next(err); }

            if (!results.recruiter) {
                const error = new Error(`Recruiter not found for _id=${req.query.recruiterId}`);
                throw error;
            }

            const recruiterDb = results.recruiter as IRecruiter;

            if (!results.employer) {
                req.flash("errors", { msg: "Employer not found." });
                const bu = backUrl.decodeBackUrl(req.query.bu);
                if (bu) {
                    return res.redirect(bu);
                } else {
                    return res.redirect("/employers");
                }
            }

            const employerDb = results.employer as IEmployer;

            const employeeSizeOptions = selectOption.OPTIONS_EMPLOYEE_SIZE();
            selectOption.markSelectedOption(employerDb.employeeSize, employeeSizeOptions);

            // client side script
            const includeScripts = ["/js/employer/form.js"];

            res.render("employer/form", {
                title: "Employer",
                title2: "Edit Employer Detail",
                recruiterId: recruiterDb._id,
                recruiter: recruiterDb,
                employer: employerDb,
                employerId: employerDb._id,
                includeScripts: includeScripts,
                bu: req.query.bu,
                employeeSizeOptions: employeeSizeOptions,
                isEdit: "Y",
            });

        });
    } catch (err) {
        logger.error((<Error>err).stack);
        req.flash("errors", { msg: "Unexpected error. Please try again later. Contact Support Team if the problem persists." });
        res.redirect("/employers");
    }
};

/**
 * POST /employer/:id/update
 * Update an existing Job.
 */
export let postEmployerUpdate = [
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
    body("recruiterId").isLength({ min: 1 }).trim().withMessage("Recruiter ID is required."),
    body("name").isLength({ min: 1 }).trim().withMessage("Employer Name is required."),
    body("about").isLength({ min: 1 }).trim().withMessage("About Employer is required."),
    body("employeeSize").isLength({ min: 1 }).trim().withMessage("Employee Size is required."),
    body("contact").isLength({ min: 1 }).trim().withMessage("Contacts/ Social Media is required."),

    // sanitize values
    sanitizeBody("*").trim().escape(),

    // process request
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const errors = validationResult(req);

            const recruiterId = req.body.recruiterId;
            const recruiterDb = await RecruiterModel.findById(recruiterId);
            if (!recruiterDb) {
                const error = new Error(`Recruiter not found for _id=${recruiterId}`);
                throw error;
            }

            const employerInput = new EmployerModel({
                recruiter: recruiterId,
                name: req.body.name,
                about: req.body.about,
                employeeSize: req.body.employeeSize,
                contact: req.body.contact,
                _id: req.params.id,
                updatedBy: req.user.id
            });

            if (errors.isEmpty()) {
                const targetEmployer = await EmployerModel.findById(req.params.id);
                if (!targetEmployer) {
                    const error = new Error(`Employer not found for _id=${req.params.id}`);
                    throw error;
                }

                const employerUpdated = await EmployerModel.findByIdAndUpdate(req.params.id, employerInput);
                req.flash("success", { msg: "Employer successfully updated." });
                return res.redirect(`${employerUpdated.url}?recruiterId=${recruiterId}&bu=${req.body.bu}`);

            } else {
                req.flash("errors", errors.array());
            }

            // default error handling
            const employeeSizeOptions = selectOption.OPTIONS_EMPLOYEE_SIZE();
            selectOption.markSelectedOption(req.body.employeeSize, employeeSizeOptions);

            // client side script
            const includeScripts = ["/js/employer/form.js"];

            res.render("employer/form", {
                title: "Employer",
                title2: "Edit Employer",
                recruiterId: recruiterId,
                recruiter: recruiterDb,
                employer: employerInput,
                employerId: employerInput._id,
                includeScripts: includeScripts,
                employeeSizeOptions: employeeSizeOptions,
                bu: req.body.bu,
                isEdit: "Y",
            });

        } catch (err) {
            logger.error((<Error>err).stack);
            req.flash("errors", { msg: "Unexpected error. Please try again later. Contact Support Team if the problem persists." });
            res.redirect("/employers");
        }
    }
];

/**
 * POST /employer/:id/delete
 * Delete an existing Employer.
 */
export let postEmployerDelete = [
    // validate values
    body("id").isLength({ min: 1 }).trim().withMessage("Employer ID is required."),

    // process request
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const errors = validationResult(req);

            const employerInput = new EmployerModel({
                _id: req.params.id,
                status: "D",
                updatedBy: req.user.id
            });

            if (errors.isEmpty()) {
                const targetEmployer = await EmployerModel.findById(req.params.id);
                if (!targetEmployer) {
                    const error = new Error(`Employer not found for _id=${req.params.id}`);
                    throw error;
                }

                const employerUpdated = await EmployerModel.findByIdAndUpdate(req.params.id, employerInput);
                req.flash("success", { msg: "Employer successfully deleted." });
            } else {
                req.flash("errors", errors.array());
            }

            // default routing
            const bu = backUrl.decodeBackUrl(req.body.bu);
            if (bu) {
                return res.redirect(bu);
            } else {
                return res.redirect("/employers");
            }

        } catch (err) {
            logger.error((<Error>err).stack);
            req.flash("errors", { msg: "Unexpected error. Please try again later. Contact Support Team if the problem persists." });
            res.redirect("/employers");
        }
    }
];