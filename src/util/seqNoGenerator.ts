import moment from "moment";

import { default as SequenceNoModel, ISequenceNo } from "../models/SequenceNo";
import { Logger } from "./logger";

const logger = new Logger("util.seqNoGenerator");

type SequenceNoConfig = {
    seqKey: string[];
    initialSeqNo: number;
};

export const SEQKEY_INVOICE = "invoice";

const sequenceSet: SequenceNoConfig[] = [
    // { seqKey: [SEQKEY_INVOICE, moment().year.toString()], initialSeqNo: 1000 },
];

// Initialize seqNo for all pre-defined seqKeys during startup
function initSequenceSet() {
    logger.debug("calling initSequenceSet()");
    sequenceSet.forEach(async seqConfig => {
        let seqNoDoc = await SequenceNoModel.findOne({ "seqKey": seqConfig.seqKey });
        if (!seqNoDoc) {
            seqNoDoc = new SequenceNoModel({ seqKey: seqConfig.seqKey, seqNo: seqConfig.initialSeqNo });
            await seqNoDoc.save();
        }
    });
}

initSequenceSet();

export async function getNextSeqNo(seqKey: string[], mongooseOpts: any, incStep?: number) {
    const incrementBy = incStep || 1;

    const updatedDoc = await SequenceNoModel.findOneAndUpdate(
        { "seqKey": seqKey },
        { $inc: { seqNo: incrementBy } },
        { upsert: true, ...mongooseOpts } );

    return updatedDoc.seqNo;
}
