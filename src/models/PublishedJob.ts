import mongoose from "mongoose";
import { Location } from "./Job";

const Schema = mongoose.Schema;

// Status
export const STATUS_ACTIVE = "A";
export const STATUS_DELETED = "D";

export interface IPublishedJob extends mongoose.Document {
  title: string;
  employerName: string;
  publishStart: Date;
  publishEnd: Date;
  location: Location[];
  job: any;
  status: string;
  createdBy: any;
  updatedBy: any;
}

const PublishedJobSchema = new mongoose.Schema(
  {
    title: String,
    employerName: String,
    publishStart: Date,
    publishEnd: Date,
    location: [{
        code: String,
        area: String,
    }],
    job: { type: Schema.Types.ObjectId, ref: "job" },
    status: { type: String, required: true, default: "A" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// pre-defined indexes
PublishedJobSchema.index({ job: 1 });

const PublishedJobModel = mongoose.model<IPublishedJob>("published-job", PublishedJobSchema);
export default PublishedJobModel;
