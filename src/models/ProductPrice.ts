import mongoose from "mongoose";

const Schema = mongoose.Schema;

// Publish Indicator
export const PUBLISHIND_YES = "Y";
export const PUBLISHIND_NO = "N";

export interface IProductPrice extends mongoose.Document {
  product: any;
  unitPrice: number;
  unitCreditValue: number;
  postingDays: number;
  fixedQty: number;
  effectiveDateStart: Date;
  effectiveDateEnd: Date;
  publishInd: string;
  status: string;
  createdBy: any;
  updatedBy: any;
}

const ProductPriceSchema = new mongoose.Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    unitPrice: Number,
    unitCreditValue: Number,
    postingDays: Number,
    fixedQty: Number,
    effectiveDateStart: Date,
    effectiveDateEnd: Date,
    publishInd: String,
    status: { type: String, required: true, default: "A" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const ProductPriceModel = mongoose.model<IProductPrice>("ProductPrice", ProductPriceSchema);
export default ProductPriceModel;
