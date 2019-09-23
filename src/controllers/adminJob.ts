import async from "async";
import moment from "moment";
import mongoose from "mongoose";
import { Request, Response, NextFunction } from "express";

import { body, validationResult } from "express-validator/check";
import { sanitizeBody } from "express-validator/filter";

import { default as JobModel, IJob, POSTTYPE_FB, POSTTYPE_NORMAL, Location } from "../models/Job";


import { PageInfo, getNewPageInfo } from "../util/pagination";
import * as selectOption from "../util/selectOption";
import * as backUrl from "../util/backUrl";
import { Logger } from "../util/logger";
import AdminJobModel, { PUBIND_NEW, STATUS_PENDING, STATUS_ACTIVE, PUBIND_UNPUBLISHED } from "../models/AdminJob";

const logger = new Logger("controllers.adminJob");

const DEFAULT_ROW_PER_PAGE: number = 10;

/**
 * GET /adminJobs
 * Job listing page.
 */
export let getJobs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const searchPublishStartFrom: string = req.query.searchPublishStartFrom;
        const searchPublishStartTo: string = req.query.searchPublishStartTo;
        const searchTitle: string = req.query.searchTitle;
        const searchEmployerName: string = req.query.searchEmployerName;

        let newPageNo: number = parseInt(req.query.newPageNo);
        if (!newPageNo) {
            newPageNo = 1; // default
        }

        let rowPerPage: number = parseInt(req.query.rowPerPage);
        if (!rowPerPage) {
            rowPerPage = DEFAULT_ROW_PER_PAGE; // default
        }

        const query = AdminJobModel.find();

        // filter records
        if (searchPublishStartFrom) {
            query.where("publishStart").gte(<any>searchPublishStartFrom);
        }

        if (searchPublishStartTo) {
            query.where("publishStart").lte(<any>searchPublishStartTo);
        }

        if (searchTitle) {
            const regex = new RegExp(searchTitle.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "i");
            query.where("title").regex(regex);
        }

        if (searchEmployerName) {
            const regex = new RegExp(searchEmployerName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "i");
            query.where("employerName").regex(regex);
        }

        query.where("status").in([STATUS_ACTIVE, STATUS_PENDING]);

        let pageInfo: PageInfo;
        let recordCount = 0;
        let item_list: any;

        recordCount = await query.countDocuments();
        if (recordCount > 0) {
            pageInfo = getNewPageInfo(recordCount, rowPerPage, newPageNo);

            query.find().populate("job", "_id closing");
            query.skip(pageInfo.rowNoStart - 1);
            query.limit(rowPerPage);
            query.sort([["publishStart", "descending"], ["_id", "descending"]]);
            item_list = await query.exec();
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
        const includeScripts = ["/js/adminJob/list.js", "/js/util/pagination.js"];

        res.render("adminJob/list", {
            title: "Admin",
            title2: "Admin Job List",
            item_list: item_list,
            searchPublishStartFrom: searchPublishStartFrom,
            searchPublishStartTo: searchPublishStartTo,
            searchTitle: searchTitle,
            searchEmployerName: searchEmployerName,
            rowPerPageOptions: rowPerPageOptions,
            pageNoOptions: pageNoOptions,
            pageInfo: pageInfo,
            includeScripts: includeScripts
        });

    } catch (err) {
        logger.error((<Error>err).stack);
        req.flash("errors", { msg: "Unexpected error. Please try again later. Contact Support Team if the problem persists." });
        res.redirect("/");
    }
};

/**
 * GET /adminJob/create
 * Create Job page.
 */
