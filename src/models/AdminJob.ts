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

export interface IAdminJob extends mongoose.Document {
  title: string;
  employerName: string;
  publishStart: Date;
  publishEnd: Date;
  job: any;
  publishInd: string;
  lastPublishDate: Date;
  status: string;
  createdBy: any;
  updatedBy: any;
}

const AdminJobSchema = new mongoose.Schema(
  {
    title: String,
    employerName: String,
    publishStart: Date,
    publishEnd: Date,
    job: { type: Schema.Types.ObjectId, ref: "job" },
    publishInd: { type: String, required: true, default: PUBIND_NEW },
    lastPublishDate: Date,
    status: { type: String, required: true, default: "A" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// pre-defined indexes
AdminJobSchema.index({ publishStart: 1 });

// Virtual for record's URL
AdminJobSchema.virtual("url")
  .get(function () {
    return "/adminJob/" + this._id;
  });

// Virtual for Date display
AdminJobSchema.virtual("publishStartDisplay")
  .get(function () {
    return this.publishStart ? moment(this.publishStart).format("YYYY-MM-DD") : "?";
  });

AdminJobSchema.virtual("publishEndDisplay")
  .get(function () {
    return this.publishEnd ? moment(this.publishEnd).format("YYYY-MM-DD") : "?";
  });

AdminJobSchema.virtual("lastPublishDateDisplay")
  .get(function () {
    return this.lastPublishDate ? moment(this.lastPublishDate).format("YYYY-MM-DD HH:mm") : "?";
  });

// Virtual for Date form input
AdminJobSchema.virtual("publishStartInput")
  .get(function () {
    return this.publishStart ? moment(this.publishStart).format("YYYY-MM-DD") : "";
  })
  .set(function (value: string) {
    this.publishStart = moment(value + " 00:00 +0000", "YYYY-MM-DD HH:mm Z");
  });

AdminJobSchema.virtual("publishEndInput")
  .get(function () {
    return this.publishEnd ? moment(this.publishEnd).format("YYYY-MM-DD") : "";
  })
  .set(function (value: string) {
    this.publishEnd = moment(value + " 00:00 +0000", "YYYY-MM-DD HH:mm Z");
  });

AdminJobSchema.virtual("statusDisplay")
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

AdminJobSchema.virtual("publishIndDisplay")
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

const AdminJobModel = mongoose.model<IAdminJob>("admin-job", AdminJobSchema);
export default AdminJobModel;
