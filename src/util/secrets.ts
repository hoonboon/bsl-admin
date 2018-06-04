import logger from "./logger";
import dotenv from "dotenv";
import fs from "fs";

if (fs.existsSync(".env")) {
    logger.debug("Using .env file to supply config environment variables");
    dotenv.config({ path: ".env" });
} else {
    logger.debug("Using .env.example file to supply config environment variables");
    dotenv.config({ path: ".env.example" });  // you can delete this after you create your own .env file!
}
export const ENVIRONMENT = process.env.NODE_ENV;
const prod = ENVIRONMENT === "production"; // Anything else is treated as 'dev'

export const SESSION_SECRET = process.env["SESSION_SECRET"];
export const MONGODB_URI = process.env["MONGODB_URI"];

if (!SESSION_SECRET) {
    logger.error("No client secret. Set SESSION_SECRET environment variable.");
    process.exit(1);
}

if (!MONGODB_URI) {
    logger.error("No mongo connection string. Set MONGODB_URI environment variable.");
    process.exit(1);
}

export const EMAIL_HOST = process.env["EMAIL_HOST"];
export const EMAIL_PORT = process.env["EMAIL_PORT"];
export const EMAIL_USER = process.env["EMAIL_USER"];
export const EMAIL_PASSWORD = process.env["EMAIL_PASSWORD"];

if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASSWORD) {
    logger.error("No SMTP configuration. Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD environment variables.");
    process.exit(1);
}