export let getJobCreate = (req: Request, res: Response, next: NextFunction) => {
    // TODO: for local testing only
    const jobInput = {
        employerName: "Some Employer 3",
        title: "Some Admin Job 3",
        description: "Some Admin Job Description 3",
        applyMethod: "Whatsapp/ SMS 012-3456789",
        salary: "Min MYR800.00/bulan +EPF+SOCSO",
        location: [{ code: "03-02", area: "Pasir Pekan, Wakaf Bahru" }],
        closing: "SEGERA",
        publishStartInput: moment().add(1, "days").format("YYYY-MM-DD"),
        get publishEndInput() {
            return moment(this.publishStartInput, "YYYY-MM-DD").add(30 - 1, "days").format("YYYY-MM-DD");
        },
        // weight: number,
        // tag: string[],
        // customContent: string,

        getAreaByLocationCode: function (locationCode: string) {
            let result: string;
            if (this.location && this.location.length > 0) {
                const matched = (this.location as Location[]).find(location => location.code === locationCode);
                if (matched) {
                    result = matched.area;
                }
            }
            return result;
        }
    };

    // // set default values
    // const jobInput = new JobModel({
    //         publishStart: moment().add(1, "days"),
    //         publishEnd: moment().add(29, "days")
    // });

    const locationOptions = selectOption.OPTIONS_LOCATION();
    selectOption.markSelectedOptions([jobInput.location[0].code], locationOptions);

    // client side script
    const includeScripts = ["/ckeditor/ckeditor.js", "/js/adminJob/form.js"];

    res.render("adminJob/form", {
        title: "Admin",
        title2: "Create Admin Job",
        job: jobInput,
        includeScripts: includeScripts,
        locationOptions: locationOptions,
    });
};

export function composeLocationFromRequest(req: Request) {
    const locations: string[] = req.body.location;
    const results: Location[] = [];
    if (locations && locations.length > 0) {
        locations.forEach(location => {
            const area = req.body["area_" + location];
            if (area) {
                results.push({ code: location, area: area });
            } else {
                results.push({ code: location, area: "" });
            }
        });
    }
    return results;
}

/**
 * POST /adminJob/create
 * Create a new Job.
 */
export let postJobCreate = [
    // convert multiple selection input into array
    (req: Request, res: Response, next: NextFunction) => {
        if (!(req.body.location instanceof Array)) {
            if (typeof req.body.location === "undefined") {
                req.body.location = [];
            }
            else {
                req.body.location = new Array(req.body.location);
            }
        }
        next();
    },

    // validate values
    body("title").isLength({ min: 1 }).trim().withMessage("Post Title is required."),
    body("employerName").isLength({ min: 1 }).trim().withMessage("Employer Name is required."),
    body("applyMethod").isLength({ min: 1 }).trim().withMessage("Apply Method is required."),

    // must be >= today
    body("publishStart").isLength({ min: 1 }).trim().withMessage("Publish Date Start is required.")
    .isISO8601().withMessage("Publish Date Start is invalid.")
    .isAfter(moment().add(-1, "day").format("YYYY-MM-DD")).withMessage("Publish Date Start must be from today onwards."),

    body("publishEnd").isLength({ min: 1 }).trim().withMessage("Publish Date End is required.")
    .isISO8601().withMessage("Publish Date End is invalid.")
    .custom((value, { req }) => {
        const publishEndDate = moment(value, "YYYY-MM-DD");
        const publishStartDate = moment(req.body.publishStart, "YYYY-MM-DD");
        return !publishStartDate.isAfter(publishEndDate);
    }).withMessage("Publish Date End must be the same or after Publish Date Start"),

    body("closing").isLength({ min: 1 }).trim().withMessage("Closing is required."),

    // sanitize values
    sanitizeBody("*").trim().escape(),
    sanitizeBody("publishStart").toDate(),
    sanitizeBody("publishEnd").toDate(),

    // process request
    async (req: Request, res: Response, next: NextFunction) => {
        const mongodbSession = await mongoose.startSession();
        mongodbSession.startTransaction();
        const opts = { session: mongodbSession, new: true };

        try {
            const errors = validationResult(req);

            const location = composeLocationFromRequest(req);

            const jobInput = new JobModel({
                title: req.body.title,
                description: req.body.description,
                employerName: req.body.employerName,
                applyMethod: req.body.applyMethod,
                salary: req.body.salary,
                location: location,
                closing: req.body.closing,
                publishStart: req.body.publishStart,
                publishEnd: req.body.publishEnd,
                // weight: number,
                // tag: string[],
                customContent: req.body.customContent,
                imgUrl: req.body.imgUrl,
                postType: POSTTYPE_NORMAL,
                status: "A",
                createdBy: req.user.id
            });

            if (errors.isEmpty()) {
                // create Job
                const jobCreated = await jobInput.save(opts);

                // create AdminJob
                const adminJobInput = new AdminJobModel({
                    title: jobCreated.title,
                    employerName: jobCreated.employerName,
                    publishStart: jobCreated.publishStart,
                    publishEnd: jobCreated.publishEnd,
                    job: jobCreated._id,
                    publishInd: PUBIND_NEW,
                    status: STATUS_PENDING,
                    createdBy: jobCreated.createdBy,
                });

                const adminJobCreated = await adminJobInput.save(opts);

                // only commmit data changes in this block
                await mongodbSession.commitTransaction();
                mongodbSession.endSession();

                req.flash("success", { msg: "New Admin Job created: " + adminJobInput._id });
                return res.redirect("/adminJobs");
            } else {
                req.flash("errors", errors.array());
            }

            const locationOptions = selectOption.OPTIONS_LOCATION();
            selectOption.markSelectedOptions(req.body.location, locationOptions);

            // client side script
            const includeScripts = ["/ckeditor/ckeditor.js", "/js/adminJob/form.js"];

            res.render("adminJob/form", {
                title: "Admin",
                title2: "Create Admin Job",
                job: jobInput,
                includeScripts: includeScripts,
                locationOptions: locationOptions,
                bu: req.query.bu,
            });

        } catch (err) {
            logger.error((<Error>err).stack);

            await mongodbSession.abortTransaction();
            mongodbSession.endSession();

            req.flash("errors", { msg: "Unexpected error. Please try again later. Contact Support Team if the problem persists." });
            res.redirect("/adminJobs");
        }
    }
];

