import moment from "moment";
import mongoose from "mongoose";
import { Request, Response, NextFunction } from "express";

import { body, validationResult } from "express-validator/check";
import { sanitizeBody } from "express-validator/filter";

import { default as JobModel, POSTTYPE_NORMAL, Location } from "../models/Job";

import { Logger } from "../util/logger";
import { PageInfo, getNewPageInfo } from "../util/pagination";
import * as selectOption from "../util/selectOption";
import * as backUrl from "../util/backUrl";
import RecruiterModel, { STATUS_TERMINATED } from "../models/Recruiter";
import OfflineJobModel, { STATUS_ACTIVE, PUBIND_NEW, STATUS_PENDING, PUBIND_UNPUBLISHED, STATUS_DELETED, PUBIND_PUBLISHED, PUBIND_REPUBLISHED } from "../models/OfflineJob";
import ProductPriceModel, { IProductPrice } from "../models/ProductPrice";
import ProductModel, { PRODTYPE_CREDIT_UTILIZATION } from "../models/Product";
import CreditTrxModel, { TRXTYPE_CREDIT_UTILIZATION, TRXTYPE_CREDIT_TOPUP, TRXTYPE_COMPLIMENTARY_CREDIT } from "../models/CreditTrx";
import EmployerModel, { getEmployerOptions } from "../models/Employer";
import { composeLocationFromRequest } from "./adminJob";
import CreditAccountModel from "../models/CreditAccount";
import PublishedJobModel, { WEIGHT_HIGH } from "../models/PublishedJob";

const logger = new Logger("controllers.offlineJob");

const DEFAULT_ROW_PER_PAGE: number = 10;

/**
 * GET /offlineJobs
 * Offline Job listing page.
 */
export let getJobs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const recruiterId = req.query.recruiterId;
        let recruiterDisplay: string;

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

            const query = OfflineJobModel.find();

            // filter records
            query.where("recruiter").equals(recruiterId);

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

            recordCount = await query.countDocuments();
            if (recordCount > 0) {
                pageInfo = getNewPageInfo(recordCount, rowPerPage, newPageNo);

                query.find().populate("job", "_id closing");
                query.skip(pageInfo.rowNoStart - 1);
                query.limit(rowPerPage);
                query.sort([["publishStart", "descending"], ["createdAt", "descending"]]);

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
        const includeScripts = ["/js/offlineJob/list.js", "/js/util/pagination.js", "/js/lib/typeahead.bundle.js"];

        res.render("offlineJob/list", {
            title: "Recruiter",
            title2: "Offline Job List",
            item_list: item_list,
            rowPerPageOptions: rowPerPageOptions,
            pageNoOptions: pageNoOptions,
            pageInfo: pageInfo,
            includeScripts: includeScripts,
            recruiterId: recruiterId,
            recruiterDisplay: recruiterDisplay,
            searchPublishStartFrom: searchPublishStartFrom,
            searchPublishStartTo: searchPublishStartTo,
            searchTitle: searchTitle,
            searchEmployerName: searchEmployerName,
        });

    } catch (err) {
        logger.error((<Error>err).stack);
        req.flash("errors", { msg: "Unexpected error. Please try again later. Contact Support Team if the problem persists." });
        res.redirect("/");
    }
};

/**
 * Get effective product price of productType = CREDIT_UTILIZATION
 * - Each unique productCode will appear only once.
 * - If more than 1 productPrice are in effect, only the lowest unitCreditValue will be selected.
 */
async function getPostingCostOptions() {
    const results: IProductPrice[] = [];
    const resultsMap: Map<string, IProductPrice> = new Map<string, IProductPrice>();

    // get published productId list
    const productIds = await ProductModel.find({
        productType: { $in: [PRODTYPE_CREDIT_UTILIZATION] },
        publishInd: "Y",
        status: "A",
    }, "_id");

    // get all effective product price of productId list
    if (productIds && productIds.length > 0) {
        const currentDate = moment().format("YYYY-MM-DD");

        const productPrices = await ProductPriceModel.find({
            product: { $in: productIds  },
            effectiveDateStart: { $lte: currentDate },
            effectiveDateEnd: { $gte: currentDate },
            publishInd: "Y",
        })
        .populate("product", "productCode productDesc")
        .select("_id product unitCreditValue postingDays")
        .sort({ unitPrice: 1, product: 1 });

        // retain only 1 price for each productId
        if (productPrices && productPrices.length > 0) {
            for (const item of productPrices) {
                const mapItem = resultsMap.get(item.product.productCode as string);
                if (mapItem) {
                    // retain only the lowest unitCreditValue item
                    if (mapItem.unitCreditValue > item.unitCreditValue) {
                        resultsMap.set(item.product.productCode as string, item);
                    }
                } else {
                    resultsMap.set(item.product.productCode as string, item);
                }
            }
        }
    }

    /** JSON.stringify does not recognize Map class .. hence always return {} */
    // convert Map into regular array as results
    if (resultsMap.size > 0) {
        resultsMap.forEach((value, key, map) => {
            results.push(value);
        });
    }

    return results;
}

/**
 * GET /offlineJob/create
 * Create Offline Job page.
 */
