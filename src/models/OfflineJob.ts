import moment from "moment";
import mongoose from "mongoose";

const Schema = mongoose.Schema;

// Status
export const STATUS_PENDING = "P";
export const STATUS_ACTIVE = "A";
export const STATUS_DELETED = "D";

// Publish Indicator
export const PUBIND_NEW = "N";
export const PUBIND_PUBLISHED = "P";
export const PUBIND_UNPUBLISHED = "U";
export const PUBIND_REPUBLISHED = "R";

export interface IOfflineJob extends mongoose.Document {
  title: string;
  employerName: string;
  publishStart: Date;
  publishEnd: Date;
  job: any;
  recruiter: any;
  productPrice: any;
  creditTrx: any;
  publishInd: string;
  lastPublishDate: Date;
  status: string;
  createdBy: any;
  updatedBy: any;
}

const OfflineJobSchema = new mongoose.Schema(
  {
    title: String,
    employerName: String,
    publishStart: Date,
    publishEnd: Date,
    job: { type: Schema.Types.ObjectId, ref: "job" },
    recruiter: { type: Schema.Types.ObjectId, ref: "recruiter" },
    productPrice: { type: Schema.Types.ObjectId, ref: "product-price" },
    creditTrx: { type: Schema.Types.ObjectId, ref: "credit-trx" },
    publishInd: { type: String, required: true, default: PUBIND_NEW },
    lastPublishDate: Date,
    status: { type: String, required: true, default: STATUS_PENDING },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// pre-defined indexes
OfflineJobSchema.index({ recruiter: 1 });
OfflineJobSchema.index({ publishStart: 1 });

// Virtual for record's URL
OfflineJobSchema
  .virtual("url")
  .get(function () {
    return "/offlineJob/" + this._id;
  });

// Virtual for Date display
OfflineJobSchema
  .virtual("publishStartDisplay")
  .get(function () {
    return this.publishStart ? moment(this.publishStart).format("YYYY-MM-DD") : "?";
  });

OfflineJobSchema
  .virtual("publishEndDisplay")
  .get(function () {
    return this.publishEnd ? moment(this.publishEnd).format("YYYY-MM-DD") : "?";
  });

OfflineJobSchema
  .virtual("lastPublishDateDisplay")
  .get(function () {
    return this.lastPublishDate ? moment(this.lastPublishDate).format("YYYY-MM-DD HH:mm") : "?";
  });

// Virtual for Date form input
OfflineJobSchema
  .virtual("publishStartInput")
  .get(function () {
    return this.publishStart ? moment(this.publishStart).format("YYYY-MM-DD") : "";
  })
  .set(function (value: string) {
    this.publishStart = moment(value + " 00:00 +0000", "YYYY-MM-DD HH:mm Z");
  });

OfflineJobSchema
  .virtual("publishEndInput")
  .get(function () {
    return this.publishEnd ? moment(this.publishEnd).format("YYYY-MM-DD") : "";
  })
  .set(function (value: string) {
    this.publishEnd = moment(value + " 00:00 +0000", "YYYY-MM-DD HH:mm Z");
  });

OfflineJobSchema
  .virtual("statusDisplay")
  .get(function () {
    let result: string = this.status;
    if (result === STATUS_ACTIVE) {
      result = "Active";
    } else if (result === STATUS_DELETED) {
      result = "Deleted";
    } else if (result === STATUS_PENDING) {
      result = "Pending";
    }
    return result;
  });

OfflineJobSchema
  .virtual("publishIndDisplay")
  .get(function () {
    let result: string = this.publishInd;
    if (result === PUBIND_NEW) {
      result = "New";
    } else if (result === PUBIND_PUBLISHED) {
      result = "Published";
    } else if (result === PUBIND_UNPUBLISHED) {
      result = "Unpublished";
    } else if (result === PUBIND_REPUBLISHED) {
      result = "Republished";
    }
    return result;
  });

const OfflineJobModel = mongoose.model<IOfflineJob>("offline-job", OfflineJobSchema);
export default OfflineJobModel;
