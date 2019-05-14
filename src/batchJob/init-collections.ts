import dotenv from "dotenv";
import moment from "moment";
import mongoose from "mongoose";

// Load environment variables from .env file, where API keys and passwords are configured
dotenv.config({ path: ".env" });

import { Logger } from "../util/logger";
const logger = new Logger("batchJob.init-collections");

// Connect to MongoDB
const mongoUrl = process.env.MONGODB_URI;

const mongoConnectOpts = {
  useNewUrlParser: true,
  useCreateIndex: true,
  autoReconnect: true,
  poolSize: 2,
};

mongoose.set("debug", process.env.ENVIRONMENT === "production" ? false : true);

async function connectDb() {
    try {
        await mongoose.connect(mongoUrl, mongoConnectOpts);
        /** ready to use. The `mongoose.connect()` promise resolves to undefined. */
        logger.info("MongoDB connected.");
    } catch (err) {
        logger.error("MongoDB connection error. Please make sure MongoDB is running. " + err);
        process.exit();
    }
}

import RecruiterModel from "../models/Recruiter";
import CreditAccountModel from "../models/CreditAccount";
import CreditTrxModel from "../models/CreditTrx";
import TrxDocumentModel from "../models/TrxDocument";
import OfflineJobModel from "../models/OfflineJob";
import PublishedJobModel from "../models/PublishedJob";
import ProductModel, { PRODTYPE_CREDIT_TOPUP, PRODTYPE_COMPLIMENTARY_CREDIT, PRODTYPE_CREDIT_UTILIZATION } from "../models/Product";
import ProductPriceModel from "../models/ProductPrice";