/**
 * GET /adminJob/:id
 * View Job Detail page.
 */
export let getJobDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminJobId = req.params.id;
        const adminJobDb = await AdminJobModel
            .findById(adminJobId)
            .populate("recruiter");

        if (adminJobDb) {
            const jobId = adminJobDb.job;
            const jobDb = await JobModel.findById(jobId);
            if (!jobDb) {
                const error = new Error(`Job not found for adminJobDb._id=${adminJobDb._id}`);
                throw error;
            }

            // client side script
            const includeScripts = ["/ckeditor/ckeditor.js", "/js/adminJob/detail.js"];

            res.render("adminJob/detail", {
                title: "Admin",
                title2: "Admin Job Detail",
                adminJobId: adminJobId,
                adminJob: adminJobDb,
                jobId: jobDb._id.toString(),
                job: jobDb,
                includeScripts: includeScripts,
                bu: req.query.bu,
            });

        } else {
            req.flash("errors", { msg: "Admin Job not found." });
            return res.redirect(backUrl.goBack(req.query.bu, "/adminJobs"));
        }

    } catch (err) {
        logger.error((<Error>err).stack);
        req.flash("errors", { msg: "Unexpected error. Please try again later. Contact Support Team if the problem persists." });
        res.redirect("/adminJobs");
    }
};

/**
 * GET /adminJob/:id/update
 * Update Job page.
 */