export let getJobCreate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const recruiterId = req.query.recruiterId;
        if (!recruiterId) {
            const error = new Error(`Recruiter Id is null`);
            throw error;
        }
        const recruiterDb = await RecruiterModel.findById(recruiterId).populate("creditAccount");
        if (!recruiterDb) {
            const error = new Error(`Recruiter not found for _id=${recruiterId}`);
            throw error;
        }
        const creditAccountDb = recruiterDb.creditAccount;
        if (!creditAccountDb || !creditAccountDb._id) {
            const error = new Error(`Credit Account not found for recruiterId=${recruiterId}`);
            throw error;
        }

        const productPriceList = await getPostingCostOptions();
        if (!productPriceList) {
            const error = new Error(`No valid Publish Options available.`);
            throw error;
        }

        // TODO: for local testing only
        const productPriceDb = productPriceList[1];
        const jobInput = {
            employer: "",
            title: "Some Offline Job 3",
            description: "Some Offline Job Description 3",
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

        const employerOptions =  await getEmployerOptions(recruiterDb._id);
        selectOption.markSelectedOptions([jobInput.employer], employerOptions);

        // client side script
        const includeScripts = ["/ckeditor/ckeditor.js", "/js/lib/moment.min.js", "/js/offlineJob/form.js"];

        res.render("offlineJob/form", {
            title: "Recruiter",
            title2: "Create Offline Job",
            recruiterId: recruiterId,
            recruiter: recruiterDb,
            creditAccount: creditAccountDb,
            job: jobInput,
            includeScripts: includeScripts,
            locationOptions: locationOptions,
            employerOptions: employerOptions,
            productPrice_list: productPriceList,
            productPriceId: productPriceDb._id,
            bu: req.query.bu,
        });

    } catch (err) {
        logger.error((<Error>err).stack);
        req.flash("errors", { msg: "Unexpected error. Please try again later. Contact Support Team if the problem persists." });
        res.redirect("/offlineJobs");
    }
};

/**
 * POST /offlineJob/create
 * Create a new Offline Job.
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
    body("employer").isLength({ min: 1 }).trim().withMessage("Employer is required."),
    body("applyMethod").isLength({ min: 1 }).trim().withMessage("Apply Method is required."),
    body("productPriceId").isLength({ min: 1 }).trim().withMessage("Publish Option is required."),

    // must be > today
    body("publishStart").isLength({ min: 1 }).trim().withMessage("Publish Date Start is required.")
    .isISO8601().withMessage("Publish Date Start is invalid.")
    .isAfter(moment().format("YYYY-MM-DD")).withMessage("Publish Date Start must be from tomorrow onwards."),

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

            const recruiterId = req.body.recruiterId;
            const recruiterDb = await RecruiterModel.findById(recruiterId).populate("creditAccount");
            if (!recruiterDb) {
                const error = new Error(`Recruiter not found for _id=${recruiterId}`);
                throw error;
            }
            if (recruiterDb.status == STATUS_TERMINATED) {
                const error = new Error(`Recruiter already Terminated for _id=${recruiterId}`);
                throw error;
            }

            const creditAccountDb = recruiterDb.creditAccount;
            if (!creditAccountDb || !creditAccountDb._id) {
                const error = new Error(`CreditAccount not available for recruiterId=${recruiterId}`);
                throw error;
            }

            const productPriceDb = await ProductPriceModel.findById(req.body.productPriceId).populate("product");
            if (!productPriceDb) {
                const error = new Error(`Product Price not found for _id=${req.body.productPriceId}`);
                throw error;
            }

            let trxType: string;
            if (productPriceDb.product.productType == PRODTYPE_CREDIT_UTILIZATION) {
                trxType = TRXTYPE_CREDIT_UTILIZATION;
            } else {
                const error = new Error(`Unexpected productType=${productPriceDb.product.productType}`);
                throw error;
            }

            const employerDb = await EmployerModel.findById(req.body.employer);
            if (!employerDb) {
                const error = new Error(`Employer not found for _id=${req.body.employer}`);
                throw error;
            }

            const location = composeLocationFromRequest(req);

            const jobInput = new JobModel({
                title: req.body.title,
                description: req.body.description,
                employerName: employerDb.name,
                employer: req.body.employer,
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
                const jobCreated = await jobInput.save(opts);

                // create offlineJob
                const offlineJobInput = new OfflineJobModel({
                    title: jobCreated.title,
                    employerName: employerDb.name,
                    publishStart: jobCreated.publishStart,
                    publishEnd: jobCreated.publishEnd,
                    job: jobCreated._id,
                    recruiter: recruiterDb._id,
                    productPrice: productPriceDb._id,
                    publishInd: PUBIND_NEW,
                    status: STATUS_PENDING,
                    createdBy: jobCreated.createdBy,
                });

                const offlineJobCreated = await offlineJobInput.save(opts);

                // only commmit data changes in this block
                await mongodbSession.commitTransaction();
                mongodbSession.endSession();

                req.flash("success", { msg: "New offline job created: " + offlineJobCreated._id });
                return res.redirect(`/offlineJobs?recruiterId=${recruiterId}`);

            } else {
                req.flash("errors", errors.array());
            }

            const productPriceList = await getPostingCostOptions();
            if (!productPriceList) {
                const error = new Error(`No valid Publish Options available.`);
                throw error;
            }

            const locationOptions = selectOption.OPTIONS_LOCATION();
            selectOption.markSelectedOptions(req.body.location, locationOptions);

            const employerOptions =  await getEmployerOptions(recruiterDb._id);
            selectOption.markSelectedOption(jobInput.employer.toString(), employerOptions);

            // client side script
            const includeScripts = ["/ckeditor/ckeditor.js", "/js/lib/moment.min.js", "/js/offlineJob/form.js"];

            res.render("offlineJob/form", {
                title: "Recruiter",
                title2: "Create Offline Job",
                recruiterId: recruiterId,
                recruiter: recruiterDb,
                creditAccount: creditAccountDb,
                job: jobInput,
                includeScripts: includeScripts,
                locationOptions: locationOptions,
                employerOptions: employerOptions,
                productPrice_list: productPriceList,
                productPriceId: req.body.productPriceId,
                bu: req.query.bu,
            });

            // default transaction handling: rollback
            await mongodbSession.abortTransaction();
            mongodbSession.endSession();

        } catch (err) {
            logger.error((<Error>err).stack);

            await mongodbSession.abortTransaction();
            mongodbSession.endSession();

            req.flash("errors", { msg: "Unexpected error. Please try again later. Contact Support Team if the problem persists." });
            res.redirect("/offlineJobs");
        }
    }
];

/**
 * GET /offlineJob/:id
 * View Offline Job Detail page.
 */
