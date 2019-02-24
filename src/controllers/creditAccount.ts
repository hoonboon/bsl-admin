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
    _id: "4001",
    product: {
        productCode: "T19001",
        productDesc: "TOP-UP 50 CREDITS @ MYR50",
    },
    unitPrice: 50,
    unitCreditValue: 50,
    fixedQty: 1,
}, {
    _id: "4002",
    product: {
        productCode: "T19002",
        productDesc: "TOP-UP 120 CREDITS @ MYR100",
    },
    unitPrice: 100,
    unitCreditValue: 120,
    fixedQty: 1,
}, {
    _id: "4003",
    product: {
        productCode: "T19003",
        productDesc: "TOP-UP 200 CREDITS @ MYR150",
    },
    unitPrice: 150,
    unitCreditValue: 200,
    fixedQty: 1,
}, {
    _id: "4004",
    product: {
        productCode: "T19004",
        productDesc: "TOP-UP 300 CREDITS @ MYR200",
    },
    unitPrice: 200,
    unitCreditValue: 300,
    fixedQty: 1,
}, {
    _id: "4005",
    product: {
        productCode: "C19001",
        productDesc: "SIGN-UP CAMPAIGN 2019 FREE 50 CREDITS"
    },
    unitPrice: 0,
    unitCreditValue: 50,
    fixedQty: 1,
}];

/**
 * GET /creditAccounts
 * Credit Account listing page.
 */
