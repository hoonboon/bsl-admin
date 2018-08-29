import async from "async";
import moment from "moment";
import { Request, Response, NextFunction } from "express";

import { body, validationResult } from "express-validator/check";
import { sanitizeBody } from "express-validator/filter";

import { default as Job, JobModel, POSTTYPE_FB, POSTTYPE_NORMAL } from "../models/Job";

import { PageInfo, getNewPageInfo } from "../util/pagination";
import * as selectOption from "../util/selectOption";

const DEFAULT_ROW_PER_PAGE: number = 10;

/**
 * GET /jobs
 * Job listing page.
 */
export let getJobs = (req: Request, res: Response, next: NextFunction) => {
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

    const query = Job.find();

    // filter records
    if (searchPublishStartFrom) {
        query.where("publishStart").gte(<any>searchPublishStartFrom);
    }

    if (searchPublishStartTo) {
        query.where("publishStart").lte(<any>searchPublishStartTo);
    }

    if (searchTitle) {
        const regex = new RegExp(searchTitle.toUpperCase().replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"));
        query.where("title").regex(regex);
    }

    if (searchEmployerName) {
        const regex = new RegExp(searchEmployerName.toUpperCase().replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"));
        query.where("nric").regex(regex);
    }

    query.where("status").in(["A"]);

    let pageInfo: PageInfo;

    query.count()
        .then(function(count: number) {
            if (count > 0) {
                pageInfo = getNewPageInfo(count, rowPerPage, newPageNo);

                query.find();
                query.skip(pageInfo.rowNoStart - 1);
                query.limit(rowPerPage);
                query.sort([["publishStart", "descending"], ["createdAt", "descending"]]);
                return query.exec();
            } else {
                Promise.resolve();
            }
        })
        .then(function (item_list: any) {
            let rowPerPageOptions, pageNoOptions;
            if (pageInfo) {
                rowPerPageOptions = selectOption.OPTIONS_ROW_PER_PAGE();
                selectOption.markSelectedOption(rowPerPage.toString(), rowPerPageOptions);

                pageNoOptions = selectOption.OPTIONS_PAGE_NO(pageInfo.totalPageNo);
                selectOption.markSelectedOption(pageInfo.curPageNo.toString(), pageNoOptions);
            }

            // client side script
            const includeScripts = ["/js/job/list.js", "/js/util/pagination.js"];

            res.render("job/list", {
                title: "Job",
                title2: "Job List",
                job_list: item_list,
                searchPublishStartFrom: searchPublishStartFrom,
                searchPublishStartTo: searchPublishStartTo,
                searchTitle: searchTitle,
                searchEmployerName: searchEmployerName,
                rowPerPageOptions: rowPerPageOptions,
                pageNoOptions: pageNoOptions,
                pageInfo: pageInfo,
                includeScripts: includeScripts
            });
        })
        .catch(function(error) {
            console.error(error);
            return next(error);
        });

};

/**
 * GET /job/create
 * Create Job page.
 */
export let getJobCreate = (req: Request, res: Response, next: NextFunction) => {
    // // TODO: for local testing only
    // const jobInput = new Job({
    //     title: "Some Job 1",
    //     description: "Some Job Description 1",
    //     employerName: "Some Employer",
    //     applyMethod: "Whatsapp/ SMS 012-3456789",
    //     salary: "Min MYR800.00/bulan +EPF+SOCSO",
    //     location: "Pasir Pekan, Wakaf Bahru",
    //     closing: "SEGERA",
    //     publishStart: moment().add(1, "days"),
    //     publishEnd: moment().add(29, "days"),
    //     // weight: number,
    //     // tag: string[],
    //     // customContent: string,
    // });

    // set default values
    const jobInput = new Job({
            publishStart: moment().add(1, "days"),
            publishEnd: moment().add(29, "days")
    });

    // client side script
    const includeScripts = ["/ckeditor/ckeditor.js", "/js/job/form.js"];

    res.render("job/form", {
        title: "Job",
        title2: "Create Job",
        job: jobInput,
        includeScripts: includeScripts,
        locationOptions: selectOption.OPTIONS_LOCATION()
    });
};

/**
 * POST /job/create
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

    // TODO: must be >= today
    body("publishStart").isLength({ min: 1 }).trim().withMessage("Publish Date Start is required.")
    .isISO8601().withMessage("Publish Date Start is invalid."),

    body("publishEnd").isLength({ min: 1 }).trim().withMessage("Publish Date End is required.")
    .isISO8601().withMessage("Publish Date End is invalid."),

    // TODO: publish start <= publish end

    body("closing").isLength({ min: 1 }).trim().withMessage("Closing is required."),

    // sanitize values
    sanitizeBody("*").trim().escape(),
    sanitizeBody("publishStart").toDate(),
    sanitizeBody("publishEnd").toDate(),

    // process request
    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);

        const jobInput = new Job({
            title: req.body.title,
            description: req.body.description,
            employerName: req.body.employerName,
            applyMethod: req.body.applyMethod,
            salary: req.body.salary,
            location: req.body.location,
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
        }) as JobModel;

        if (errors.isEmpty()) {
            jobInput.save((err, jobCreated) => {
                if (err) { return next(err); }
                req.flash("success", { msg: "New job created: " + jobCreated._id });
                res.redirect("/jobs");
            });
        } else {
            req.flash("errors", errors.array());

            const locationOptions = selectOption.OPTIONS_LOCATION();
            selectOption.markSelectedOptions(jobInput.location, locationOptions);

            // client side script
            const includeScripts = ["/ckeditor/ckeditor.js", "/js/job/form.js"];

            res.render("job/form", {
                title: "Job",
                title2: "Create Job",
                job: jobInput,
                includeScripts: includeScripts,
                locationOptions: locationOptions
            });
        }
    }
];

/**
 * GET /job/:id
 * View Job Detail page.
 */
export let getJobDetail = (req: Request, res: Response, next: NextFunction) => {
    Job.findById(req.params.id)
    .exec((err, jobDb) => {
        if (err) { return next(err); }
        if (jobDb) {
            // client side script
            const includeScripts = ["/ckeditor/ckeditor.js", "/js/job/detail.js"];

            res.render("job/detail", {
                title: "Job",
                title2: "Job Detail",
                job: jobDb,
                jobId: jobDb._id,
                includeScripts: includeScripts
            });
        } else {
            req.flash("errors", { msg: "Job not found." });
            res.redirect("/jobs");
        }
    });
};

/**
 * GET /job/:id/update
 * Update Job page.
 */
export let getJobUpdate = (req: Request, res: Response, next: NextFunction) => {
    async.parallel({
        job: function(callback) {
            Job.findById(req.params.id)
                .exec(callback);
        }
    }, function(err, results) {
        if (err) { return next(err); }

        if (!results.job) {
            req.flash("errors", { msg: "Job not found." });
            res.redirect("/jobs");
        }

        const jobDb = results.job as JobModel;

        const locationOptions = selectOption.OPTIONS_LOCATION();
        selectOption.markSelectedOptions(jobDb.location, locationOptions);

        // client side script
        const includeScripts = ["/ckeditor/ckeditor.js", "/js/job/form.js"];

        res.render("job/form", {
            title: "Job",
            title2: "Edit Job Detail",
            job: jobDb,
            jobId: jobDb._id,
            includeScripts: includeScripts,
            locationOptions: locationOptions
        });

    });
};

/**
 * POST /job/:id/update
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

    // TODO: must be >= today
    body("publishStart").isLength({ min: 1 }).trim().withMessage("Publish Date Start is required.")
    .isISO8601().withMessage("Publish Date Start is invalid."),

    body("publishEnd").isLength({ min: 1 }).trim().withMessage("Publish Date End is required.")
    .isISO8601().withMessage("Publish Date End is invalid."),

    // TODO: publish start <= publish end

    body("closing").isLength({ min: 1 }).trim().withMessage("Closing is required."),

    // sanitize values
    sanitizeBody("*").trim().escape(),
    sanitizeBody("publishStart").toDate(),
    sanitizeBody("publishEnd").toDate(),

    // process request
    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);

        const jobInput = new Job({
            title: req.body.title,
            description: req.body.description,
            employerName: req.body.employerName,
            applyMethod: req.body.applyMethod,
            salary: req.body.salary,
            location: req.body.location,
            closing: req.body.closing,
            publishStart: req.body.publishStart,
            publishEnd: req.body.publishEnd,
            // weight: number,
            // tag: string[],
            customContent: req.body.customContent,
            imgUrl: req.body.imgUrl,
            postType: POSTTYPE_NORMAL,
            _id: req.params.id,
            updatedBy: req.user.id
        }) as JobModel;

        if (errors.isEmpty()) {
            Job.findById(req.params.id, (err, targetJob) => {
                if (err) { return next(err); }

                if (!targetJob) {
                    req.flash("errors", { msg: "Job not found." });
                    res.redirect("/jobs");
                }

                Job.findByIdAndUpdate(req.params.id, jobInput, (err, jobUpdated: JobModel) => {
                    if (err) { return next(err); }
                    req.flash("success", { msg: "Job successfully updated." });
                    res.redirect(jobUpdated.url);
                });
            });
        } else {
            req.flash("errors", errors.array());

            const locationOptions = selectOption.OPTIONS_LOCATION();
            selectOption.markSelectedOptions(jobInput.location, locationOptions);

            // client side script
            const includeScripts = ["/ckeditor/ckeditor.js", "/js/job/form.js"];

            res.render("job/form", {
                title: "Job",
                title2: "Edit Job Detail",
                job: jobInput,
                jobId: jobInput._id,
                includeScripts: includeScripts,
                locationOptions: locationOptions
            });
        }
    }
];

/**
 * POST /job/:id/delete
 * Delete an existing Job.
 */
export let postJobDelete = [
    // validate values
    body("id").isLength({ min: 1 }).trim().withMessage("Job ID is required."),

    // process request
    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);

        const jobInput = new Job({
            _id: req.params.id,
            status: "D",
            updatedBy: req.user.id
        });

        if (errors.isEmpty()) {
            Job.findById(req.params.id, (err, targetJob) => {
                if (err) { return next(err); }

                if (!targetJob) {
                    req.flash("errors", { msg: "Job not found." });
                    res.redirect("/jobs");
                }

                Job.findByIdAndUpdate(req.params.id, jobInput, (err, jobUpdated: JobModel) => {
                    if (err) { return next(err); }
                    req.flash("success", { msg: "Job successfully deleted." });
                    res.redirect("/jobs");
                });
            });
        } else {
            req.flash("errors", errors.array());
            res.redirect("/jobs");
        }
    }
];