export let getJobDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const productPriceList = await getPostingCostOptions();

        const offlineJobId = req.params.id;
        const offlineJobDb = await OfflineJobModel
            .findById(offlineJobId)
            .populate("recruiter");

        if (offlineJobDb) {
            const jobId = offlineJobDb.job;
            const jobDb = await JobModel.findById(jobId);
            if (!jobDb) {
                const error = new Error(`Job not found for offlineJobDb._id=${offlineJobDb._id}`);
                throw error;
            }
            const recruiterDb = offlineJobDb.recruiter;
            if (!recruiterDb) {
                const error = new Error(`Recruiter not found for offlineJobDb._id=${offlineJobDb._id}`);
                throw error;
            }
            const creditAccountDb = await CreditAccountModel.findById(recruiterDb.creditAccount);
            if (!creditAccountDb) {
                const error = new Error(`Credit Account not found for recruiterDb._id=${recruiterDb._id}`);
                throw error;
            }
            const productPriceDb = await ProductPriceModel.findById(offlineJobDb.productPrice).populate("product");
            if (!productPriceDb) {
                const error = new Error(`Product Price not found for offlineJobDb._id=${offlineJobDb._id}`);
                throw error;
            }

            // client side script
            const includeScripts = ["/ckeditor/ckeditor.js", "/js/offlineJob/detail.js"];

            res.render("offlineJob/detail", {
                title: "Recruiter",
                title2: "Offline Job Detail",
                recruiterId: recruiterDb._id.toString(),
                recruiter: recruiterDb,
                creditAccount: creditAccountDb,
                productPrice: productPriceDb,
                offlineJobId: offlineJobId,
                offlineJob: offlineJobDb,
                jobId: jobDb._id.toString(),
                job: jobDb,
                productPrice_list: productPriceList,
                includeScripts: includeScripts,
                bu: req.query.bu,
            });

        } else {
            req.flash("errors", { msg: "Offline Job not found." });
            return res.redirect(backUrl.goBack(req.query.bu, "/offlineJobs"));
        }

    } catch (err) {
        logger.error((<Error>err).stack);
        req.flash("errors", { msg: "Unexpected error. Please try again later. Contact Support Team if the problem persists." });
        res.redirect("/offlineJobs");
    }
};

/**
 * GET /offlineJob/:id/update
 * Update Recruiter page.
 */