export let getJobUpdate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminJobId = req.params.id;
        const adminJobDb = await AdminJobModel.findById(adminJobId);

        if (!adminJobDb) {
            req.flash("errors", { msg: "Admin Job not found." });
            return res.redirect(backUrl.goBack(req.query.bu, "/adminJobs"));
        }

        /**
         * - Only the following posting can be edited:
         *  - Status = "Pending"; Publish Ind = "New"
         *    - All fields are editable.
         *  - Status = "Active"; Publish Ind = "Unpublished"
         *    - "Publish Option" and "Publish Start Date" fields are not editable.
         */
        let isEditable = false;
        if ((adminJobDb.status === STATUS_PENDING && adminJobDb.publishInd === PUBIND_NEW)
            || (adminJobDb.status === STATUS_ACTIVE && adminJobDb.publishInd === PUBIND_UNPUBLISHED)) {
                isEditable = true;
        }
        if (!isEditable) {
            const error = new Error("Admin Job is not editable.");
            throw error;
        }

        const jobId = adminJobDb.job;
        const jobDb = await JobModel.findById(jobId);
        if (!jobDb) {
            const error = new Error(`Job not found for adminJobDb._id=${adminJobDb._id}`);
            throw error;
        }

        const jobInput = Object.assign(jobDb, {
            title: adminJobDb.title,
            description: jobDb.description,
            employerName: adminJobDb.employerName,
            applyMethod: jobDb.applyMethod,
            salary: jobDb.salary,
            location: jobDb.locationCodes,
            closing: jobDb.closing,
            publishStart: adminJobDb.publishStart,
            publishEnd: adminJobDb.publishEnd,
            // weight: number,
            // tag: string[],
            customContent: jobDb.customContent,
            imgUrl: jobDb.imgUrl,
            postType: jobDb.postType,
            status: adminJobDb.status,
            publishInd: adminJobDb.publishInd,
        });

        const locationOptions = selectOption.OPTIONS_LOCATION();
        selectOption.markSelectedOptions(jobDb.locationCodes, locationOptions);

        // client side script
        const includeScripts = ["/ckeditor/ckeditor.js", "/js/lib/moment.min.js", "/js/adminJob/form.js"];

        res.render("adminJob/form", {
            title: "Admin",
            title2: "Edit Admin Job",
            adminJobId: adminJobId,
            job: jobInput,
            includeScripts: includeScripts,
            locationOptions: locationOptions,
            bu: req.query.bu,
        });

    } catch (err) {
        logger.error((<Error>err).stack);

        req.flash("errors", { msg: "Unexpected error. Please try again later. Contact Support Team if the problem persists." });
        res.redirect("/adminJobs");
    }

};

/**
 * POST /adminJob/:id/update
 * Update an existing Job.
 */
