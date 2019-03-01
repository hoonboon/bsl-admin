import async from "async";
import moment from "moment";
import { Request, Response, NextFunction } from "express";

import { body, validationResult } from "express-validator/check";
import { sanitizeBody } from "express-validator/filter";

import { default as JobModel, IJob, POSTTYPE_FB, POSTTYPE_NORMAL, Location } from "../models/Job";


import { PageInfo, getNewPageInfo } from "../util/pagination";
import * as selectOption from "../util/selectOption";
import * as backUrl from "../util/backUrl";
import logger from "../util/logger";

const DEFAULT_ROW_PER_PAGE: number = 10;

const productPriceList = [{
    _id: "4101",
    product: {
        productCode: "P19001",
        productDesc: "PUBLISH 15 DAYS @ 25 CREDITS",
    },
    unitCreditValue: 25,
    postingDays: 15,
    fixedQty: 1,
}, {
    _id: "4102",
    product: {
        productCode: "P19002",
        productDesc: "PUBLISH 30 DAYS @ 50 CREDITS",
    },
    unitCreditValue: 50,
    postingDays: 30,
    fixedQty: 1,
}, {
    _id: "4103",
    product: {
        productCode: "P19003",
        productDesc: "PUBLISH 45 DAYS @ 70 CREDITS",
    },
    unitCreditValue: 70,
    postingDays: 45,
    fixedQty: 1,
}, {
    _id: "4104",
    product: {
        productCode: "P19004",
        productDesc: "PUBLISH 60 DAYS @ 90 CREDITS",
    },
    unitCreditValue: 90,
    postingDays: 60,
    fixedQty: 1,
}];

/**
 * GET /offlineJobs
 * Offline Job listing page.
 */
export let getJobs = (req: Request, res: Response, next: NextFunction) => {
    let newPageNo: number = parseInt(req.query.newPageNo);
    if (!newPageNo) {
        newPageNo = 1; // default
    }

    let rowPerPage: number = parseInt(req.query.rowPerPage);
    if (!rowPerPage) {
        rowPerPage = DEFAULT_ROW_PER_PAGE; // default
    }

    let pageInfo: PageInfo;

    const recruiterSet = [
        { value: "1001", label: "Recruiter #1 - A0000001"},
        { value: "1002", label: "Recruiter #2 - A0000002"},
        { value: "1003", label: "Recruiter #3 - A0000003"},
        { value: "1004", label: "Recruiter #4 - A0000004"},
    ];

    let recruiterId = req.query.recruiterId;
    if (!recruiterId)
        recruiterId = recruiterSet[2].value;

    const recruiter = recruiterSet.find(function(elem) {
        return elem.value === recruiterId;
    });

    const recruiterLabel = recruiter.label;

    const item_list = [];
    item_list.push({
        url: "/offlineJob/5002",
        recruiter: {
            name: "Recruiter #3",
            nric: "A0000003",
        },
        job: {
            title: "Some Offline Job 2",
            description: "Some Job Description 2",
            employerName: "Some Employer 2",
            applyMethod: "Whatsapp/ SMS 012-3456789",
            salary: "Min MYR800.00/bulan +EPF+SOCSO",
            location: [{ code: "03-02", area: "Pasir Pekan, Wakaf Bahru" }],
            closing: "SEGERA",
            publishStartDisplay: moment("2019-02-16").format("YYYY-MM-DD"),
            get publishEndDisplay() {
                return moment(this.publishStartDisplay, "YYYY-MM-DD").add(15 - 1, "days").format("YYYY-MM-DD");
            },
        },
        status: "P",
        get statusDisplay() {
            let result = this.status;
            if (this.status === "P")
                result = "Pending";
            else if (this.status === "B")
                result = "Published";
            return result;
        },
    });
    item_list.push({
        url: "/offlineJob/5001",
        recruiter: {
            name: "Recruiter #3",
            nric: "A0000003",
        },
        job: {
            title: "Some Offline Job 1",
            description: "Some Job Description 1",
            employerName: "Some Employer 1",
            applyMethod: "Whatsapp/ SMS 012-3456789",
            salary: "Min MYR800.00/bulan +EPF+SOCSO",
            location: [{ code: "03-02", area: "Pasir Pekan, Wakaf Bahru" }],
            closing: "SEGERA",
            publishStartDisplay: moment("2019-02-15").format("YYYY-MM-DD"),
            get publishEndDisplay() {
                return moment(this.publishStartDisplay, "YYYY-MM-DD").add(30 - 1, "days").format("YYYY-MM-DD");
            },
        },
        status: "B",
        get statusDisplay() {
            let result = this.status;
            if (this.status === "P")
                result = "Pending";
            else if (this.status === "B")
                result = "Published";
            return result;
        },
    });

    pageInfo = getNewPageInfo(item_list.length, rowPerPage, newPageNo);

    let rowPerPageOptions, pageNoOptions;
    if (pageInfo) {
        rowPerPageOptions = selectOption.OPTIONS_ROW_PER_PAGE();
        selectOption.markSelectedOption(rowPerPage.toString(), rowPerPageOptions);

        pageNoOptions = selectOption.OPTIONS_PAGE_NO(pageInfo.totalPageNo);
        selectOption.markSelectedOption(pageInfo.curPageNo.toString(), pageNoOptions);
    }

    // client side script
    const includeScripts = ["/js/offlineJob/list.js", "/js/util/pagination.js", "/js/lib/typeahead.bundle.js"];

    res.render("offlineJob/list", {
        title: "Recruiter",
        title2: "Offline Job List",
        item_list: item_list,
        recruiterSet: recruiterSet,
        recruiterId: recruiterId,
        recruiterLabel: recruiterLabel,
        rowPerPageOptions: rowPerPageOptions,
        pageNoOptions: pageNoOptions,
        pageInfo: pageInfo,
        includeScripts: includeScripts
    });

};

