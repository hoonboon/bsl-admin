import async from "async";
import moment from "moment";
import mongoose from "mongoose";
import numeral from "numeral";
import { Request, Response, NextFunction } from "express";

import { body, validationResult } from "express-validator/check";
import { sanitizeBody } from "express-validator/filter";
import * as pug from "pug";

import { Logger } from "../util/logger";
import { PageInfo, getNewPageInfo } from "../util/pagination";
import * as selectOption from "../util/selectOption";
import * as backUrl from "../util/backUrl";
import RecruiterModel, { STATUS_TERMINATED, STATUS_ACTIVE } from "../models/Recruiter";
import CreditAccountModel from "../models/CreditAccount";
import CreditTrxModel, { TRXTYPE_CREDIT_TOPUP, TRXTYPE_COMPLIMENTARY_CREDIT, ICreditTrx } from "../models/CreditTrx";
import ProductModel, { PRODTYPE_CREDIT_TOPUP, PRODTYPE_COMPLIMENTARY_CREDIT, IProduct } from "../models/Product";
import ProductPriceModel, { IProductPrice } from "../models/ProductPrice";
import { getRoundedAmount } from "../util/roudingMechanism";
import TrxDocumentModel, { DOCTYPE_INVOICE } from "../models/TrxDocument";
import { getNextSeqNo, SEQKEY_INVOICE } from "../util/seqNoGenerator";
import { Invoice, InvoiceLine, OPTIONS_INVOICE } from "../pdfTemplate/invoice";
import { PdfGenerator } from "../util/pdfGenerator";

const logger = new Logger("controllers.recruiter");

const DEFAULT_ROW_PER_PAGE: number = 10;

/**
 * GET /creditAccounts
 * Credit Account listing page.
 */
export let getCreditAccounts = async (req: Request, res: Response, next: NextFunction) => {
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
            query.populate("creditAccount");
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
        const includeScripts = ["/js/creditAccount/list.js", "/js/util/pagination.js"];

        res.render("creditAccount/list", {
            title: "Recruiter",
            title2: "Credit Account List",
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
        res.redirect("/creditAccounts");
    }

};

/**
 * GET /creditAccount/:id
 * View Credit Account Detail page.
 */
export let getCreditAccountDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creditAccountDb = await CreditAccountModel.findById(req.params.id).populate("recruiter");

        if (!creditAccountDb) {
            req.flash("errors", { msg: "Credit Account not found." });
            const bu = backUrl.decodeBackUrl(req.query.bu);
            if (bu) {
                return res.redirect(bu);
            } else {
                return res.redirect("/creidtAccounts");
            }
        }

        const creditTrx_list =
            await CreditTrxModel
                .find({ creditAccount: creditAccountDb._id })
                .sort({ trxDate: -1 })
                .populate("product");

        // calculate totals of all creditTrx_list
        let totalAdditions = 0;
        let totalDeductions = 0;
        if (creditTrx_list && creditTrx_list.length > 0) {
            for (const item of creditTrx_list) {
                if (item.totalCredit > 0) {
                    totalAdditions = totalAdditions + item.totalCredit;
                } else if (item.totalCredit < 0) {
                    totalDeductions = totalDeductions + (item.totalCredit * -1);
                }
            }
        }

        // client side script
        const includeScripts = ["/js/creditAccount/detail.js"];

        res.render("creditAccount/detail", {
            title: "Recruiter",
            title2: "Credit Account Detail",
            creditAccount: creditAccountDb,
            creditAccountId: creditAccountDb._id,
            creditTrx_list: creditTrx_list,
            totalAdditions: numeral(totalAdditions).format("0,0"),
            totalDeductions: numeral(totalDeductions).format("0,0"),
            includeScripts: includeScripts,
            bu: req.query.bu,
        });
    } catch (err) {
        logger.error((<Error>err).stack);
        req.flash("errors", { msg: "Unexpected error. Please try again later. Contact Support Team if the problem persists." });
        res.redirect("/creditAccounts");
    }
};

/**
 * Get effective product price of productType = CREDIT_TOPUP or COMPLIMENTARY_CREDIT
 * - Each unique productCode will appear only once.
 * - If more than 1 productPrice are in effect, only the lowest unitPrice will be selected.
 */