export let postJobUpdate = [
    // convert multiple selection input into array
    (req: Request, res: Response, next: NextFunction) => {
        if (!(req.body.location instanceof Array)) {
            if (typeof req.body.location === "undefined") {
                req.body.location = [];
            }
            else {
                req.body.location = new Array(req.body.location);
            }
        }
        next();
    },

    // validate values
    body("title").isLength({ min: 1 }).trim().withMessage("Post Title is required."),
    body("employerName").isLength({ min: 1 }).trim().withMessage("Employer Name is required."),
    body("applyMethod").isLength({ min: 1 }).trim().withMessage("Apply Method is required."),

    // must be >= today
    body("publishStart").isLength({ min: 1 }).trim().withMessage("Publish Date Start is required.")
    .isISO8601().withMessage("Publish Date Start is invalid.")
    .isAfter(moment().add(-1, "day").format("YYYY-MM-DD")).withMessage("Publish Date Start must be from today onwards."),

    body("publishEnd").isLength({ min: 1 }).trim().withMessage("Publish Date End is required.")
    .isISO8601().withMessage("Publish Date End is invalid.")
    .custom((value, { req }) => {
        const publishEndDate = moment(value, "YYYY-MM-DD");
        const publishStartDate = moment(req.body.publishStart, "YYYY-MM-DD");
        return !publishStartDate.isAfter(publishEndDate);
    }).withMessage("Publish Date End must be the same or after Publish Date Start"),

    body("closing").isLength({ min: 1 }).trim().withMessage("Closing is required."),

    // sanitize values
    sanitizeBody("*").trim().escape(),
    sanitizeBody("bu").trim().unescape(),
    sanitizeBody("publishStart").toDate(),
    sanitizeBody("publishEnd").toDate(),

    // process request
    async (req: Request, res: Response, next: NextFunction) => {
        const mongodbSession = await mongoose.startSession();
        mongodbSession.startTransaction();
        const opts = { session: mongodbSession, new: true };

        try {
            const errors = validationResult(req);

            const locationInput = composeLocationFromRequest(req);

            const adminJobId = req.params.id;

            const adminJobDb = await AdminJobModel.findById(adminJobId);
            if (!adminJobDb) {
                const error = new Error(`Admin Job not found for _id=${adminJobId}`);
                throw error;
            }

            const jobDb = await JobModel.findById(adminJobDb.job);
            if (!jobDb) {
                const error = new Error(`Job not found for _id=${adminJobDb.job}`);
                throw error;
            }

            const customValidationErrors = [];

            /**
             * Custom Validations
             * - When editing status "Pending", publishdInd "New" posts:
             */
            if (adminJobDb.status === STATUS_PENDING && adminJobDb.publishInd === PUBIND_NEW) {
                // Publish Start must be > today
                if (!moment(req.body.publishStart, "YYYY-MM-DD").isAfter(moment())) {
                    customValidationErrors.push({ msg: "Publish Date Start must be from tomorrow onwards." });
                }
            }

            const adminJobInput = {
                title: req.body.title,
                employerName: req.body.employerName,
                publishStart: req.body.publishStart,
                publishEnd: req.body.publishEnd,
                updatedBy: req.user.id
            };

            const jobInput = {
                title: req.body.title,
                description: req.body.description,
                employerName: req.body.employerName,
                applyMethod: req.body.applyMethod,
                salary: req.body.salary,
                location: locationInput,
                closing: req.body.closing,
                publishStart: req.body.publishStart,
                publishEnd: req.body.publishEnd,
                // weight: number,
                // tag: string[],
                customContent: req.body.customContent,
                imgUrl: req.body.imgUrl,
                updatedBy: req.user.id
            };

            if (errors.isEmpty() && customValidationErrors.length == 0) {
                /**
                 * - Only the following posting can be edited:
                 *  - Status = "Pending"; Publish Ind = "New"
                 *    - All fields are editable.
                 *  - Status = "Active"; Publish Ind = "Unpublished"
                 *    - All fields are editable.
                 */
                let isEditable = false;
                if ((adminJobDb.status === STATUS_PENDING && adminJobDb.publishInd === PUBIND_NEW)
                    || (adminJobDb.status === STATUS_ACTIVE && adminJobDb.publishInd === PUBIND_UNPUBLISHED)) {
                        isEditable = true;
                }
                if (!isEditable) {
                    const error = new Error("Admin Job is not editable.");
                    throw error;
                }

                const adminJobUpdated = await Object.assign(adminJobDb, adminJobInput).save(opts);
                const jobUpdated = await Object.assign(jobDb, jobInput).save(opts);

                // only commmit data changes in this block
                await mongodbSession.commitTransaction();
                mongodbSession.endSession();

                req.flash("success", { msg: "Admin Job successfully updated" });
                return res.redirect("/adminJobs");

            } else if (!errors.isEmpty()) {
                req.flash("errors", errors.array());
            } else {
                req.flash("errors", customValidationErrors);
            }

            const locationOptions = selectOption.OPTIONS_LOCATION();
            selectOption.markSelectedOptions(req.body.location, locationOptions);

            // client side script
            const includeScripts = ["/ckeditor/ckeditor.js", "/js/lib/moment.min.js", "/js/adminJob/form.js"];

            res.render("adminJob/form", {
                title: "Admin",
                title2: "Edit Admin Job",
                adminJobId: adminJobId,
                job: Object.assign(jobDb, jobInput),
                includeScripts: includeScripts,
                locationOptions: locationOptions,
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
            res.redirect("/adminJobs");
        }

    }
];

/**
 * POST /adminJob/:id/delete
 * Delete an existing Job.
 */
export let postJobDelete = [
    // validate values
    body("id").isLength({ min: 1 }).trim().withMessage("Job ID is required."),

    // process request
    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);

        const jobInput = new JobModel({
            _id: req.params.id,
            status: "D",
            updatedBy: req.user.id
        });

        if (errors.isEmpty()) {
            JobModel.findById(req.params.id, (err, targetJob) => {
                if (err) { return next(err); }

                if (!targetJob) {
                    req.flash("errors", { msg: "Job not found." });
                    const bu = backUrl.decodeBackUrl(req.body.bu);
                    if (bu) {
                        return res.redirect(bu);
                    } else {
                        return res.redirect("/adminJobs");
                    }
                }

                JobModel.findByIdAndUpdate(req.params.id, jobInput, (err, jobUpdated: IJob) => {
                    if (err) { return next(err); }
                    req.flash("success", { msg: "Job successfully deleted." });
                    const bu = backUrl.decodeBackUrl(req.body.bu);
                    if (bu) {
                        return res.redirect(bu);
                    } else {
                        return res.redirect("/adminJobs");
                    }
                });
            });
        } else {
            req.flash("errors", errors.array());
            const bu = backUrl.decodeBackUrl(req.body.bu);
            if (bu) {
                return res.redirect(bu);
            } else {
                return res.redirect("/adminJobs");
            }
        }
    }
];



