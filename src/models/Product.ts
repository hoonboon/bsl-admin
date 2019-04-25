import mongoose from "mongoose";

const Schema = mongoose.Schema;

// Product Types
export const PRODTYPE_CREDIT_TOPUP = "T";
export const PRODTYPE_COMPLIMENTARY_CREDIT = "C";
export const PRODTYPE_CREDIT_UTILIZATION = "U";
export const PRODTYPE_CREDIT_EXPIRY = "E";

// Publish Indicator
export const PUBLISHIND_YES = "Y";
export const PUBLISHIND_NO = "N";

export interface IProduct extends mongoose.Document {
  productCode: string;
  productDesc: string;
  productType: string;
  publishInd: string;
  status: string;
  createdBy: any;
  updatedBy: any;
}

const ProductSchema = new mongoose.Schema(
  {
    productCode: { type: String },
    productDesc: String,
    productType: { type: String },
    publishInd: String,
    status: { type: String, required: true, default: "A" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const ProductModel = mongoose.model<IProduct>("Product", ProductSchema);
export default ProductModel;