export let getCreditAccounts = (req: Request, res: Response, next: NextFunction) => {
    let newPageNo: number = parseInt(req.query.newPageNo);
    if (!newPageNo) {
        newPageNo = 1; // default
    }

    let rowPerPage: number = parseInt(req.query.rowPerPage);
    if (!rowPerPage) {
        rowPerPage = DEFAULT_ROW_PER_PAGE; // default
    }

    let pageInfo: PageInfo;

    const item_list = [];
    item_list.push({
        _id: "2001",
        url: "/creditAccount/2001",
        recruiterId: "1001",
        recruiter: {
            url: "/recruiter/1001",
            name: "Recruiter #1",
            nric: "A0000001",
            email: "some1@e.mail",
            mobileNo: "+60122222221",
            billingName: "Company #1"
        },
        validDateStartDisplay: moment("2018-10-21").format("YYYY-MM-DD"),
        validDateEndDisplay: moment("2019-10-21").format("YYYY-MM-DD"),
        creditBalance: 0,
        creditLocked: 0,
        get creditAvailable() {
            return this.creditBalance - this.creditLocked;
        },
        lastTrxDate: moment("2018-12-12 22:41:41.445").format("YYYY-MM-DD HH:mm:ss"),
        status: "T",
        get statusDisplay() {
            let result = this.status;
            if (this.status === "A")
                result = "Active";
            else if (this.status === "T")
                result = "Terminated";
            return result;
        },
    });
    item_list.push({
        _id: "2002",
        url: "/creditAccount/2002",
        recruiterId: "1002",
        recruiter: {
            url: "/recruiter/1002",
            name: "Recruiter #2",
            nric: "A0000002",
            email: "some2@e.mail",
            mobileNo: "+60122222222",
            billingName: "Company #2"
        },
        validDateStartDisplay: moment("2019-02-10").format("YYYY-MM-DD"),
        validDateEndDisplay: moment("2020-02-10").format("YYYY-MM-DD"),
        creditBalance: 25,
        creditLocked: 0,
        get creditAvailable() {
            return this.creditBalance - this.creditLocked;
        },
        lastTrxDate: moment("2019-02-12 20:13:51.422").format("YYYY-MM-DD HH:mm:ss"),
        status: "A",
        get statusDisplay() {
            let result = this.status;
            if (this.status === "A")
                result = "Active";
            else if (this.status === "T")
                result = "Terminated";
            return result;
        },
    });
    item_list.push({
        _id: "2003",
        url: "/creditAccount/2003",
        recruiterId: "1003",
        recruiter: {
            url: "/recruiter/1003",
            name: "Recruiter #3",
            nric: "A0000003",
            email: "some3@e.mail",
            mobileNo: "+60122222223",
            billingName: "Company #3"
        },
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
    const includeScripts = ["/js/creditAccount/list.js", "/js/util/pagination.js"];

    res.render("creditAccount/list", {
        title: "Credit Account",
        title2: "Credit Account List",
        item_list: item_list,
        rowPerPageOptions: rowPerPageOptions,
        pageNoOptions: pageNoOptions,
        pageInfo: pageInfo,
        includeScripts: includeScripts
    });

};

/**
 * GET /creditAccount/create
 * Create Recruiter page.
 */
export let getCreditAccountCreate = (req: Request, res: Response, next: NextFunction) => {
    // TODO: for local testing only
    const creditAccountInput = {
        validDateStartInput: moment().format("YYYY-MM-DD"),
        validDateEndInput: moment().add(3, "months").format("YYYY-MM-DD"),
    };

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
    // const jobInput = new JobModel({
    //         publishStart: moment().add(1, "days"),
    //         publishEnd: moment().add(29, "days")
    // });

    const recruiterOptions = [
        { label: "Recruiter #4 (A0000004)", value: "1004" },
    ];

    // client side script
    const includeScripts = ["/js/creditAccount/form.js"];

    res.render("creditAccount/form", {
        title: "Credit Account",
        title2: "Create Credit Account",
        creditAccount: creditAccountInput,
        includeScripts: includeScripts,
        recruiterOptions: recruiterOptions,
    });
};

/**
 * POST /creditAccount/create
 * Create a new Credit Account.
 */
export let postCreditAccountCreate = [
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
    sanitizeBody("validDateStart").toDate(),
    sanitizeBody("validDateEnd").toDate(),

    // process request
    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);

        req.flash("success", { msg: "New Credit Account created: 2004" });
        return res.redirect("/creditAccounts");

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
 * GET /creditAccount/:id
 * View Credit Account Detail page.
 */
export let getCreditAccountDetail = (req: Request, res: Response, next: NextFunction) => {
    const creditAccountDb = {
        _id: "2003",
        url: "/creditAccount/2003",
        recruiterId: "1003",
        recruiter: {
            url: "/recruiter/1003",
            name: "Recruiter #3",
            nric: "A0000003",
            email: "some3@e.mail",
            mobileNo: "+60122222223",
            billingName: "Company #3",
            billingAddress: "ADDR LINE 1"
                + "\r\nADDR LINE 2"
                + "\r\nADDR LINE 3"
                + "\r\n15150 KOTA BHARU"
                + "\r\nKELANTAN"
                + "\r\nMALAYSIA",
        },
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

    const creditTrx_list = [{
        _id: "3004",
        trxDateDisplay: moment("2019-02-14 16:43:55.422").format("YYYY-MM-DD HH:mm:ss"),
        trxType: "U",
        get trxTypeDisplay() {
            let result = this.trxType;
            if (this.trxType === "T") {
                result = "Top-up";
            } else if (this.trxType === "R") {
                result = "Refund";
            } else if (this.trxType === "C") {
                result = "Complimentary";
            } else if (this.trxType === "U") {
                result = "Utilization";
            } else if (this.trxType === "E") {
                result = "Expiry";
            }
            return result;
        },
        currency: "MYR",
        product: {
            productCode: "UJ19002",
            productDesc: "JOB POSTING 15 DAYS",
        },
        totalCredit: -25,
        status: "P",
    }, {
        _id: "3003",
        trxDateDisplay: moment("2019-02-13 17:01:04.065").format("YYYY-MM-DD HH:mm:ss"),
        trxType: "T",
        get trxTypeDisplay() {
            let result = this.trxType;
            if (this.trxType === "T") {
                result = "Top-up";
            } else if (this.trxType === "R") {
                result = "Refund";
            } else if (this.trxType === "C") {
                result = "Complimentary";
            } else if (this.trxType === "U") {
                result = "Utilization";
            } else if (this.trxType === "E") {
                result = "Expiry";
            }
            return result;
        },
        currency: "MYR",
        product: {
            productCode: "T19001",
            productDesc: "TOP-UP 50 CREDITS @ MYR50",
        },
        totalCredit: 50,
        status: "A",
    }, {
        _id: "3002",
        trxDateDisplay: moment("2019-02-13 12:26:34.565").format("YYYY-MM-DD HH:mm:ss"),
        trxType: "U",
        get trxTypeDisplay() {
            let result = this.trxType;
            if (this.trxType === "T") {
                result = "Top-up";
            } else if (this.trxType === "R") {
                result = "Refund";
            } else if (this.trxType === "C") {
                result = "Complimentary";
            } else if (this.trxType === "U") {
                result = "Utilization";
            } else if (this.trxType === "E") {
                result = "Expiry";
            }
            return result;
        },
        currency: "MYR",
        product: {
            productCode: "UJ19001",
            productDesc: "JOB POSTING 30 DAYS",
        },
        totalCredit: -50,
        status: "A",
    }, {
        _id: "3001",
        trxDateDisplay: moment("2019-02-13 09:11:25.465").format("YYYY-MM-DD HH:mm:ss"),
        trxType: "C",
        get trxTypeDisplay() {
            let result = this.trxType;
            if (this.trxType === "T") {
                result = "Top-up";
            } else if (this.trxType === "R") {
                result = "Refund";
            } else if (this.trxType === "C") {
                result = "Complimentary";
            } else if (this.trxType === "U") {
                result = "Utilization";
            } else if (this.trxType === "E") {
                result = "Expiry";
            }
            return result;
        },
        currency: "MYR",
        product: {
            productCode: "C19001",
            productDesc: "SIGN-UP CAMPAIGN 2019 FREE 50 CREDITS",
        },
        totalCredit: 50,
        status: "A",
    }];

    // client side script
    const includeScripts = ["/js/creditAccount/detail.js"];

    res.render("creditAccount/detail", {
        title: "Credit Account",
        title2: "Credit Account Detail",
        creditAccount: creditAccountDb,
        creditAccountId: creditAccountDb._id,
        creditTrx_list: creditTrx_list,
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
 * GET /creditAccount/:id/addCredit
 * Add Credit to Credit Account page.
 */
export let getCreditAccountAddCredit = (req: Request, res: Response, next: NextFunction) => {

    const creditAccountDb = {
        _id: "2003",
        url: "/creditAccount/2003",
        recruiterId: "1003",
        recruiter: {
            url: "/recruiter/1003",
            name: "Recruiter #3",
            nric: "A0000003",
            email: "some3@e.mail",
            mobileNo: "+60122222223",
            billingName: "Company #3",
            billingAddress: "ADDR LINE 1"
                + "\r\nADDR LINE 2"
                + "\r\nADDR LINE 3"
                + "\r\n15150 KOTA BHARU"
                + "\r\nKELANTAN"
                + "\r\nMALAYSIA",
        },
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

    const creditTrxInput = {
        currency: "MYR",
        productPriceId: "4002",
        totalAmount: 100,
        totalCredit: 120,
        paymentReference: "Cash Receipt No.: 2213",
    };

    // client side script
    const includeScripts = ["/js/creditAccount/formAddCredit.js"];

    res.render("creditAccount/formAddCredit", {
        title: "Credit Account",
        title2: "Add Credit",
        creditAccount: creditAccountDb,
        creditAccountId: creditAccountDb._id,
        creditTrx: creditTrxInput,
        productPrice_list: productPriceList,
        includeScripts: includeScripts,
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
 * POST /creditAccount/:id/addCredit
 * Commit Add Credit to Credit Account.
 */
export let postCreditAccountAddCredit = [
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

        req.flash("success", { msg: "Transaction successfully updated." });
        return res.redirect("/creditAccount/2003?bu=" + req.body.bu);

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
 * POST /recruiter/:id/terminate
 * Terminate an existing Recruiter.
 */
export let postRecruiterTerminate = [
    // validate values
    body("id").isLength({ min: 1 }).trim().withMessage("Recruiter ID is required."),

    // process request
    (req: Request, res: Response, next: NextFunction) => {

        req.flash("success", { msg: "Recruiter successfully terminated." });
        const bu = backUrl.decodeBackUrl(req.body.bu);
        if (bu) {
            return res.redirect(bu);
        } else {
            return res.redirect("/recruiters");
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