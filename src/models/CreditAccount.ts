import mongoose from "mongoose";

const Schema = mongoose.Schema;

// Status
export const STATUS_ACTIVE = "A";
export const STATUS_EXPIRED = "E";
export const STATUS_TERMINATED = "T";

export interface ICreditAccount extends mongoose.Document {
  recruiter: any;
  validDateStart: Date;
  validDateEnd: Date;
  creditBalance: number;
  creditLocked: number;
  creditAvailable: number;
  lastTrxDate: Date;
  status: string;
  createdBy: any;
  updatedBy: any;
}

const CreditAccountSchema = new mongoose.Schema(
  {
    recruiter: { type: Schema.Types.ObjectId, ref: "Recruiter" },
    validDateStart: Date,
    validDateEnd: Date,
    creditBalance: Number,
    creditLocked: Number,
    creditAvailable: Number,
    lastTrxDate: Date,
    status: { type: String, required: true, default: "A" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const CreditAccountModel = mongoose.model<ICreditAccount>("CreditAccount", CreditAccountSchema);
export default CreditAccountModel;