/**
 * GET /offlineJob/create
 * Create Offline Job page.
 */
export let getJobCreate = (req: Request, res: Response, next: NextFunction) => {
    const recruiterId = req.query.recruiterId;

    // TODO: for local testing only
    const recruiter = {
        name: "Recruiter #3",
        nric: "A0000003",
    };

    const creditAccount = {
        validDateStartDisplay: moment("2019-02-13").format("YYYY-MM-DD"),
        validDateEndDisplay: moment("2020-02-13").format("YYYY-MM-DD"),
        creditBalance: 50,
        creditLocked: 25,
        get creditAvailable() {
            return this.creditBalance - this.creditLocked;
        },
        lastTrxDate: moment("2019-02-14 16:43:55.422").format("YYYY-MM-DD HH:mm:ss"),
        status: "A",
        get statusDisplay() {
            let result = this.status;
            if (this.status === "A")
                result = "Active";
            else if (this.status === "T")
                result = "Terminated";
            return result;
        },
    };

    const jobInput = {
        productPriceId: "4102",
        title: "Some Offline Job 3",
        description: "Some Offline Job Description 3",
        employerName: "Some Employer",
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

    // set default values
    // const jobInput = new JobModel({
    //         publishStart: moment().add(1, "days"),
    //         publishEnd: moment().add(29, "days")
    // });

    const locationOptions = selectOption.OPTIONS_LOCATION();
    selectOption.markSelectedOptions([jobInput.location[0].code], locationOptions);

    // client side script
    const includeScripts = ["/ckeditor/ckeditor.js", "/js/lib/moment.min.js", "/js/offlineJob/form.js"];

    res.render("offlineJob/form", {
        title: "Recruiter",
        title2: "Create Offline Job",
        recruiterId: recruiterId,
        recruiter: recruiter,
        creditAccount: creditAccount,
        job: jobInput,
        includeScripts: includeScripts,
        locationOptions: locationOptions,
        productPrice_list: productPriceList,
        productPriceSet: productPriceList,
    });
};

/**
 * POST /offlineJob/create
 * Create a new Offline Job.
 */
export let postJobCreate = [
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
    // body("title").isLength({ min: 1 }).trim().withMessage("Post Title is required."),
    // body("employerName").isLength({ min: 1 }).trim().withMessage("Employer Name is required."),
    // body("applyMethod").isLength({ min: 1 }).trim().withMessage("Apply Method is required."),

    // // TODO: must be >= today
    // body("publishStart").isLength({ min: 1 }).trim().withMessage("Publish Date Start is required.")
    // .isISO8601().withMessage("Publish Date Start is invalid."),

    // body("publishEnd").isLength({ min: 1 }).trim().withMessage("Publish Date End is required.")
    // .isISO8601().withMessage("Publish Date End is invalid."),

    // // TODO: publish start <= publish end

    // body("closing").isLength({ min: 1 }).trim().withMessage("Closing is required."),

    // sanitize values
    sanitizeBody("*").trim().escape(),
    // sanitizeBody("dob").toDate(),

    // process request
    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);

        const recruiterId = req.body.recruiterId;

        req.flash("success", { msg: "New job posting created.<br>Please review before proceed to Publish the post." });
        return res.redirect("/offlineJobs?recruiterId=" + recruiterId);

        // const jobInput = new JobModel({
        //     title: req.body.title,
        //     description: req.body.description,
        //     employerName: req.body.employerName,
        //     applyMethod: req.body.applyMethod,
        //     salary: req.body.salary,
        //     location: location,
        //     closing: req.body.closing,
        //     publishStart: req.body.publishStart,
        //     publishEnd: req.body.publishEnd,
        //     // weight: number,
        //     // tag: string[],
        //     customContent: req.body.customContent,
        //     imgUrl: req.body.imgUrl,
        //     postType: POSTTYPE_NORMAL,
        //     status: "A",
        //     createdBy: req.user.id
        // });

        // if (errors.isEmpty()) {
        //     jobInput.save((err, jobCreated) => {
        //         if (err) { return next(err); }
        //         req.flash("success", { msg: "New job created: " + jobCreated._id });
        //         return res.redirect("/jobs");
        //     });
        // } else {
        //     req.flash("errors", errors.array());

        //     const locationOptions = selectOption.OPTIONS_LOCATION();
        //     selectOption.markSelectedOptions(req.body.location, locationOptions);

        //     // client side script
        //     const includeScripts = ["/ckeditor/ckeditor.js", "/js/job/form.js"];

        //     res.render("job/form", {
        //         title: "Job",
        //         title2: "Create Job",
        //         job: jobInput,
        //         includeScripts: includeScripts,
        //         locationOptions: locationOptions
        //     });
        // }
    }
];

