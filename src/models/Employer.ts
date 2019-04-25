import mongoose from "mongoose";

const Schema = mongoose.Schema;

// Employee Size
export const EMPLOYEESIZE_5 = "5";
export const EMPLOYEESIZE_20 = "20";
export const EMPLOYEESIZE_50 = "50";
export const EMPLOYEESIZE_999 = "999";

// Status
export const STATUS_ACTIVE = "A";
export const STATUS_DELETED = "D";

export interface IEmployer extends mongoose.Document {
  recruiter: any;
  name: string;
  about: string;
  employeeSize: string;
  contact: string;
  status: string;
  createdBy: any;
  updatedBy: any;
}

const EmployerSchema = new mongoose.Schema(
  {
    recruiter: { type: Schema.Types.ObjectId, ref: "Recruiter" },
    name: String,
    about: String,
    employeeSize: String,
    contact: String,
    status: { type: String, required: true, default: "A" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const EmployerModel = mongoose.model<IEmployer>("Employer", EmployerSchema);
export default EmployerModel;
