import mongoose from "mongoose";

const Schema = mongoose.Schema;

// Status
export const STATUS_ACTIVE = "A";
export const STATUS_DELETED = "D";

export interface IAdminJob extends mongoose.Document {
  title: string;
  employerName: string;
  publishStart: Date;
  publishEnd: Date;
  job: any;
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
    job: { type: Schema.Types.ObjectId, ref: "Job" },
    status: { type: String, required: true, default: "A" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const AdminJobModel = mongoose.model<IAdminJob>("AdminJob", AdminJobSchema);
export default AdminJobModel;
