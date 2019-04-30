import mongoose from "mongoose";
import moment from "moment";

const Schema = mongoose.Schema;

type BillTo = {
  name: string;
  address: string;
};

// Status
export const STATUS_ACTIVE = "A";
export const STATUS_DELETED = "D";
export const STATUS_TERMINATED = "T";

export interface IRecruiter extends mongoose.Document {
  name: string;
  nric: string;
  email: string;
  mobileNo: string;
  nationality: string;
  race: string;
  language: string;
  dob: Date;
  dobDisplay?: string;
  dobInput?: string;
  gender: string;
  billTo: BillTo;
  url: string;
  status?: string;
  createdBy?: any;
  updatedBy?: any;
}

const RecruiterSchema = new mongoose.Schema(
  {
    name: String,
    nric: String,
    email: String,
    mobileNo: String,
    nationality: String,
    race: String,
    language: String,
    dob: Date,
    gender: String,
    billTo: {
      name: String,
      address: String,
    },
    status: { type: String, required: true, default: "A" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Pre-defined indexes
RecruiterSchema.index({ email: 1 });

// Virtual for recrord's URL
RecruiterSchema
.virtual("url")
.get(function() {
    return "/recruiter/" + this._id;
});

// Virtual for Date display
RecruiterSchema
.virtual("dobDisplay")
.get(function () {
    return this.dob ? moment(this.dob).format("YYYY-MM-DD") : "?";
});

// Virtual for Date form input
RecruiterSchema
.virtual("dobInput")
.get(function () {
    return this.dob ? moment(this.dob).format("YYYY-MM-DD") : "";
});

const RecruiterModel = mongoose.model<IRecruiter>("Recruiter", RecruiterSchema);
export default RecruiterModel;
