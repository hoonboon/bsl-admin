import mongoose from "mongoose";
import moment from "moment";

const Schema = mongoose.Schema;

export type JobModel = mongoose.Document & {
  title: string,
  description: string,
  employer: {
    name: string,
    contact: string
  },
  salary: string,
  empType: string,
  language: string,
  location: string,
  closing: string,
  publishStart: Date,
  publishEnd: Date,
  weight: number,
  tag: string[],
  otherInfo: string,
  customContent: string,
  status: string,
  createdBy: any,
  updatedBy: any,
  url: string
};

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, uppercase: true },
  description: { type: String, required: true },
  employer: {
    name: { type: String, required: true, uppercase: true },
    contact: { type: String, required: true, uppercase: true },
  },
  salary: String,
  empType: String,
  language: String,
  location: String,
  closing: { type: String, required: true, uppercase: true },
  publishStart: Date,
  publishEnd: Date,
  weight: { type: Number, default: 5 },
  tag: [String],
  otherInfo: String,
  customContent: String,
  status: { type: String, required: true, default: "A" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

// Virtual for Publish Start Date for display
jobSchema
.virtual("publishStartDisplay")
.get(function () {
    return this.publishStart ? moment(this.publishStart).format("YYYY-MM-DD") : "?";
});

// Virtual for Publish End Date for display
jobSchema
.virtual("publishEndDisplay")
.get(function () {
    return this.publishEnd ? moment(this.publishEnd).format("YYYY-MM-DD") : "?";
});

// Virtual for Publish Start Date for form input
jobSchema
.virtual("publishStartInput")
.get(function () {
    return this.publishStart ? moment(this.publishStart).format("YYYY-MM-DD") : "";
});

// Virtual for Publish End Date for form input
jobSchema
.virtual("publishEndInput")
.get(function () {
    return this.publishEnd ? moment(this.publishEnd).format("YYYY-MM-DD") : "";
});

// Virtual for Job 's URL
jobSchema
.virtual("url")
.get(function() {
    return "/job/" + this._id;
});

const Job = mongoose.model("Job", jobSchema);
export default Job;