/**
 * GET /job/embedFbPost
 * Embed Facebook Post page.
 */
export let getJobEmbedFbPost = (req: Request, res: Response, next: NextFunction) => {

    // set default values
    const jobInput = new Job({
            publishStart: moment().add(1, "days"),
            publishEnd: moment().add(29, "days")
    });

    // client side script
    // const includeScripts = ["/js/job/form.js"];

    res.render("job/formEmbedFbPost", {
        title: "Job",
        title2: "Embed Facebook Post",
        job: jobInput,
        // includeScripts: includeScripts,
    });
};

/**
 * POST /job/embedFbPost
 * Embed Facebook Post page.
 */
export let postJobEmbedFbPost = [
    // validate values
    body("title").isLength({ min: 1 }).trim().withMessage("Post Title is required."),
    body("fbPostUrl").isLength({ min: 1 }).trim().withMessage("Facebook Post URL is required."),

    // TODO: must be >= today
    body("publishStart").isLength({ min: 1 }).trim().withMessage("Publish Date Start is required.")
    .isISO8601().withMessage("Publish Date Start is invalid."),

    body("publishEnd").isLength({ min: 1 }).trim().withMessage("Publish Date End is required.")
    .isISO8601().withMessage("Publish Date End is invalid."),

    // TODO: publish start <= publish end

    // sanitize values
    sanitizeBody("*").trim().escape(),
    sanitizeBody("publishStart").toDate(),
    sanitizeBody("publishEnd").toDate(),

    // process request
    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);

        const jobInput = new Job({
            title: req.body.title,
            fbPostUrl: req.body.fbPostUrl,
            publishStart: req.body.publishStart,
            publishEnd: req.body.publishEnd,
            // weight: number,
            // tag: string[],
            postType: POSTTYPE_FB,
            status: "A",
            createdBy: req.user.id
        }) as JobModel;

        if (errors.isEmpty()) {
            jobInput.save((err, jobCreated) => {
                if (err) { return next(err); }
                req.flash("success", { msg: "New post created: " + jobCreated._id });
                res.redirect("/jobs");
            });
        } else {
            req.flash("errors", errors.array());

            // client side script
            // const includeScripts = [];

            res.render("job/formEmbedFbPost", {
                title: "Job",
                title2: "Embed Facebook Post",
                job: jobInput,
                // includeScripts: includeScripts,
            });
        }
    }
];



