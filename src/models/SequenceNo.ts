import mongoose from "mongoose";

const Schema = mongoose.Schema;

export interface ISequenceNo extends mongoose.Document {
  seqKey: string[];
  seqNo: number;
}

const SequenceNoSchema = new mongoose.Schema(
  {
    seqKey: { type: [String], required: true, default: ["TBD"] },
    seqNo: { type: Number, required: true, default: 0 },
  },
  { timestamps: false }
);

SequenceNoSchema.index({ "seqKey": 1 }, { "unique": true });

const SequenceNoModel = mongoose.model<ISequenceNo>("sequence-no", SequenceNoSchema);
export default SequenceNoModel;
