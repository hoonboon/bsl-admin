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

import AdminJobModel, { PUBIND_PUBLISHED, STATUS_ACTIVE } from "../models/AdminJob";
import JobModel from "../models/Job";
import OfflineJobModel from "../models/OfflineJob";

/**
 * To be executed before Phase 1: Offline Recruiter changes take effect
 */
async function execute() {
    try {
        /**
         * clear all existing records: AdminJob
         */
        await AdminJobModel.deleteMany({});

        /**
         * Create AdminJob for all existing Job records
         */
        const query = JobModel.find();
        query.where("status").in(["A"]);
        const recordCount = await query.countDocuments();
        logger.info(`Total Job record count: ${recordCount}`);

        if (recordCount > 0) {
            query.find();
            query.sort([["_id", "ascending"]]);
            const item_list = await query.exec();

            const input_list = [];
            for (const item of item_list) {
                // skip item if is created by OfflineJob
                const offlineJobCount = await OfflineJobModel.countDocuments({"job": item._id});
                // else create as adminJob
                if (offlineJobCount === 0) {
                    const adminJobInput = {
                        title: item.title,
                        employerName: item.employerName,
                        publishStart: item.publishStart,
                        publishEnd: item.publishEnd,
                        job: item._id,
                        publishInd: PUBIND_PUBLISHED,
                        lastPublishDate: item.get("updatedAt"),
                        status: STATUS_ACTIVE,
                        createdBy: item.createdBy,
                        updatedBy: item.updatedBy,
                    };
                    input_list.push(adminJobInput);
                }
            }

            logger.info(`Total records to be created: ${input_list.length}`);
            const adminJobCreatedList = await AdminJobModel.insertMany(input_list);
            logger.info(`Total created records: ${adminJobCreatedList.length}`);
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
