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
        // await AdminJobModel.deleteMany({});

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

            // init map of existing job records belonging to either offlineJob or adminJob records
            const validJobMap = new Map();

            const offlineJob_list = await OfflineJobModel.find({}, "_id job");
            if (offlineJob_list && offlineJob_list.length > 0) {
                for (const item of offlineJob_list) {
                    // must use `${ObjectId}` to convert ObjectId to string value to be used as map key
                    validJobMap.set(`${item.job}`, 1);
                }
            }

            const adminJob_list = await AdminJobModel.find({}, "_id job");
            if (adminJob_list && adminJob_list.length > 0) {
                for (const item of adminJob_list) {
                    // must use `${ObjectId}` to convert ObjectId to string value to be used as map key
                    validJobMap.set(`${item.job}`, 1);
                }
            }

            // logger.debug(`validJobMap.size: ${validJobMap.size}`);
            // validJobMap.forEach(function(value, key) {
            //     logger.debug((key + " = " + value));
            // });

            const input_list = [];
            for (const item of item_list) {
                // must use `${ObjectId}` to convert ObjectId to string value to be used as map key
                const hasKey = validJobMap.has(`${item._id}`);

                // create as adminJob if not belonging to existing OfflineJob or AdminJob
                if (!hasKey) {
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