/**
 * GET /offlineJob/:id
 * View Offline Job Detail page.
 */
export let getJobDetail = (req: Request, res: Response, next: NextFunction) => {

    // TODO: for local testing only
    const recruiter = {
        _id: "1003",
        name: "Recruiter #3",
        nric: "A0000003",
    };

    const recruiterId = recruiter._id;

    const productPrice = {
        _id: "4101",
        product: {
            productCode: "P19001",
            productDesc: "PUBLISH 15 DAYS @ 25 CREDITS",
        },
        unitCreditValue: 25,
        postingDays: 15,
        fixedQty: 1,
    };

    const jobDb = {
        _id: "5002",
        url: "/offlineJob/5002",
        title: "Some Offline Job 2",
        description: "Some Job Description 2",
        employerName: "Some Employer 2",
        applyMethod: "Whatsapp/ SMS 012-3456789",
        salary: "Min MYR800.00/bulan +EPF+SOCSO",
        location: [{ code: "03-02", area: "Pasir Pekan, Wakaf Bahru" }],
        closing: "SEGERA",
        publishStartDisplay: moment("2019-02-16").format("YYYY-MM-DD"),
        get publishEndDisplay() {
            return moment(this.publishStartDisplay, "YYYY-MM-DD").add(15 - 1, "days").format("YYYY-MM-DD");
        },
        // weight: number,
        // tag: string[],
        // customContent: string,

        status: "P",
        get statusDisplay() {
            let result = this.status;
            if (this.status === "P")
                result = "Pending";
            else if (this.status === "B")
                result = "Published";
            return result;
        },

        get locationDisplay() {
            let result = "-";
            if (this.location && this.location.length > 0) {
                const labels: string[] = [];
                if (selectOption.OPTIONS_LOCATION()) {
                    this.location.forEach((location: Location) => {
                        const label = selectOption.getLabelByValue(location.code, selectOption.OPTIONS_LOCATION());
                        if (label) {
                            if (location.area) {
                                labels.push(`${label} (${location.area})`);
                            } else {
                                labels.push(label);
                            }
                        }
                    });
                }
                if (labels) {
                    labels.forEach((label, i) => {
                        if (i == 0)
                            result = label;
                        else
                            result += " | " + label;
                    });
                }
            }
            return result;
        },

        get descriptionDisplay() {
            return this.description ? this.description.replace(/\n/g, "<br/>") : "";
        },

        get applyMethodDisplay() {
            return this.applyMethod ? this.applyMethod.replace(/\n/g, "<br/>") : "";
        },

    };

    // client side script
    const includeScripts = ["/ckeditor/ckeditor.js", "/js/offlineJob/detail.js"];

    res.render("offlineJob/detail", {
        title: "Recruiter",
        title2: "Offline Job Detail",
        recruiterId: recruiterId,
        recruiter: recruiter,
        productPrice: productPrice,
        jobId: jobDb._id,
        job: jobDb,
        productPrice_list: productPriceList,
        includeScripts: includeScripts,
        bu: req.query.bu,
    });

    // JobModel.findById(req.params.id)
    // .exec((err, jobDb) => {
    //     if (err) { return next(err); }
    //     if (jobDb) {
    //         // client side script
    //         const includeScripts = ["/js/recruiter/detail.js"];

    //         res.render("recruiter/detail", {
    //             title: "Recruiter",
    //             title2: "Recruiter Detail",
    //             job: jobDb,
    //             jobId: jobDb._id,
    //             includeScripts: includeScripts,
    //             bu: req.query.bu,
    //         });
    //     } else {
    //         req.flash("errors", { msg: "Job not found." });
    //         const bu = backUrl.decodeBackUrl(req.query.bu);
    //         if (bu) {
    //             return res.redirect(bu);
    //         } else {
    //             return res.redirect("/recruiters");
    //         }
    //     }
    // });
};

