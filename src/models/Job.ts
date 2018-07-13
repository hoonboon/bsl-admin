import mongoose from "mongoose";
import moment from "moment";
import * as selectOption  from "../util/selectOption";

const Schema = mongoose.Schema;

export const POSTTYPE_NORMAL = "NORMAL";
export const POSTTYPE_FB = "FB";

export type JobModel = mongoose.Document & {
  title: string,
  description: string,
  employer: {
    name: string,
    contact: string
  },
  salary: string,
  empType: string[],
  language: string[],
  location: string[],
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
  url: string,
  imgUrl: string,
  publishUrl: string,
  publishImgUrl: string,
  highlights: string,
  apiModel: any,
  postType: string,
  fbPostUrl: string
};

const jobSchema = new mongoose.Schema({
  title: { type: String, uppercase: true },
  description: String,
  employer: {
    name: { type: String, uppercase: true },
    contact: { type: String, uppercase: true },
  },
  salary: String,
  empType: [String],
  language: [String],
  location: [String],
  closing: { type: String, uppercase: true },
  publishStart: Date,
  publishEnd: Date,
  weight: { type: Number, default: 5 },
  tag: [String],
  otherInfo: String,
  imgUrl: String,
  customContent: String,
  status: { type: String, required: true, default: "A" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  postType: { type: String, required: true },
  fbPostUrl: String,
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

// Virtual for Job's URL
jobSchema
.virtual("url")
.get(function() {
    return "/job/" + this._id;
});

// Virtual for Job's Published URL on public site
jobSchema
.virtual("publishUrl")
.get(function() {
    const baseUrl = process.env.PUBLIC_SITE || "";
    return baseUrl + "/job/" + this._id;
});

// Virtual for Job's Published Image URL on public site
jobSchema
.virtual("publishImgUrl")
.get(function() {
    const baseUrl = process.env.PUBLIC_SITE || "";
    const imgUrl = this.imgUrl || baseUrl + "/images/fbProfilePhoto2.jpg";
    return imgUrl;
});

// Virtual for Job's highlights
jobSchema
.virtual("highlights")
.get(function() {
    let result = "Majikan: " + this.employer.name;
    if (this.location) {
        result += ", Tempat Kerja: " + this.locationDisplay;
    }
    result += ", Tarik Tutup: " + this.closing;
    return result;
});

// Virtual for Job's model returned to API call
jobSchema
.virtual("apiModel")
.get(function() {
    const result = {
        _id: this._id,
        title: this.title,
        description: this.description,
        employer: {
            name: this.employer.name,
            contact: this.employer.contact
        },
        salary: this.salary,
        empType: this.empTypeDisplay,
        language: this.languageDisplay,
        location: this.locationDisplay,
        closing: this.closing,
        otherInfo: this.otherInfo,
        customContent: this.customContent,
        highlights: this.highlights,
        publishImgUrl: this.publishImgUrl
    };
    return result;
});

// Virtual for Job's EmpType for display
jobSchema
.virtual("empTypeDisplay")
.get(function() {
    let result = "";
    if (this.empType && this.empType.length > 0) {
        result = selectOption.getFlattenedLabelsByValues(this.empType, selectOption.OPTIONS_EMPTYPE());
    }
    return result;
});

// Virtual for Job's language for display
jobSchema
.virtual("languageDisplay")
.get(function() {
    let result = "";
    if (this.language && this.language.length > 0) {
        result = selectOption.getFlattenedLabelsByValues(this.language, selectOption.OPTIONS_LANGUAGE());
    }
    return result;
});

// Virtual for Job's Locations for display
jobSchema
.virtual("locationDisplay")
.get(function() {
    let result = "";
    if (this.location && this.location.length > 0) {
        result = selectOption.getFlattenedLabelsByValues(this.location, selectOption.OPTIONS_LOCATION());
    }
    return result;
});

const Job = mongoose.model("Job", jobSchema);
export default Job;