export let getJobUpdate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const productPriceList = await getPostingCostOptions();

        const offlineJobId = req.params.id;
        const offlineJobDb = await OfflineJobModel
            .findById(offlineJobId)
            .populate("recruiter");

        if (!offlineJobDb) {
            req.flash("errors", { msg: "Offline Job not found." });
            return res.redirect(backUrl.goBack(req.query.bu, "/offlineJobs"));
        }

        /**
         * - Only the following posting can be edited:
         *  - Status = "Pending"; Publish Ind = "New"
         *    - All fields are editable.
         *  - Status = "Active"; Publish Ind = "Unpublished"
         *    - "Publish Option" and "Publish Start Date" fields are not editable.
         */
        let isEditable = false;
        if ((offlineJobDb.status === STATUS_PENDING && offlineJobDb.publishInd === PUBIND_NEW)
            || (offlineJobDb.status === STATUS_ACTIVE && offlineJobDb.publishInd === PUBIND_UNPUBLISHED)) {
                isEditable = true;
        }
        if (!isEditable) {
            const error = new Error("Offline Job is not editable.");
            throw error;
        }

        const jobId = offlineJobDb.job;
        const jobDb = await JobModel.findById(jobId);
        if (!jobDb) {
            const error = new Error(`Job not found for offlineJobDb._id=${offlineJobDb._id}`);
            throw error;
        }
        const recruiterDb = offlineJobDb.recruiter;
        if (!recruiterDb) {
            const error = new Error(`Recruiter not found for offlineJobDb._id=${offlineJobDb._id}`);
            throw error;
        }
        const creditAccountDb = await CreditAccountModel.findById(recruiterDb.creditAccount);
        if (!creditAccountDb) {
            const error = new Error(`Credit Account not found for recruiterDb._id=${recruiterDb._id}`);
            throw error;
        }
        const productPriceDb = await ProductPriceModel.findById(offlineJobDb.productPrice).populate("product");
        if (!productPriceDb) {
            const error = new Error(`Product Price not found for offlineJobDb._id=${offlineJobDb._id}`);
            throw error;
        }
        const employerDb = await EmployerModel.findById(jobDb.employer);
        if (!employerDb) {
            const error = new Error(`Employer not found for _id=${jobDb.employer}`);
            throw error;
        }

        // TODO: check if previously selected productPriceId still valid
        // - if no longer valid: reset the productPriceId and publish dates

        const jobInput = Object.assign(jobDb, {
            title: offlineJobDb.title,
            description: jobDb.description,
            employerName: offlineJobDb.employerName,
            employer: employerDb._id,
            applyMethod: jobDb.applyMethod,
            salary: jobDb.salary,
            location: jobDb.locationCodes,
            closing: jobDb.closing,
            publishStart: offlineJobDb.publishStart,
            publishEnd: offlineJobDb.publishEnd,
            // weight: number,
            // tag: string[],
            customContent: jobDb.customContent,
            imgUrl: jobDb.imgUrl,
            postType: jobDb.postType,
            status: offlineJobDb.status,
            publishInd: offlineJobDb.publishInd,
        });

        const locationOptions = selectOption.OPTIONS_LOCATION();
        selectOption.markSelectedOptions(jobDb.locationCodes, locationOptions);

        const employerOptions =  await getEmployerOptions(recruiterDb._id);
        selectOption.markSelectedOption(jobInput.employer.toString(), employerOptions);

        // client side script
        const includeScripts = ["/ckeditor/ckeditor.js", "/js/lib/moment.min.js", "/js/offlineJob/form.js"];

        res.render("offlineJob/form", {
            title: "Recruiter",
            title2: "Edit Offline Job",
            recruiterId: recruiterDb._id.toString(),
            recruiter: recruiterDb,
            creditAccount: creditAccountDb,
            offlineJobId: offlineJobId,
            job: jobInput,
            includeScripts: includeScripts,
            locationOptions: locationOptions,
            employerOptions: employerOptions,
            productPrice_list: productPriceList,
            productPriceId: productPriceDb._id.toString(),
            productPrice: productPriceDb,
            bu: req.query.bu,
        });
    } catch (err) {
        logger.error((<Error>err).stack);

        req.flash("errors", { msg: "Unexpected error. Please try again later. Contact Support Team if the problem persists." });
        res.redirect("/offlineJobs");
    }
};