/**
 * GET /adminJob/embedFbPost
 * Embed Facebook Post page.
 */
export let getJobEmbedFbPost = (req: Request, res: Response, next: NextFunction) => {

    // set default values
    const jobInput = new JobModel({
            publishStart: moment().add(1, "days"),
            publishEnd: moment().add(29, "days")
    });

    // client side script
    const includeScripts = ["/js/adminJob/formEmbedFbPost.js"];

    res.render("adminJob/formEmbedFbPost", {
        title: "Admin",
        title2: "Embed Facebook Post",
        job: jobInput,
        includeScripts: includeScripts,
    });
};

/**
 * POST /adminJob/embedFbPost
 * Embed Facebook Post page.
 */
export let postJobEmbedFbPost = [
    // validate values
    body("title").isLength({ min: 1 }).trim().withMessage("Post Title is required."),
    body("fbPostUrl").isLength({ min: 1 }).trim().withMessage("Facebook Post URL is required."),

    // must be >= today
    body("publishStart").isLength({ min: 1 }).trim().withMessage("Publish Date Start is required.")
    .isISO8601().withMessage("Publish Date Start is invalid.")
    .isAfter(moment().add(-1, "day").format("YYYY-MM-DD")).withMessage("Publish Date Start must be from today onwards."),

    body("publishEnd").isLength({ min: 1 }).trim().withMessage("Publish Date End is required.")
    .isISO8601().withMessage("Publish Date End is invalid.")
    .custom((value, { req }) => {
        const publishEndDate = moment(value, "YYYY-MM-DD");
        const publishStartDate = moment(req.body.publishStart, "YYYY-MM-DD");
        return !publishStartDate.isAfter(publishEndDate);
    }).withMessage("Publish Date End must be the same or after Publish Date Start"),

    // sanitize values
    sanitizeBody("*").trim().escape(),
    sanitizeBody("publishStart").toDate(),
    sanitizeBody("publishEnd").toDate(),

    // process request
    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);

        const jobInput = new JobModel({
            title: req.body.title,
            fbPostUrl: req.body.fbPostUrl,
            publishStart: req.body.publishStart,
            publishEnd: req.body.publishEnd,
            // weight: number,
            // tag: string[],
            postType: POSTTYPE_FB,
            status: "A",
            createdBy: req.user.id
        });

        if (errors.isEmpty()) {
            jobInput.save((err, jobCreated) => {
                if (err) { return next(err); }
                req.flash("success", { msg: "New post created: " + jobCreated._id });
                return res.redirect("/adminJobs");
            });
        } else {
            req.flash("errors", errors.array());

            // client side script
            const includeScripts = ["/js/adminJob/formEmbedFbPost.js"];

            res.render("adminJob/formEmbedFbPost", {
                title: "Admin",
                title2: "Embed Facebook Post",
                job: jobInput,
                includeScripts: includeScripts,
            });
        }
    }
];