/**
 * GET /job/:id/updateFbPost
 * Update Embedded Facebook Post page.
 */
export let getJobUpdateFbPost = (req: Request, res: Response, next: NextFunction) => {
    async.parallel({
        job: function(callback) {
            Job.findById(req.params.id)
                .exec(callback);
        }
    }, function(err, results) {
        if (err) { return next(err); }

        if (!results.job) {
            req.flash("errors", { msg: "Post not found." });
            res.redirect("/jobs");
        }

        const jobDb = results.job as JobModel;

        // client side script
        // const includeScripts = [];

        res.render("job/formEmbedFbPost", {
            title: "Job",
            title2: "Edit Embedded Facebook Post Detail",
            job: jobDb,
            jobId: jobDb._id,
            // includeScripts: includeScripts,
        });

    });
};

/**
 * POST /job/:id/updateFbPost
 * Update Embedded Facebook Post page.
 */
export let postJobUpdateFbPost = [
    // validate values
    body("title").isLength({ min: 1 }).trim().withMessage("Post Title is required."),
    body("fbPostUrl").isLength({ min: 1 }).trim().withMessage("Facebook Post URL is required."),

    // TODO: must be >= today
    body("publishStart").isLength({ min: 1 }).trim().withMessage("Publish Date Start is required.")
    .isISO8601().withMessage("Publish Date Start is invalid."),

    body("publishEnd").isLength({ min: 1 }).trim().withMessage("Publish Date End is required.")
    .isISO8601().withMessage("Publish Date End is invalid."),

    // TODO: publish start <= publish end

    // sanitize values
    sanitizeBody("*").trim().escape(),
    sanitizeBody("publishStart").toDate(),
    sanitizeBody("publishEnd").toDate(),

    // process request
    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);

        const jobInput = new Job({
            title: req.body.title,
            fbPostUrl: req.body.fbPostUrl,
            publishStart: req.body.publishStart,
            publishEnd: req.body.publishEnd,
            // weight: number,
            // tag: string[],
            postType: POSTTYPE_FB,
            _id: req.params.id,
            updatedBy: req.user.id
        }) as JobModel;

        if (errors.isEmpty()) {
            Job.findById(req.params.id, (err, targetJob) => {
                if (err) { return next(err); }

                if (!targetJob) {
                    req.flash("errors", { msg: "Post not found." });
                    res.redirect("/jobs");
                }

                Job.findByIdAndUpdate(req.params.id, jobInput, (err, jobUpdated: JobModel) => {
                    if (err) { return next(err); }
                    req.flash("success", { msg: "Post successfully updated." });
                    res.redirect(jobUpdated.url);
                });
            });
        } else {
            req.flash("errors", errors.array());

            res.render("job/formEmbedFbPost", {
                title: "Job",
                title2: "Edit Embedded Facebook Post Detail",
                job: jobInput,
                jobId: jobInput._id,
            });
        }
    }
];