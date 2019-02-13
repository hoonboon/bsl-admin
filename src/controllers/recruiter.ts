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

/**
 * GET /recruiters
 * Recruiter listing page.
 */
export let getRecruiters = (req: Request, res: Response, next: NextFunction) => {
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
        url: "/recruiter/1001",
        name: "Recruiter #1",
        nric: "A0000001",
        email: "some1@e.mail",
        mobileNo: "+60122222221",
        billingName: "Company #1"
    });
    item_list.push({
        url: "/recruiter/1002",
        name: "Recruiter #2",
        nric: "A0000002",
        email: "some2@e.mail",
        mobileNo: "+60122222222",
        billingName: "Company #2"
    });
    item_list.push({
        url: "/recruiter/1003",
        name: "Recruiter #3",
        nric: "A0000003",
        email: "some3@e.mail",
        mobileNo: "+60122222223",
        billingName: "Company #3"
    });
    item_list.push({
        url: "/recruiter/1004",
        name: "Recruiter #4",
        nric: "A0000004",
        email: "some4@e.mail",
        mobileNo: "+60122222224",
        billingName: "Company #4"
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
    const includeScripts = ["/js/recruiter/list.js", "/js/util/pagination.js"];

    res.render("recruiter/list", {
        title: "Recruiter",
        title2: "Recruiter List",
        item_list: item_list,
        rowPerPageOptions: rowPerPageOptions,
        pageNoOptions: pageNoOptions,
        pageInfo: pageInfo,
        includeScripts: includeScripts
    });

};

/**
 * GET /recruiter/create
 * Create Recruiter page.
 */
export let getRecruiterCreate = (req: Request, res: Response, next: NextFunction) => {
    // // TODO: for local testing only
    const recruiterInput = {
        url: "/recruiter/1002",
        name: "Recruiter #2",
        nric: "A0000002",
        email: "some2@e.mail",
        mobileNo: "+60122222222",
        nationality: "MY",
        race: "M",
        language: "ms",
        dob: moment("1992-03-15"),
        dobInput: moment("1992-03-15").format("YYYY-MM-DD"),
        gender: "M",
        billingName: "Company #2",
        billingAddress: "ADDR LINE 1"
            + "\r\nADDR LINE 2"
            + "\r\nADDR LINE 3"
            + "\r\n15150 KOTA BHARU"
            + "\r\nKELANTAN"
            + "\r\nMALAYSIA",
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
    sanitizeBody("dob").toDate(),

    // process request
    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);

        req.flash("success", { msg: "New recruiter created: XXXX" });
        return res.redirect("/recruiters");

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