/**
 * POST /offlineJob/:id/update
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
    body("employer").isLength({ min: 1 }).trim().withMessage("Employer is required."),
    body("applyMethod").isLength({ min: 1 }).trim().withMessage("Apply Method is required."),
    body("productPriceId").isLength({ min: 1 }).trim().withMessage("Publish Option is required."),

    body("publishStart").isLength({ min: 1 }).trim().withMessage("Publish Date Start is required.")
    .isISO8601().withMessage("Publish Date Start is invalid."),

    body("publishEnd").isLength({ min: 1 }).trim().withMessage("Publish Date End is required.")
    .isISO8601().withMessage("Publish Date End is invalid."),

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

            const recruiterId = req.body.recruiterId;
            const recruiterDb = await RecruiterModel.findById(recruiterId).populate("creditAccount");
            if (!recruiterDb) {
                const error = new Error(`Recruiter not found for _id=${recruiterId}`);
                throw error;
            }
            if (recruiterDb.status == STATUS_TERMINATED) {
                const error = new Error(`Recruiter already Terminated for _id=${recruiterId}`);
                throw error;
            }

            const creditAccountDb = recruiterDb.creditAccount;
            if (!creditAccountDb || !creditAccountDb._id) {
                const error = new Error(`CreditAccount not available for recruiterId=${recruiterId}`);
                throw error;
            }

            const productPriceDb = await ProductPriceModel.findById(req.body.productPriceId).populate("product");
            if (!productPriceDb) {
                const error = new Error(`Product Price not found for _id=${req.body.productPriceId}`);
                throw error;
            }

            let trxType: string;
            if (productPriceDb.product.productType == PRODTYPE_CREDIT_UTILIZATION) {
                trxType = TRXTYPE_CREDIT_UTILIZATION;
            } else {
                const error = new Error(`Unexpected productType=${productPriceDb.product.productType}`);
                throw error;
            }

            const employerDb = await EmployerModel.findById(req.body.employer);
            if (!employerDb) {
                const error = new Error(`Employer not found for _id=${req.body.employer}`);
                throw error;
            }

            const locationInput = composeLocationFromRequest(req);

            const offlineJobId = req.params.id;

            const offlineJobDb = await OfflineJobModel.findById(offlineJobId);
            if (!offlineJobDb) {
                const error = new Error(`Offline Job not found for _id=${offlineJobId}`);
                throw error;
            }

            const jobDb = await JobModel.findById(offlineJobDb.job);
            if (!jobDb) {
                const error = new Error(`Job not found for _id=${offlineJobDb.job}`);
                throw error;
            }

            const customValidationErrors = [];

            /**
             * Custom Validations
             * - When editing status "Pending", publishdInd "New" posts:
             */
            if (offlineJobDb.status === STATUS_PENDING && offlineJobDb.publishInd === PUBIND_NEW) {
                // Publish Start must be > today
                if (!moment(req.body.publishStart, "YYYY-MM-DD").isAfter(moment())) {
                    customValidationErrors.push({ msg: "Publish Date Start must be from tomorrow onwards." });
                }
            }

            const offlineJobInput = {
                title: req.body.title,
                employerName: employerDb.name,
                publishStart: req.body.publishStart,
                publishEnd: req.body.publishEnd,
                productPrice: productPriceDb._id,
                updatedBy: req.user.id
            };

            const jobInput = {
                title: req.body.title,
                description: req.body.description,
                employerName: employerDb.name,
                employer: req.body.employer,
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
                 *    - "Publish Option" and "Publish Start Date" fields are not editable.
                 */
                let isEditable = false;
                if ((offlineJobDb.status === STATUS_PENDING && offlineJobDb.publishInd === PUBIND_NEW)
                    || (offlineJobDb.status === STATUS_ACTIVE && offlineJobDb.publishInd === PUBIND_UNPUBLISHED)) {
                        isEditable = true;
                }
                if (!isEditable) {
                    const error = new Error("Offline Job is not editable.");
                    throw error;
                }

                const offlineJobUpdated = await Object.assign(offlineJobDb, offlineJobInput).save(opts);
                const jobUpdated = await Object.assign(jobDb, jobInput).save(opts);

                // only commmit data changes in this block
                await mongodbSession.commitTransaction();
                mongodbSession.endSession();

                req.flash("success", { msg: "Offline Job successfully updated" });
                return res.redirect(`/offlineJobs?recruiterId=${recruiterId}`);

            } else if (!errors.isEmpty()) {
                req.flash("errors", errors.array());
            } else {
                req.flash("errors", customValidationErrors);
            }

            const productPriceList = await getPostingCostOptions();
            if (!productPriceList) {
                const error = new Error(`No valid Publish Options available.`);
                throw error;
            }

            const locationOptions = selectOption.OPTIONS_LOCATION();
            selectOption.markSelectedOptions(req.body.location, locationOptions);

            const employerOptions =  await getEmployerOptions(recruiterDb._id);
            selectOption.markSelectedOption(jobInput.employer.toString(), employerOptions);

            // client side script
            const includeScripts = ["/ckeditor/ckeditor.js", "/js/lib/moment.min.js", "/js/offlineJob/form.js"];

            res.render("offlineJob/form", {
                title: "Recruiter",
                title2: "Edit Offline Job",
                recruiterId: recruiterId,
                recruiter: recruiterDb,
                creditAccount: creditAccountDb,
                offlineJobId: offlineJobId,
                job: Object.assign(jobDb, jobInput),
                includeScripts: includeScripts,
                locationOptions: locationOptions,
                employerOptions: employerOptions,
                productPrice_list: productPriceList,
                productPriceId: req.body.productPriceId,
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
            res.redirect("/offlineJobs");
        }
    }
];

/**
 * POST /offlineJob/:id/delete
 * Delete an existing Offline Job.
 */
export let postJobDelete = [
    // validate values
    body("recruiterId").isLength({ min: 1 }).trim().withMessage("Recruiter ID is required."),

    // process request
    async (req: Request, res: Response, next: NextFunction) => {
        const mongodbSession = await mongoose.startSession();
        mongodbSession.startTransaction();
        const opts = { session: mongodbSession, new: true };

        try {
            const errors = validationResult(req);

            const offlineJobId = req.params.id;

            if (errors.isEmpty()) {
                const offlineJobDb = await OfflineJobModel.findById(offlineJobId);
                if (!offlineJobDb) {
                    const error = new Error(`Offline Job not found for _id=${offlineJobId}.`);
                    throw error;
                }

                /**
                 * Only status "Pending" posting can be deleted.
                 */
                if (offlineJobDb.status !== STATUS_PENDING) {
                    const error = new Error(`Offline Job cannot be deleted for _id=${offlineJobId}.`);
                    throw error;
                }

                const jobDb = await JobModel.findById(offlineJobDb.job);
                if (!jobDb) {
                    const error = new Error(`Job not found for _id=${offlineJobDb.job}`);
                    throw error;
                }

                const offlineJobInput = {
                    status: STATUS_DELETED,
                    updatedBy: req.user.id
                };
                const updatedOfflineJob = await Object.assign(offlineJobDb, offlineJobInput).save(opts);

                const jobInput = {
                    status: STATUS_DELETED,
                    updatedBy: req.user.id
                };
                const updatedJob = await Object.assign(jobDb, jobInput).save(opts);

                // only commmit data changes in this block
                await mongodbSession.commitTransaction();
                mongodbSession.endSession();

                req.flash("success", { msg: "Offline Job successfully deleted." });
                return res.redirect(backUrl.goBack(req.body.bu, "/offlineJobs"));

            } else {
                await mongodbSession.abortTransaction();
                mongodbSession.endSession();

                req.flash("errors", errors.array());
                return res.redirect(backUrl.goBack(req.body.bu, "/offlineJobs"));
            }
        } catch (err) {
            logger.error((<Error>err).stack);

            await mongodbSession.abortTransaction();
            mongodbSession.endSession();

            req.flash("errors", { msg: "Unexpected error. Please try again later. Contact Support Team if the problem persists." });
            res.redirect("/offlineJobs");
        }
    }
];

