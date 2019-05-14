import mongoose from "mongoose";
import moment from "moment";

const Schema = mongoose.Schema;

// Status
export const STATUS_ACTIVE = "A";
export const STATUS_EXPIRED = "E";
export const STATUS_TERMINATED = "T";
export const STATUS_DELETED = "D";

export interface ICreditAccount extends mongoose.Document {
  recruiter: any;
  validDateStart: Date;
  validDateStartDisplay?: string;
  validDateStartInput?: string;
  validDateEnd: Date;
  validDateEndDisplay?: string;
  validDateEndInput?: string;
  creditBalance: number;
  creditLocked: number;
  creditAvailable: number;
  lastTrxDate: Date;
  lastTrxDateDisplay?: string;
  status: string;
  statusDisplay: string;
  url: string;
  createdBy: any;
  updatedBy: any;
}

const CreditAccountSchema = new mongoose.Schema(
  {
    recruiter: { type: Schema.Types.ObjectId, ref: "recruiter" },
    validDateStart: Date,
    validDateEnd: Date,
    creditBalance: Number,
    creditLocked: Number,
    lastTrxDate: Date,
    status: { type: String, required: true, default: "A" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// pre-defined indexes
CreditAccountSchema.index({ recruiter: 1 });

// Virtual for record's URL
CreditAccountSchema
  .virtual("url")
  .get(function () {
    return "/creditAccount/" + this._id;
  });

// Virtual for Date display
CreditAccountSchema
  .virtual("validDateStartDisplay")
  .get(function () {
    return this.validDateStart ? moment(this.validDateStart).format("YYYY-MM-DD") : "?";
  });

CreditAccountSchema
  .virtual("validDateEndDisplay")
  .get(function () {
    return this.validDateEnd ? moment(this.validDateEnd).format("YYYY-MM-DD") : "?";
  });

CreditAccountSchema
  .virtual("lastTrxDateDisplay")
  .get(function () {
    return this.lastTrxDate ? moment(this.lastTrxDate).format("YYYY-MM-DD") : "?";
  });

// Virtual for Date form input
CreditAccountSchema
  .virtual("validDateStartInput")
  .get(function () {
    return this.validDateStart ? moment(this.validDateStart).format("YYYY-MM-DD") : "";
  })
  .set(function (value: string) {
    this.validDateStart = moment(value + " 00:00 +0000", "YYYY-MM-DD HH:mm Z");
  });

CreditAccountSchema
  .virtual("validDateEndInput")
  .get(function () {
    return this.validDateEnd ? moment(this.validDateEnd).format("YYYY-MM-DD") : "";
  })
  .set(function (value: string) {
    this.validDateEnd = moment(value + " 00:00 +0000", "YYYY-MM-DD HH:mm Z");
  });

CreditAccountSchema
  .virtual("creditAvailable")
  .get(function () {
    const bal: number = this.creditBalance || 0.0;
    const locked: number = this.creditLocked || 0.0;
    return (bal - locked);
  });

CreditAccountSchema
  .virtual("statusDisplay")
  .get(function () {
    let result: string = this.status;
    if (result === STATUS_ACTIVE) {
      result = "Active";
    } else if (result === STATUS_EXPIRED) {
      result = "Expired";
    } else if (result === STATUS_TERMINATED) {
      result = "Terminated";
    }
    return result;
  });

const CreditAccountModel = mongoose.model<ICreditAccount>("credit-account", CreditAccountSchema);
export default CreditAccountModel;
