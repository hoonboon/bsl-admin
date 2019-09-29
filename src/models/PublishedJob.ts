import mongoose from "mongoose";
import { Location } from "./Job";

const Schema = mongoose.Schema;

// Status
export const STATUS_ACTIVE = "A";
export const STATUS_DELETED = "D";

// Weight
export const WEIGHT_LOWEST = 10;
export const WEIGHT_LOW = 20;
export const WEIGHT_MEDIUM = 30;
export const WEIGHT_HIGH = 40;
export const WEIGHT_HIGHEST = 50;

export interface IPublishedJob extends mongoose.Document {
  title: string;
  employerName: string;
  publishStart: Date;
  publishEnd: Date;
  location: Location[];
  job: any;
  weight: number;
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
    weight: Number,
    status: { type: String, required: true, default: "A" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// pre-defined indexes
PublishedJobSchema.index({ job: 1 });
PublishedJobSchema.index({ publishStart: 1 });
PublishedJobSchema.index({ weight: 1 });

const PublishedJobModel = mongoose.model<IPublishedJob>("published-job", PublishedJobSchema);
export default PublishedJobModel;