/**
 * POST /offlineJob/:id/publish
 * Publish an existing Offline Job.
 */
export let postJobPublish = [
    // validate values
    body("recruiterId").isLength({ min: 1 }).trim().withMessage("Recruiter ID is required."),

    // process request
    async (req: Request, res: Response, next: NextFunction) => {
        const mongodbSession = await mongoose.startSession();
        mongodbSession.startTransaction();
        const opts = { session: mongodbSession, new: true };

        try {
            const errors = validationResult(req);

            const offlineJobId = req.params.id;
            const recruiterId = req.body.recruiterId;

            if (errors.isEmpty()) {
                const offlineJobDb = await OfflineJobModel.findById(offlineJobId).session(mongodbSession);
                if (!offlineJobDb) {
                    const error = new Error(`Offline Job not found for _id=${offlineJobId}.`);
                    throw error;
                }

                /**
                 * Publish Date Start must > today
                 */
                if (!moment(offlineJobDb.publishStart, "YYYY-MM-DD").isAfter(moment())) {
                    req.flash("errors", { msg: "Publish Date Start must be from tomorrow onwards. Please edit and try again." });
                    return res.redirect(backUrl.goBack(req.body.bu, "/offlineJobs"));
                }

                /**
                 * Only status "Pending" posting can be published.
                 */
                if (offlineJobDb.status !== STATUS_PENDING) {
                    const error = new Error(`Offline Job cannot be published for _id=${offlineJobId}.`);
                    throw error;
                }

                const jobDb = await JobModel.findById(offlineJobDb.job).session(mongodbSession);
                if (!jobDb) {
                    const error = new Error(`Job not found for _id=${offlineJobDb.job}`);
                    throw error;
                }

                const recruiterDb = await RecruiterModel.findById(recruiterId);
                if (!recruiterDb) {
                    const error = new Error(`Recruiter not found for _id=${recruiterId}`);
                    throw error;
                }
                if (recruiterDb.status == STATUS_TERMINATED) {
                    const error = new Error(`Recruiter already Terminated for _id=${recruiterId}`);
                    throw error;
                }

                const creditAccountDb = await CreditAccountModel.findById(recruiterDb.creditAccount).session(mongodbSession);
                if (!creditAccountDb || !creditAccountDb._id) {
                    const error = new Error(`CreditAccount not available for recruiterId=${recruiterId}`);
                    throw error;
                }

                const productPriceDb = await ProductPriceModel.findById(offlineJobDb.productPrice).populate("product");
                if (!productPriceDb) {
                    const error = new Error(`Product Price not found for _id=${offlineJobDb.productPrice}`);
                    throw error;
                }

                let trxType: string;
                if (productPriceDb.product.productType == PRODTYPE_CREDIT_UTILIZATION) {
                    trxType = TRXTYPE_CREDIT_UTILIZATION;
                } else {
                    const error = new Error(`Unexpected productType=${productPriceDb.product.productType}`);
                    throw error;
                }

                const totalCreditToBeUtilized = productPriceDb.unitCreditValue * productPriceDb.fixedQty;
                if (totalCreditToBeUtilized > creditAccountDb.creditAvailable) {
                    req.flash("errors", { msg: "Credit Account Balance is insufficient. Please Top-up Credit and try again." });
                    return res.redirect(backUrl.goBack(req.body.bu, "/offlineJobs"));
                }

                // get all available source credit trx to deduct credit
                const availableCreditTrxList = await CreditTrxModel.find({
                    creditAccount: creditAccountDb._id,
                    trxType: { $in: [TRXTYPE_CREDIT_TOPUP, TRXTYPE_COMPLIMENTARY_CREDIT] },
                    totalCreditAvailable: { $gt: 0 },
                    status: "A",
                }).sort({ trxDate: 1 }).session(mongodbSession);

                if (!availableCreditTrxList || availableCreditTrxList.length == 0) {
                    req.flash("errors", { msg: "Credit Trx not available for deduction. Please contact Administrator." });
                    return res.redirect(backUrl.goBack(req.body.bu, "/offlineJobs"));
                }

                const creditTrxInput = new CreditTrxModel({
                    trxDate: moment(),
                    trxType: trxType,
                    creditAccount: creditAccountDb._id,
                    currency: productPriceDb.currency,
                    product: productPriceDb.product._id,
                    productPrice: productPriceDb._id,
                    unitPrice: productPriceDb.unitPrice,
                    unitCredit: productPriceDb.unitCreditValue,
                    qty: productPriceDb.fixedQty,
                    totalCredit: -totalCreditToBeUtilized,
                    job: jobDb._id,
                    status: "A",
                    createdBy: req.user.id,
                });

                // create new credit trx
                const creditTrxCreated = await creditTrxInput.save(opts);

                // deduct available credit from source credit trx
                let balanceCreditToBeUtilized = totalCreditToBeUtilized;
                for (const creditTrxDb of availableCreditTrxList) {
                    const curAvailableCredit = creditTrxDb.totalCreditAvailable;
                    if (balanceCreditToBeUtilized > curAvailableCredit) {
                        // deduct full available credit from current credit trx
                        const creditTrxUpdated = await CreditTrxModel.findByIdAndUpdate(
                            creditTrxDb._id, {
                                $inc: { "totalCreditAvailable": -curAvailableCredit },
                                updatedBy: req.user.id,
                            }, opts
                        );

                        if (creditTrxUpdated.totalCreditAvailable < 0) {
                            const error = new Error(`Unexpected results of negative totalCreditAvailable for creditTrx._id=${creditTrxDb._id}`);
                            throw error;
                        }

                        balanceCreditToBeUtilized = balanceCreditToBeUtilized - curAvailableCredit;

                    } else {
                        // deduct partial available credit from current credit trx
                        const creditTrxUpdated = await CreditTrxModel.findByIdAndUpdate(
                            creditTrxDb._id, {
                                $inc: { "totalCreditAvailable": -balanceCreditToBeUtilized },
                                updatedBy: req.user.id,
                            }, opts
                        );

                        if (creditTrxUpdated.totalCreditAvailable < 0) {
                            const error = new Error(`Unexpected results of negative totalCreditAvailable for creditTrx._id=${creditTrxDb._id}`);
                            throw error;
                        }

                        balanceCreditToBeUtilized = 0;
                    }

                    if (balanceCreditToBeUtilized === 0) {
                        break;
                    }
                }

                // update credit account
                const creditAccountUpdated = await CreditAccountModel.findByIdAndUpdate(
                    creditAccountDb._id, {
                        $inc: { "creditBalance": -totalCreditToBeUtilized },
                        lastTrxDate: creditTrxCreated.trxDate,
                        updatedBy: req.user.id,
                    }, opts
                );

                // check if credit balance is valid after updated
                if (creditAccountUpdated.creditBalance < 0) {
                    const error = new Error(`Unexpected results of negative creditBalance for creditAccount._id=${creditAccountDb._id}`);
                    throw error;
                }

                // create new publishedJob
                const publishedJobCreated = await new PublishedJobModel({
                    title: jobDb.title,
                    employerName: jobDb.employerName,
                    publishStart: jobDb.publishStart,
                    publishEnd: jobDb.publishEnd,
                    location: jobDb.location,
                    job: jobDb._id,
                    weight: WEIGHT_HIGH,
                    status: "A",
                    createdBy: req.user.id,
                }).save(opts);

                // update offline job
                const offlineJobInput = {
                    status: "A",
                    publishInd: PUBIND_PUBLISHED,
                    creditTrx: creditTrxCreated._id,
                    updatedBy: req.user.id
                };
                const updatedOfflineJob = await Object.assign(offlineJobDb, offlineJobInput).save(opts);

                // only commmit data changes in this block
                await mongodbSession.commitTransaction();
                mongodbSession.endSession();

                req.flash("success", { msg: "Offline Job successfully published." });
                return res.redirect(backUrl.goBack(req.body.bu, "/offlineJobs"));

            } else {
                await mongodbSession.abortTransaction();
                mongodbSession.endSession();

                req.flash("errors", errors.array());
                return res.redirect(backUrl.goBack(req.body.bu, "/offlineJobs"));
            }
        } catch (err) {
            logger.error((<Error>err).stack);

            await mongodbSession.abortTransaction();
            mongodbSession.endSession();

            req.flash("errors", { msg: "Unexpected error. Please try again later. Contact Support Team if the problem persists." });
            res.redirect("/offlineJobs");
        }
    }
];

