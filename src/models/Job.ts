import mongoose from "mongoose";
import moment from "moment";
import { XmlEntities } from "html-entities";
import * as selectOption  from "../util/selectOption";

const Schema = mongoose.Schema;

export const POSTTYPE_NORMAL = "NORMAL";
export const POSTTYPE_FB = "FB";

export type JobModel = mongoose.Document & {
  title: string,
  titleDecoded: string,
  description: string,
  descriptionDisplay: string,
  employerName: string,
  applyMethod: string,
  applyMethodDisplay: string,
  salary: string,
  location: string[],
  closing: string,
  publishStart: Date,
  publishEnd: Date,
  weight: number,
  tag: string[],
  customContent: string,
  status: string,
  createdBy: any,
  updatedBy: any,
  url: string,
  imgUrl: string,
  imgUrlDecoded: string,
  publishUrl: string,
  publishImgUrl: string,
  highlights: string,
  highlightsDecoded: string,
  apiModel: any,
  postType: string,
  fbPostUrl: string,
  fbPostUrlDecoded: string
};

const jobSchema = new mongoose.Schema({
  title: { type: String },
  description: String,
  employerName: { type: String },
  applyMethod: String,
  salary: String,
  location: [String],
  closing: { type: String },
  publishStart: Date,
  publishEnd: Date,
  weight: { type: Number, default: 5 },
  tag: [String],
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
    const imgUrl = this.imgUrlDecoded || baseUrl + "/images/fbProfilePhoto2.jpg";
    return imgUrl;
});

// Virtual for Job's highlights
jobSchema
.virtual("highlights")
.get(function() {
    let result = "Majikan: " + this.employerName;
    if (this.location && this.location.length > 0) {
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
        employerName: this.employerName,
        applyMethod: this.applyMethod,
        salary: this.salary,
        location: this.locationDisplay,
        closing: this.closing,
        customContent: this.customContent,
        highlights: this.highlights,
        publishImgUrl: this.publishImgUrl
    };
    return result;
});

// Virtual for Job's Locations for display
jobSchema
.virtual("locationDisplay")
.get(function() {
    let result = "-";
    if (this.location && this.location.length > 0) {
        result = selectOption.getFlattenedLabelsByValues(this.location, selectOption.OPTIONS_LOCATION());
    }
    return result;
});

// Virtual for Description for display
jobSchema
.virtual("descriptionDisplay")
.get(function () {
    return this.description ? this.description.replace(/\n/g, "<br/>") : "";
});

// Virtual for Apply Method for display
jobSchema
.virtual("applyMethodDisplay")
.get(function () {
    return this.applyMethod ? this.applyMethod.replace(/\n/g, "<br/>") : "";
});

// Virtual for Job's Title for social sharing data exchange
jobSchema
.virtual("titleDecoded")
.get(function() {
    const entities = new XmlEntities();
    return this.title ?  entities.decode(this.title) : "" ;
});

// Virtual for Job's highlights for social sharing data exchange
jobSchema
.virtual("highlightsDecoded")
.get(function() {
    const entities = new XmlEntities();
    return this.highlights ?  entities.decode(this.highlights) : "" ;
});

// Virtual for Job's image Url for social sharing data exchange
jobSchema
.virtual("imgUrlDecoded")
.get(function() {
    const entities = new XmlEntities();
    return this.imgUrl ?  entities.decode(this.imgUrl) : "" ;
});

// Virtual for Job's Facebook Post Url for social sharing data exchange
jobSchema
.virtual("fbPostUrlDecoded")
.get(function() {
    const entities = new XmlEntities();
    return this.fbPostUrl ?  entities.decode(this.fbPostUrl) : "" ;
});

const Job = mongoose.model("Job", jobSchema);
export default Job;