/**
 * GET /offlineJob/:id/update
 * Update Recruiter page.
 */
export let getJobUpdate = (req: Request, res: Response, next: NextFunction) => {

    // TODO: for local testing only
    const recruiter = {
        _id: "1003",
        name: "Recruiter #3",
        nric: "A0000003",
    };

    const recruiterId = recruiter._id;

    const creditAccount = {
        validDateStartDisplay: moment("2019-02-13").format("YYYY-MM-DD"),
        validDateEndDisplay: moment("2020-02-13").format("YYYY-MM-DD"),
        creditBalance: 50,
        creditLocked: 25,
        get creditAvailable() {
            return this.creditBalance - this.creditLocked;
        },
        lastTrxDate: moment("2019-02-14 16:43:55.422").format("YYYY-MM-DD HH:mm:ss"),
        status: "A",
        get statusDisplay() {
            let result = this.status;
            if (this.status === "A")
                result = "Active";
            else if (this.status === "T")
                result = "Terminated";
            return result;
        },
    };

    const jobInput = {
        productPriceId: "4101",
        _id: "5002",
        url: "/offlineJob/5002",
        title: "Some Offline Job 2",
        description: "Some Job Description 2",
        employerName: "Some Employer 2",
        applyMethod: "Whatsapp/ SMS 012-3456789",
        salary: "Min MYR800.00/bulan +EPF+SOCSO",
        location: [{ code: "03-02", area: "Pasir Pekan, Wakaf Bahru" }],
        closing: "SEGERA",
        publishStartInput: moment("2019-02-16").format("YYYY-MM-DD"),
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

    // set default values
    // const jobInput = new JobModel({
    //         publishStart: moment().add(1, "days"),
    //         publishEnd: moment().add(29, "days")
    // });

    const locationOptions = selectOption.OPTIONS_LOCATION();
    selectOption.markSelectedOptions([jobInput.location[0].code], locationOptions);

    // client side script
    const includeScripts = ["/ckeditor/ckeditor.js", "/js/lib/moment.min.js", "/js/offlineJob/form.js"];

    res.render("offlineJob/form", {
        title: "Recruiter",
        title2: "Edit Offline Job",
        recruiterId: recruiterId,
        recruiter: recruiter,
        creditAccount: creditAccount,
        job: jobInput,
        includeScripts: includeScripts,
        locationOptions: locationOptions,
        productPrice_list: productPriceList,
        productPriceSet: productPriceList,
        bu: req.query.bu,
    });

    // async.parallel({
    //     job: function(callback) {
    //         JobModel.findById(req.params.id)
    //             .exec(callback);
    //     }
    // }, function(err, results) {
    //     if (err) { return next(err); }

    //     if (!results.job) {
    //         req.flash("errors", { msg: "Job not found." });
    //         const bu = backUrl.decodeBackUrl(req.query.bu);
    //         if (bu) {
    //             return res.redirect(bu);
    //         } else {
    //             return res.redirect("/jobs");
    //         }
    //     }

    //     const jobDb = results.job as IJob;

    //     const locationOptions = selectOption.OPTIONS_LOCATION();
    //     selectOption.markSelectedOptions(jobDb.locationCodes, locationOptions);

    //     // client side script
    //     const includeScripts = ["/ckeditor/ckeditor.js", "/js/job/form.js"];

    //     res.render("job/form", {
    //         title: "Job",
    //         title2: "Edit Job Detail",
    //         job: jobDb,
    //         jobId: jobDb._id,
    //         includeScripts: includeScripts,
    //         locationOptions: locationOptions,
    //         bu: req.query.bu,
    //     });

    // });
};

/**
 * POST /offlineJob/:id/update
 * Update an existing Job.
 */
export let postJobUpdate = [
    // // convert multiple selection input into array
    // (req: Request, res: Response, next: NextFunction) => {
    //     if (!(req.body.location instanceof Array)) {
    //         if (typeof req.body.location === "undefined") {
    //             req.body.location = [];
    //         }
    //         else {
    //             req.body.location = new Array(req.body.location);
    //         }
    //     }
    //     next();
    // },

    // // validate values
    // body("title").isLength({ min: 1 }).trim().withMessage("Post Title is required."),
    // body("employerName").isLength({ min: 1 }).trim().withMessage("Employer Name is required."),
    // body("applyMethod").isLength({ min: 1 }).trim().withMessage("Apply Method is required."),

    // // TODO: must be >= today
    // body("publishStart").isLength({ min: 1 }).trim().withMessage("Publish Date Start is required.")
    // .isISO8601().withMessage("Publish Date Start is invalid."),

    // body("publishEnd").isLength({ min: 1 }).trim().withMessage("Publish Date End is required.")
    // .isISO8601().withMessage("Publish Date End is invalid."),

    // // TODO: publish start <= publish end

    // body("closing").isLength({ min: 1 }).trim().withMessage("Closing is required."),

    // // sanitize values
    // sanitizeBody("*").trim().escape(),
    // sanitizeBody("bu").trim().unescape(),
    // sanitizeBody("publishStart").toDate(),
    // sanitizeBody("publishEnd").toDate(),

    // process request
    (req: Request, res: Response, next: NextFunction) => {

        req.flash("success", { msg: "Offline Job successfully updated." });
        return res.redirect("/offlineJob/5002?bu=" + req.body.bu);

        // const errors = validationResult(req);

        // const location = composeLocationFromRequest(req);

        // const jobInput = new JobModel({
        //     title: req.body.title,
        //     description: req.body.description,
        //     employerName: req.body.employerName,
        //     applyMethod: req.body.applyMethod,
        //     salary: req.body.salary,
        //     location: location,
        //     closing: req.body.closing,
        //     publishStart: req.body.publishStart,
        //     publishEnd: req.body.publishEnd,
        //     // weight: number,
        //     // tag: string[],
        //     customContent: req.body.customContent,
        //     imgUrl: req.body.imgUrl,
        //     postType: POSTTYPE_NORMAL,
        //     _id: req.params.id,
        //     updatedBy: req.user.id
        // });

        // if (errors.isEmpty()) {
        //     JobModel.findById(req.params.id, (err, targetJob) => {
        //         if (err) { return next(err); }

        //         if (!targetJob) {
        //             req.flash("errors", { msg: "Job not found." });
        //             const bu = backUrl.decodeBackUrl(req.body.bu);
        //             if (bu) {
        //                 return res.redirect(bu);
        //             } else {
        //                 return res.redirect("/jobs");
        //             }
        //         }

        //         JobModel.findByIdAndUpdate(req.params.id, jobInput, (err, jobUpdated: IJob) => {
        //             if (err) { return next(err); }
        //             req.flash("success", { msg: "Job successfully updated." });
        //             return res.redirect(jobUpdated.url + "?bu=" + req.body.bu);
        //         });
        //     });
        // } else {
        //     req.flash("errors", errors.array());

        //     const locationOptions = selectOption.OPTIONS_LOCATION();
        //     selectOption.markSelectedOptions(req.body.location, locationOptions);

        //     // client side script
        //     const includeScripts = ["/ckeditor/ckeditor.js", "/js/job/form.js"];

        //     res.render("job/form", {
        //         title: "Job",
        //         title2: "Edit Job Detail",
        //         job: jobInput,
        //         jobId: jobInput._id,
        //         includeScripts: includeScripts,
        //         locationOptions: locationOptions,
        //         bu: req.body.bu,
        //     });
        // }
    }
];

/**
 * POST /offlineJob/:id/publish
 * Publish an existing Offline Job.
 */
export let postJobPublish = [
    // validate values
    body("id").isLength({ min: 1 }).trim().withMessage("Offline Job ID is required."),

    // process request
    (req: Request, res: Response, next: NextFunction) => {

        req.flash("success", { msg: "Offline Job successfully Published." });
        const bu = backUrl.decodeBackUrl(req.body.bu);
        if (bu) {
            return res.redirect(bu);
        } else {
            return res.redirect("/offlineJobs");
        }

        // const errors = validationResult(req);

        // const jobInput = new JobModel({
        //     _id: req.params.id,
        //     status: "D",
        //     updatedBy: req.user.id
        // });

        // if (errors.isEmpty()) {
        //     JobModel.findById(req.params.id, (err, targetJob) => {
        //         if (err) { return next(err); }

        //         if (!targetJob) {
        //             req.flash("errors", { msg: "Job not found." });
        //             const bu = backUrl.decodeBackUrl(req.body.bu);
        //             if (bu) {
        //                 return res.redirect(bu);
        //             } else {
        //                 return res.redirect("/jobs");
        //             }
        //         }

        //         JobModel.findByIdAndUpdate(req.params.id, jobInput, (err, jobUpdated: IJob) => {
        //             if (err) { return next(err); }
        //             req.flash("success", { msg: "Job successfully deleted." });
        //             const bu = backUrl.decodeBackUrl(req.body.bu);
        //             if (bu) {
        //                 return res.redirect(bu);
        //             } else {
        //                 return res.redirect("/jobs");
        //             }
        //         });
        //     });
        // } else {
        //     req.flash("errors", errors.array());
        //     const bu = backUrl.decodeBackUrl(req.body.bu);
        //     if (bu) {
        //         return res.redirect(bu);
        //     } else {
        //         return res.redirect("/jobs");
        //     }
        // }
    }
];

/**
 * POST /offlineJob/:id/delete
 * Delete an existing Offline Job.
 */
export let postJobDelete = [
    // validate values
    body("id").isLength({ min: 1 }).trim().withMessage("Offline Job ID is required."),

    // process request
    (req: Request, res: Response, next: NextFunction) => {

        req.flash("success", { msg: "Offline Job successfully Deleted." });
        const bu = backUrl.decodeBackUrl(req.body.bu);
        if (bu) {
            return res.redirect(bu);
        } else {
            return res.redirect("/offlineJobs");
        }

        // const errors = validationResult(req);

        // const jobInput = new JobModel({
        //     _id: req.params.id,
        //     status: "D",
        //     updatedBy: req.user.id
        // });

        // if (errors.isEmpty()) {
        //     JobModel.findById(req.params.id, (err, targetJob) => {
        //         if (err) { return next(err); }

        //         if (!targetJob) {
        //             req.flash("errors", { msg: "Job not found." });
        //             const bu = backUrl.decodeBackUrl(req.body.bu);
        //             if (bu) {
        //                 return res.redirect(bu);
        //             } else {
        //                 return res.redirect("/jobs");
        //             }
        //         }

        //         JobModel.findByIdAndUpdate(req.params.id, jobInput, (err, jobUpdated: IJob) => {
        //             if (err) { return next(err); }
        //             req.flash("success", { msg: "Job successfully deleted." });
        //             const bu = backUrl.decodeBackUrl(req.body.bu);
        //             if (bu) {
        //                 return res.redirect(bu);
        //             } else {
        //                 return res.redirect("/jobs");
        //             }
        //         });
        //     });
        // } else {
        //     req.flash("errors", errors.array());
        //     const bu = backUrl.decodeBackUrl(req.body.bu);
        //     if (bu) {
        //         return res.redirect(bu);
        //     } else {
        //         return res.redirect("/jobs");
        //     }
        // }
    }
];