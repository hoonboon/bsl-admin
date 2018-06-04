import async from "async";
import moment from "moment";
import { Request, Response, NextFunction } from "express";
import { WriteError } from "mongodb";

import { body, validationResult } from "express-validator/check";
import { sanitizeBody } from "express-validator/filter";

import { default as Job, JobModel } from "../models/Job";
import logger from "../util/logger";

/**
 * GET /jobs
 * Job listing page.
 */
export let getJobs = (req: Request, res: Response, next: NextFunction) => {
    let searchPublishStartFrom = req.query.searchPublishStartFrom;
    let searchPublishStartTo = req.query.searchPublishStartTo;
    const searchTitle = req.query.searchTitle;
    const searchEmployerName = req.query.searchNric;

    // default filter
    if (!searchPublishStartFrom && !searchPublishStartTo && !searchTitle && !searchEmployerName) {
        // show posts with Publish Start date 7 days before and after current date
        searchPublishStartFrom = moment().subtract(7, "days").format("YYYY-MM-DD");
        searchPublishStartTo = moment().add(7, "days").format("YYYY-MM-DD");
    }

    const query = Job.find();

    // filter records
    if (searchPublishStartFrom) {
        query.where("publishStart").gte(searchPublishStartFrom);
    }

    if (searchPublishStartTo) {
        query.where("publishStart").lte(searchPublishStartTo);
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

    query.sort([["publishStart", "descending"], ["createdAt", "descending"]]);

    // client side script
    const includeScript = "/js/job/list.js";

    query.exec(function (err, item_list: any) {
            if (err) {
                return next(err);
            }
            res.render("job/list", {
                title: "Job",
                title2: "Job List",
                job_list: item_list,
                searchPublishStartFrom: searchPublishStartFrom,
                searchPublishStartTo: searchPublishStartTo,
                searchTitle: searchTitle,
                searchEmployerName: searchEmployerName,
                includeScript: includeScript
            });
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
    //     employer: {
    //       name: "Some Employer",
    //       contact: "Some contact person and no."
    //     },
    //     salary: "Min MYR800.00/bulan +EPF+SOCSO",
    //     empType: "Part Time",
    //     language: "BM/EN",
    //     location: "Pasir Pekan, Wakaf Bahru",
    //     closing: "SEGERA",
    //     publishStart: moment(),
    //     publishEnd: moment().add(10, "days"),
    //     // weight: number,
    //     // tag: string[],
    //     // customContent: string,
    // });

    // set default values
    const jobInput = new Job({
            publishStart: moment().add(3, "days"),
            publishEnd: moment().add(13, "days")
    });

    res.render("job/form", {
        title: "Job",
        title2: "Create Job",
        job: jobInput
    });
};

/**
 * POST /job/create
 * Create a new Job.
 */
export let postJobCreate = [
    // validate values
    body("title").isLength({ min: 1 }).trim().withMessage("Job Title is required."),
    body("description").isLength({ min: 1 }).trim().withMessage("Job Description is required."),
    body("employerName").isLength({ min: 1 }).trim().withMessage("Employer Name is required."),
    body("employerContact").isLength({ min: 1 }).trim().withMessage("Contact is required."),

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
            employer: {
              name: req.body.employerName,
              contact: req.body.employerContact
            },
            salary: req.body.salary,
            empType: req.body.empType,
            language: req.body.language,
            location: req.body.location,
            closing: req.body.closing,
            publishStart: req.body.publishStart,
            publishEnd: req.body.publishEnd,
            // weight: number,
            // tag: string[],
            // customContent: string,
            status: "A",
            createdBy: req.user.id
        });

        if (errors.isEmpty()) {
            jobInput.save((err, jobCreated) => {
                if (err) { return next(err); }
                req.flash("success", { msg: "New job created: " + jobCreated._id });
                res.redirect("/jobs");
            });
        } else {
            req.flash("errors", errors.array());

            res.render("job/form", {
                title: "Job",
                title2: "Create Job",
                job: jobInput
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
            const includeScript = "/js/job/detail.js";

            res.render("job/detail", {
                title: "Job",
                title2: "Job Detail",
                job: jobDb,
                jobId: jobDb._id,
                includeScript: includeScript
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
            res.redirect("/jobss");
        }

        const jobDb = <JobModel>results.job;

        res.render("job/form", {
            title: "Job",
            title2: "Edit Job Detail",
            job: jobDb,
            jobId: jobDb._id
        });

    });
};

/**
 * POST /job/:id/update
 * Update an existing Job.
 */
export let postJobUpdate = [
    // validate values
    body("title").isLength({ min: 1 }).trim().withMessage("Job Title is required."),
    body("description").isLength({ min: 1 }).trim().withMessage("Job Description is required."),
    body("employerName").isLength({ min: 1 }).trim().withMessage("Employer Name is required."),
    body("employerContact").isLength({ min: 1 }).trim().withMessage("Contact is required."),

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
            employer: {
              name: req.body.employerName,
              contact: req.body.employerContact
            },
            salary: req.body.salary,
            empType: req.body.empType,
            language: req.body.language,
            location: req.body.location,
            closing: req.body.closing,
            publishStart: req.body.publishStart,
            publishEnd: req.body.publishEnd,
            // weight: number,
            // tag: string[],
            // customContent: string,
            _id: req.params.id,
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
                    req.flash("success", { msg: "Job successfully updated." });
                    res.redirect(jobUpdated.url);
                });
            });
        } else {
            req.flash("errors", errors.array());

            res.render("job/form", {
                title: "Job",
                title2: "Edit Job Detail",
                job: jobInput,
                jobId: jobInput._id
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