/**
 * POST /offlineJob/:id/unpublish
 * Unpublish an existing Published Offline Job.
 */
export let postJobUnpublish = [
    // validate values
    body("recruiterId").isLength({ min: 1 }).trim().withMessage("Recruiter ID is required."),

    // process request
    async (req: Request, res: Response, next: NextFunction) => {
        const mongodbSession = await mongoose.startSession();
        mongodbSession.startTransaction();
        const opts = { session: mongodbSession, new: true };

        try {
            const errors = validationResult(req);

            const offlineJobId = req.params.id;

            if (errors.isEmpty()) {
                const offlineJobDb = await OfflineJobModel.findById(offlineJobId);
                if (!offlineJobDb) {
                    const error = new Error(`Offline Job not found for _id=${offlineJobId}.`);
                    throw error;
                }

                /**
                 * Only status "Active", publishInd "Published"/ "Republished" posting can be deleted.
                 */
                if (!(offlineJobDb.status === STATUS_ACTIVE && (offlineJobDb.publishInd === PUBIND_PUBLISHED || offlineJobDb.publishInd === PUBIND_REPUBLISHED))) {
                    const error = new Error(`Offline Job cannot be unpublished for _id=${offlineJobId}.`);
                    throw error;
                }

                // find current Active publishedJob
                const publishedJobDb = await PublishedJobModel.findOne({ "job": offlineJobDb.job, "status": STATUS_ACTIVE });
                if (!publishedJobDb) {
                    const error = new Error(`Published Job not found for publishedJob.job=${offlineJobDb.job}`);
                    throw error;
                }

                const offlineJobInput = {
                    publishInd: PUBIND_UNPUBLISHED,
                    updatedBy: req.user.id
                };
                const updatedOfflineJob = await Object.assign(offlineJobDb, offlineJobInput).save(opts);

                // delete publishedJob
                const publishedJobInput = {
                    status: STATUS_DELETED,
                    updatedBy: req.user.id
                };
                const updatedPublishedJob = await Object.assign(publishedJobDb, publishedJobInput).save(opts);

                // only commmit data changes in this block
                await mongodbSession.commitTransaction();
                mongodbSession.endSession();

                req.flash("success", { msg: "Offline Job successfully unpublished." });
                return res.redirect(backUrl.goBack(req.body.bu, "/offlineJobs"));

            } else {
                await mongodbSession.abortTransaction();
                mongodbSession.endSession();

                req.flash("errors", errors.array());
                return res.redirect(backUrl.goBack(req.body.bu, "/offlineJobs"));
            }
        } catch (err) {
            logger.error((<Error>err).stack);

            await mongodbSession.abortTransaction();
            mongodbSession.endSession();

            req.flash("errors", { msg: "Unexpected error. Please try again later. Contact Support Team if the problem persists." });
            res.redirect("/offlineJobs");
        }
    }
];

