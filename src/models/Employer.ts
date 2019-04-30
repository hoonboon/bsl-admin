import mongoose from "mongoose";

import * as selectOption  from "../util/selectOption";

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
  url: string;
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

// pre-defined indexes
EmployerSchema.index({ recruiter: 1 });

// Virtual for record's URL
EmployerSchema
.virtual("url")
.get(function() {
  return "/employer/" + this._id;
});

EmployerSchema
.virtual("aboutDisplayShort")
.get(function () {
  let result: string = this.about;
  const MAX_LEN = 100;
  if (result && result.length > MAX_LEN) {
    result = result.substr(0, MAX_LEN) + "...";
  }
  return result ? result : "-";
});

EmployerSchema
.virtual("employeeSizeDisplay")
.get(function() {
  let result = "-";
  if (this.employeeSize) {
    if (selectOption.OPTIONS_EMPLOYEE_SIZE()) {
      const label = selectOption.getLabelByValue(this.employeeSize, selectOption.OPTIONS_EMPLOYEE_SIZE());
      if (label) {
        result = label;
      }
    }
  }
  return result;
});

const EmployerModel = mongoose.model<IEmployer>("Employer", EmployerSchema);
export default EmployerModel;
