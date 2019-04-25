import mongoose from "mongoose";

const Schema = mongoose.Schema;

// Status
export const STATUS_ACTIVE = "A";
export const STATUS_DELETED = "D";

export interface IOfflineJob extends mongoose.Document {
  title: string;
  employerName: string;
  publishStart: Date;
  publishEnd: Date;
  job: any;
  recruiter: any;
  creditTrx: any;
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
    job: { type: Schema.Types.ObjectId, ref: "Job" },
    recruiter: { type: Schema.Types.ObjectId, ref: "Recruiter" },
    creditTrx: { type: Schema.Types.ObjectId, ref: "CreditTrx" },
    status: { type: String, required: true, default: "A" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const OfflineJobModel = mongoose.model<IOfflineJob>("OfflineJob", OfflineJobSchema);
export default OfflineJobModel;