async function getCreditTopUpOptions() {
    const results: IProductPrice[] = [];
    const resultsMap: Map<string, IProductPrice> = new Map<string, IProductPrice>();

    // get published productId list
    const productIds = await ProductModel.find({
        productType: { $in: [PRODTYPE_CREDIT_TOPUP, PRODTYPE_COMPLIMENTARY_CREDIT] },
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
        .select("_id product unitPrice unitCreditValue fixedQty currency")
        .sort({ unitPrice: 1, product: 1 });

        // retain only 1 price for each productId
        if (productPrices && productPrices.length > 0) {
            for (const item of productPrices) {
                const mapItem = resultsMap.get(item.product.productCode as string);
                if (mapItem) {
                    // retain only the lowest price item
                    if (mapItem.unitPrice > item.unitPrice) {
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
 * GET /creditAccount/:id/addCredit
 * Add Credit to Credit Account page.
 */
export let getCreditAccountAddCredit = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creditAccountId = req.params.id;
        const creditAccountDb = await CreditAccountModel.findById(creditAccountId).populate("recruiter");
        if (!creditAccountDb) {
            const error = new Error(`Credit Account not found for _id=${creditAccountId}`);
            throw error;
        }
        if (creditAccountDb.recruiter.status == STATUS_TERMINATED) {
            const error = new Error(`Recruiter already Terminated for creditAccount._id=${creditAccountId}`);
            throw error;
        }

        const productPriceList = await getCreditTopUpOptions();

        const defaultSelected = productPriceList[0];
        const creditTrxInput = {
            currency: defaultSelected.currency,
            productPriceId: defaultSelected._id,
            totalAmount: defaultSelected.currency + defaultSelected.unitPriceDisplay,
            totalCredit: defaultSelected.unitCreditValueDisplay,
        };

        // client side script
        const includeScripts = ["/js/lib/numeral.min.js", "/js/creditAccount/formAddCredit.js"];

        res.render("creditAccount/formAddCredit", {
            title: "Recruiter",
            title2: "Add Credit",
            creditAccount: creditAccountDb,
            creditAccountId: creditAccountDb._id,
            creditTrx: creditTrxInput,
            productPrice_list: productPriceList,
            includeScripts: includeScripts,
            bu: req.query.bu,
        });

    } catch (err) {
        logger.error((<Error>err).stack);
        req.flash("errors", { msg: "Unexpected error. Please try again later. Contact Support Team if the problem persists." });
        res.redirect("/creditAccounts");
    }

};

/**
 * POST /creditAccount/:id/addCredit
 * Commit Add Credit to Credit Account.
 */
export let postCreditAccountAddCredit = [
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
    body("productPriceId").isLength({ min: 1 }).trim().withMessage("Top-up Option is required."),
    body("paymentReference").isLength({ min: 1 }).trim().withMessage("Payment Reference is required."),

    // sanitize values
    sanitizeBody("*").trim().escape(),

    // process request
    async (req: Request, res: Response, next: NextFunction) => {
        const mongodbSession = await mongoose.startSession();
        mongodbSession.startTransaction();
        const opts = { session: mongodbSession, new: true };

        try {
            const errors = validationResult(req);

            const creditAccountId = req.params.id;
            const creditAccountDb = await CreditAccountModel.findById(
                creditAccountId
            ).populate("recruiter");

            if (!creditAccountDb) {
                const error = new Error(`Credit Account not found for _id=${creditAccountId}`);
                throw error;
            }

            if (creditAccountDb.recruiter.status == STATUS_TERMINATED) {
                const error = new Error(`Recruiter already Terminated for creditAccount._id=${creditAccountId}`);
                throw error;
            }

            const productPriceDb = await ProductPriceModel.findById(req.body.productPriceId).populate("product");
            if (!productPriceDb) {
                const error = new Error(`Product Price not found for _id=${req.body.productPriceId}`);
                throw error;
            }

            let trxType: string;
            if (productPriceDb.product.productType == PRODTYPE_CREDIT_TOPUP) {
                trxType = TRXTYPE_CREDIT_TOPUP;
            } else if (productPriceDb.product.productType == PRODTYPE_COMPLIMENTARY_CREDIT) {
                trxType = TRXTYPE_COMPLIMENTARY_CREDIT;
            } else {
                const error = new Error(`Unexpected productType=${productPriceDb.product.productType}`);
                throw error;
            }

            const totalAmount = Math.floor(productPriceDb.unitPrice * productPriceDb.fixedQty * 100) / 100;
            const totalAmountAfterRounding = getRoundedAmount(totalAmount);
            const roundingAmount = totalAmountAfterRounding - totalAmount;

            const totalCredit = productPriceDb.unitCreditValue * productPriceDb.fixedQty;

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
                totalAmount: totalAmount,
                totalCredit: totalCredit,
                roundingAmount: roundingAmount,
                paymentReference: req.body.paymentReference,
                totalCreditAvailable: totalCredit,
                status: "A",
                createdBy: req.user.id,
            });

            if (errors.isEmpty()) {
                // create creditTrx
                const creditTrxCreated = await creditTrxInput.save(opts);

                // create trxDocument
                const trxYear = moment(creditTrxCreated.trxDate).year();
                const docSeqNo = await getNextSeqNo([SEQKEY_INVOICE, trxYear.toString()], opts);

                const trxDocumentInput = new TrxDocumentModel({
                    docType: DOCTYPE_INVOICE,
                    trxYear: trxYear,
                    seqNo: docSeqNo,
                    creditTrx: creditTrxCreated._id,
                    billingName: creditAccountDb.recruiter.billTo.name,
                    billingAddress: creditAccountDb.recruiter.billTo.address,
                    status: "A",
                    createdBy: req.user.id,
                });

                const trxDocumentCreated = await trxDocumentInput.save(opts);

                // update creditTrx.trxDocument
                creditTrxCreated.trxDocument = trxDocumentCreated._id;
                const creditTrxUpdated = await CreditTrxModel.findByIdAndUpdate(creditTrxCreated._id, creditTrxCreated, opts);

                // update creditAccount.creditBalance, validDateEnd, lastTrxDate, status
                const newCreditValidEndDate = moment(creditTrxCreated.trxDate).add(12, "months");

                const creditAccountUpdated = await CreditAccountModel.findByIdAndUpdate(
                    creditAccountDb._id, {
                        $inc: { "creditBalance": creditTrxUpdated.totalCredit },
                        validDateEnd: moment(newCreditValidEndDate.format("YYYY-MM-DD") + " 00:00 +0000", "YYYY-MM-DD HH:mm Z"),
                        lastTrxDate: creditTrxCreated.trxDate,
                        status: "A",
                        updatedBy: req.user.id,
                    }, opts
                );

                // only commmit data changes in this block
                await mongodbSession.commitTransaction();
                mongodbSession.endSession();

                req.flash("success", { msg: "Credit successfully added." });
                return res.redirect(`${creditAccountUpdated.url}?bu=${req.body.bu}`);

            } else {
                req.flash("errors", errors.array());
            }

            // default error handling
            const productPriceList = await getCreditTopUpOptions();

            // client side script
            const includeScripts = ["/js/lib/numeral.min.js", "/js/creditAccount/formAddCredit.js"];

            res.render("creditAccount/formAddCredit", {
                title: "Recruiter",
                title2: "Add Credit",
                creditAccount: creditAccountDb,
                creditAccountId: creditAccountDb._id,
                creditTrx: creditTrxInput,
                productPrice_list: productPriceList,
                includeScripts: includeScripts,
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
            res.redirect("/creditAccounts");
        }
    }
];

/**
 * POST /creditAccount/trxDocument/download
 * Download Trx Document.
 */
export let postDownloadInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
        req.assert("creditAccountId", "Credit Account Id is required").notEmpty();
        req.assert("docId", "Trx Document No. is required").notEmpty();

        const errors = req.validationErrors();

        if (errors) {
            req.flash("errors", errors);
            return res.redirect("/creditAccounts");
        }

        const creditAccountId = req.body.creditAccountId;
        const creditAccountDb = await CreditAccountModel.findById(creditAccountId);
        if (!creditAccountDb) {
            const error = new Error(`Credit Account not found for _id=${creditAccountId}`);
            throw error;
        }

        const trxDocumentId = req.body.docId;
        const trxDocumentDb = await TrxDocumentModel.findById(trxDocumentId);
        if (!trxDocumentDb) {
            const error = new Error(`Trx Document not found for _id=${trxDocumentId}`);
            throw error;
        }

        const creditTrxDb = await CreditTrxModel.findById(trxDocumentDb.creditTrx).populate("product");
        if (!creditTrxDb) {
            const error = new Error(`Credit Trx not found for _id=${trxDocumentDb.creditTrx}`);
            throw error;
        }

        const productDb = creditTrxDb.product as IProduct;

        const invoiceData = new Invoice ({
            invoiceNo: trxDocumentDb.docNoDisplay,
            invoiceDate: creditTrxDb.trxDateDisplay,
            billTo: {
                name: trxDocumentDb.billingName,
                address: trxDocumentDb.billingAddress,
            },
            currency: creditTrxDb.currency,
            amountDue: creditTrxDb.totalAmount,
            totalAmountDue: creditTrxDb.totalAmount,
            roundingAmount: creditTrxDb.roundingAmount,
            paymentReference: creditTrxDb.paymentReference,
            lines: [
                new InvoiceLine ({
                    sn: 1,
                    itemCode: productDb.productCode,
                    itemDesc: productDb.productDesc,
                    unitPrice: creditTrxDb.unitPrice,
                    qty: creditTrxDb.qty,
                    totalPrice: creditTrxDb.totalAmount,
                }),
            ],
            printDate: moment().format("YYYY-MM-DD HH:mm"),
        });

        const localsObject: pug.LocalsObject = {
            invoice: invoiceData,
            imagePath: req.protocol + "://" + req.get("host") + "/images/" ,
        };

        await PdfGenerator.sendPdfGivenTemplatePath(res, OPTIONS_INVOICE, localsObject);

    } catch (err) {
        logger.error((<Error>err).stack);

        req.flash("errors", { msg: "Unexpected error. Please try again later. Contact Support Team if the problem persists." });
        res.redirect("/creditAccounts");
    }
  };

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