import dotenv from "dotenv";

// Load environment variables from .env file, where API keys and passwords are configured
dotenv.config({ path: ".env" });

import { Logger } from "../util/logger";
import { getRoundedAmount } from "../util/roudingMechanism";
const logger = new Logger("local_test.roundingMechanism");

(() => {
    const numbers = [
        12.30, 12.31, 12.32, 12.33, 12.34, 12.35, 12.36, 12.37, 12.38, 12.39, 12.40,
        12.304, 12.314, 12.324, 12.334, 12.344, 12.354, 12.364, 12.374, 12.384, 12.394, 12.404,
        12.305, 12.315, 12.325, 12.335, 12.345, 12.355, 12.365, 12.375, 12.385, 12.395, 12.405,
    ];

    let numberRounded: number;
    for (const numberBeforeRound of numbers) {
        numberRounded = getRoundedAmount(numberBeforeRound);
        logger.debug(`beforeRound=${numberBeforeRound}, afterRound=${numberRounded}`);
    }

}) ();