async function execute() {
    try {
        let dummyRecord: any;

        // TODO: pre-create collections that will have records created via Transaction
        // Record creation via Transaction must be an existing Collection
        dummyRecord = await new RecruiterModel({}).save();
        await RecruiterModel.findByIdAndDelete(dummyRecord._id);

        dummyRecord = await new CreditAccountModel({}).save();
        await CreditAccountModel.findByIdAndDelete(dummyRecord._id);

        dummyRecord = await new CreditTrxModel({}).save();
        await CreditTrxModel.findByIdAndDelete(dummyRecord._id);

        dummyRecord = await new TrxDocumentModel({}).save();
        await TrxDocumentModel.findByIdAndDelete(dummyRecord._id);

        dummyRecord = await new OfflineJobModel({}).save();
        await OfflineJobModel.findByIdAndDelete(dummyRecord._id);

        dummyRecord = await new PublishedJobModel({}).save();
        await PublishedJobModel.findByIdAndDelete(dummyRecord._id);

        // TODO: Initialize collection data without data entry screens

        await ProductModel.deleteMany({});
        await ProductPriceModel.deleteMany({});
        const effectiveDateStart = moment("2019-01-01");
        const effectiveDateEnd = moment("2030-12-31");

        const productList = [
            {
                product: {
                    productCode: "T19001",
                    productDesc: "TOP-UP 50 CREDITS",
                    productType: PRODTYPE_CREDIT_TOPUP,
                    publishInd: "Y",
                    status: "A",
                },
                price: {
                    currency: "MYR",
                    unitPrice: 50,
                    unitCreditValue: 50,
                    fixedQty: 1,
                    effectiveDateStartInput: effectiveDateStart.format("YYYY-MM-DD"),
                    effectiveDateEndInput: effectiveDateEnd.format("YYYY-MM-DD"),
                    publishInd: "Y",
                    status: "A",
                },
            },
            {
                product: {
                    productCode: "T19002",
                    productDesc: "TOP-UP 120 CREDITS",
                    productType: PRODTYPE_CREDIT_TOPUP,
                    publishInd: "Y",
                    status: "A",
                },
                price: {
                    currency: "MYR",
                    unitPrice: 100,
                    unitCreditValue: 120,
                    fixedQty: 1,
                    effectiveDateStartInput: effectiveDateStart.format("YYYY-MM-DD"),
                    effectiveDateEndInput: effectiveDateEnd.format("YYYY-MM-DD"),
                    publishInd: "Y",
                    status: "A",
                },
            },
            {
                product: {
                    productCode: "T19003",
                    productDesc: "TOP-UP 200 CREDITS",
                    productType: PRODTYPE_CREDIT_TOPUP,
                    publishInd: "Y",
                    status: "A",
                },
                price: {
                    currency: "MYR",
                    unitPrice: 150,
                    unitCreditValue: 200,
                    fixedQty: 1,
                    effectiveDateStartInput: effectiveDateStart.format("YYYY-MM-DD"),
                    effectiveDateEndInput: effectiveDateEnd.format("YYYY-MM-DD"),
                    publishInd: "Y",
                    status: "A",
                },
            },
            {
                product: {
                    productCode: "T19004",
                    productDesc: "TOP-UP 300 CREDITS",
                    productType: PRODTYPE_CREDIT_TOPUP,
                    publishInd: "Y",
                    status: "A",
                },
                price: {
                    currency: "MYR",
                    unitPrice: 200,
                    unitCreditValue: 300,
                    fixedQty: 1,
                    effectiveDateStartInput: effectiveDateStart.format("YYYY-MM-DD"),
                    effectiveDateEndInput: effectiveDateEnd.format("YYYY-MM-DD"),
                    publishInd: "Y",
                    status: "A",
                },
            },
            {
                product: {
                    productCode: "C19001",
                    productDesc: "SIGN-UP CAMPAIGN 2019 FREE 50 CREDITS",
                    productType: PRODTYPE_COMPLIMENTARY_CREDIT,
                    publishInd: "N",
                    status: "A",
                },
                price: {
                    currency: "MYR",
                    unitPrice: 0,
                    unitCreditValue: 50,
                    fixedQty: 1,
                    effectiveDateStartInput: effectiveDateStart.format("YYYY-MM-DD"),
                    effectiveDateEndInput: effectiveDateEnd.format("YYYY-MM-DD"),
                    publishInd: "N",
                    status: "A",
                },
            },
            {
                product: {
                    productCode: "P19001",
                    productDesc: "PUBLISH 15 DAYS",
                    productType: PRODTYPE_CREDIT_UTILIZATION,
                    publishInd: "Y",
                    status: "A",
                },
                price: {
                    unitCreditValue: 25,
                    postingDays: 15,
                    fixedQty: 1,
                    effectiveDateStartInput: effectiveDateStart.format("YYYY-MM-DD"),
                    effectiveDateEndInput: effectiveDateEnd.format("YYYY-MM-DD"),
                    publishInd: "Y",
                    status: "A",
                },
            },
            {
                product: {
                    productCode: "P19002",
                    productDesc: "PUBLISH 30 DAYS",
                    productType: PRODTYPE_CREDIT_UTILIZATION,
                    publishInd: "Y",
                    status: "A",
                },
                price: {
                    unitCreditValue: 50,
                    postingDays: 30,
                    fixedQty: 1,
                    effectiveDateStartInput: effectiveDateStart.format("YYYY-MM-DD"),
                    effectiveDateEndInput: effectiveDateEnd.format("YYYY-MM-DD"),
                    publishInd: "Y",
                    status: "A",
                },
            },
            {
                product: {
                    productCode: "P19003",
                    productDesc: "PUBLISH 45 DAYS @ 70 CREDITS",
                    productType: PRODTYPE_CREDIT_UTILIZATION,
                    publishInd: "Y",
                    status: "A",
                },
                price: {
                    unitCreditValue: 70,
                    postingDays: 45,
                    fixedQty: 1,
                    effectiveDateStartInput: effectiveDateStart.format("YYYY-MM-DD"),
                    effectiveDateEndInput: effectiveDateEnd.format("YYYY-MM-DD"),
                    publishInd: "Y",
                    status: "A",
                },
            },
            {
                product: {
                    productCode: "P19004",
                    productDesc: "PUBLISH 60 DAYS",
                    productType: PRODTYPE_CREDIT_UTILIZATION,
                    publishInd: "Y",
                    status: "A",
                },
                price: {
                    unitCreditValue: 90,
                    postingDays: 60,
                    fixedQty: 1,
                    effectiveDateStartInput: effectiveDateStart.format("YYYY-MM-DD"),
                    effectiveDateEndInput: effectiveDateEnd.format("YYYY-MM-DD"),
                    publishInd: "Y",
                    status: "A",
                },
            },
        ];
        for (const item of productList) {
            // create product
            const productInput = new ProductModel(item.product);
            const productDb = await productInput.save();

            // create productPrice
            const productPriceInput = new ProductPriceModel({
                ...item.price, product: productDb._id
            });
            const productPriceDb = await productPriceInput.save();
        }

    } catch (err) {
        throw err;
    }
}

(async () => {
    logger.debug("start");
    try {
        await connectDb();
        await execute();
    } catch (err) {
        logger.error((<Error>err).stack);
    }
    logger.debug("end");
    process.exit();
}) ();