/**
 * GET /adminJob/:id/updateFbPost
 * Update Embedded Facebook Post page.
 */
export let getJobUpdateFbPost = (req: Request, res: Response, next: NextFunction) => {
    async.parallel({
        job: function(callback) {
            JobModel.findById(req.params.id)
                .exec(callback);
        }
    }, function(err, results) {
        if (err) { return next(err); }

        if (!results.job) {
            req.flash("errors", { msg: "Post not found." });
            const bu = backUrl.decodeBackUrl(req.query.bu);
            if (bu) {
                return res.redirect(bu);
            } else {
                return res.redirect("/adminJobs");
            }
        }

        const jobDb = results.job as IJob;

        // client side script
        const includeScripts = ["/js/adminJob/formEmbedFbPost.js"];

        res.render("adminJob/formEmbedFbPost", {
            title: "Admin",
            title2: "Edit Embedded Facebook Post Detail",
            job: jobDb,
            jobId: jobDb._id,
            includeScripts: includeScripts,
            bu: req.query.bu,
        });

    });
};

/**
 * POST /adminJob/:id/updateFbPost
 * Update Embedded Facebook Post page.
 */
export let postJobUpdateFbPost = [
    // validate values
    body("title").isLength({ min: 1 }).trim().withMessage("Post Title is required."),
    body("fbPostUrl").isLength({ min: 1 }).trim().withMessage("Facebook Post URL is required."),

    // must be >= today
    body("publishStart").isLength({ min: 1 }).trim().withMessage("Publish Date Start is required.")
    .isISO8601().withMessage("Publish Date Start is invalid.")
    .isAfter(moment().add(-1, "day").format("YYYY-MM-DD")).withMessage("Publish Date Start must be from today onwards."),

    body("publishEnd").isLength({ min: 1 }).trim().withMessage("Publish Date End is required.")
    .isISO8601().withMessage("Publish Date End is invalid.")
    .custom((value, { req }) => {
        const publishEndDate = moment(value, "YYYY-MM-DD");
        const publishStartDate = moment(req.body.publishStart, "YYYY-MM-DD");
        return !publishStartDate.isAfter(publishEndDate);
    }).withMessage("Publish Date End must be the same or after Publish Date Start."),

    // sanitize values
    sanitizeBody("*").trim().escape(),
    sanitizeBody("bu").trim().unescape(),
    sanitizeBody("publishStart").toDate(),
    sanitizeBody("publishEnd").toDate(),

    // process request
    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);

        const jobInput = new JobModel({
            title: req.body.title,
            fbPostUrl: req.body.fbPostUrl,
            publishStart: req.body.publishStart,
            publishEnd: req.body.publishEnd,
            // weight: number,
            // tag: string[],
            postType: POSTTYPE_FB,
            _id: req.params.id,
            updatedBy: req.user.id
        });

        if (errors.isEmpty()) {
            JobModel.findById(req.params.id, (err, targetJob) => {
                if (err) { return next(err); }

                if (!targetJob) {
                    req.flash("errors", { msg: "Post not found." });
                    const bu = backUrl.decodeBackUrl(req.body.bu);
                    if (bu) {
                        return res.redirect(bu);
                    } else {
                        return res.redirect("/adminJobs");
                    }
                }

                JobModel.findByIdAndUpdate(req.params.id, jobInput, (err, jobUpdated: IJob) => {
                    if (err) { return next(err); }
                    req.flash("success", { msg: "Post successfully updated." });
                    return res.redirect(jobUpdated.url + "?bu=" + req.body.bu);
                });
            });
        } else {
            req.flash("errors", errors.array());

            // client side script
            const includeScripts = ["/js/adminJob/formEmbedFbPost.js"];

            res.render("adminJob/formEmbedFbPost", {
                title: "Admin",
                title2: "Edit Embedded Facebook Post Detail",
                job: jobInput,
                jobId: jobInput._id,
                includeScripts: includeScripts,
                bu: req.body.bu,
            });
        }
    }
];