/**
 * POST /offlineJob/:id/republish
 * Republish an existing Unpublished Offline Job.
 */
export let postJobRepublish = [
    // validate values
    body("recruiterId").isLength({ min: 1 }).trim().withMessage("Recruiter ID is required."),

    // process request
    async (req: Request, res: Response, next: NextFunction) => {
        const mongodbSession = await mongoose.startSession();
        mongodbSession.startTransaction();
        const opts = { session: mongodbSession, new: true };

        try {
            const errors = validationResult(req);

            const offlineJobId = req.params.id;

            if (errors.isEmpty()) {
                const offlineJobDb = await OfflineJobModel.findById(offlineJobId);
                if (!offlineJobDb) {
                    const error = new Error(`Offline Job not found for _id=${offlineJobId}.`);
                    throw error;
                }

                /**
                 * Only status "Active", publishInd "Unpublished" posting can be deleted.
                 */
                if (!(offlineJobDb.status === STATUS_ACTIVE && offlineJobDb.publishInd === PUBIND_UNPUBLISHED)) {
                    const error = new Error(`Offline Job cannot be republished for _id=${offlineJobId}.`);
                    throw error;
                }

                const jobDb = await JobModel.findById(offlineJobDb.job);
                if (!jobDb) {
                    const error = new Error(`Job not found for job._id=${offlineJobDb.job}`);
                    throw error;
                }

                const offlineJobInput = {
                    publishInd: PUBIND_REPUBLISHED,
                    lastPublishDate: moment(),
                    updatedBy: req.user.id
                };
                const updatedOfflineJob = await Object.assign(offlineJobDb, offlineJobInput).save(opts);

                // re-create publishedJob
                const publishedJobCreated = await new PublishedJobModel({
                    title: jobDb.title,
                    employerName: jobDb.employerName,
                    publishStart: jobDb.publishStart,
                    publishEnd: jobDb.publishEnd,
                    location: jobDb.location,
                    job: jobDb._id,
                    weight: WEIGHT_HIGH,
                    status: "A",
                    createdBy: req.user.id,
                }).save(opts);

                // only commmit data changes in this block
                await mongodbSession.commitTransaction();
                mongodbSession.endSession();

                req.flash("success", { msg: "Offline Job successfully republished." });
                return res.redirect(backUrl.goBack(req.body.bu, "/offlineJobs"));

            } else {
                await mongodbSession.abortTransaction();
                mongodbSession.endSession();

                req.flash("errors", errors.array());
                return res.redirect(backUrl.goBack(req.body.bu, "/offlineJobs"));
            }
        } catch (err) {
            logger.error((<Error>err).stack);

            await mongodbSession.abortTransaction();
            mongodbSession.endSession();

            req.flash("errors", { msg: "Unexpected error. Please try again later. Contact Support Team if the problem persists." });
            res.redirect("/offlineJobs");
        }
    }
];