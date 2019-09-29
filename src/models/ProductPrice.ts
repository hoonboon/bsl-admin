import mongoose from "mongoose";
import moment from "moment";
import numeral from "numeral";

const Schema = mongoose.Schema;

// Publish Indicator
export const PUBLISHIND_YES = "Y";
export const PUBLISHIND_NO = "N";

export interface IProductPrice extends mongoose.Document {
  product: any;
  currency: string;
  unitPrice: number;
  unitPriceDisplay: number;
  unitCreditValue: number;
  unitCreditValueDisplay: number;
  postingDays: number;
  fixedQty: number;
  effectiveDateStart: Date;
  effectiveDateStartDisplay?: string;
  effectiveDateStartInput?: string;
  effectiveDateEnd: Date;
  effectiveDateEndDisplay?: string;
  effectiveDateEndInput?: string;
  publishInd: string;
  priceDescription: string;
  status: string;
  createdBy: any;
  updatedBy: any;
}

const ProductPriceSchema = new mongoose.Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "product" },
    currency: String,
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

// Virtual for Date display
ProductPriceSchema
.virtual("effectiveDateStartDisplay")
.get(function () {
    return this.effectiveDateStart ? moment(this.effectiveDateStart).format("YYYY-MM-DD") : "?";
});

ProductPriceSchema
.virtual("effectiveDateEndDisplay")
.get(function () {
    return this.effectiveDateEnd ? moment(this.effectiveDateEnd).format("YYYY-MM-DD") : "?";
});

// Virtual for Date form input
ProductPriceSchema
.virtual("effectiveDateStartInput")
.get(function () {
  return this.effectiveDateStart ? moment(this.effectiveDateStart).format("YYYY-MM-DD") : "";
})
.set(function (value: string) {
  this.effectiveDateStart = moment(value + " 00:00 +0000", "YYYY-MM-DD HH:mm Z");
});

ProductPriceSchema
.virtual("effectiveDateEndInput")
.get(function () {
  return this.effectiveDateEnd ? moment(this.effectiveDateEnd).format("YYYY-MM-DD") : "";
})
.set(function (value: string) {
  this.effectiveDateEnd = moment(value + " 00:00 +0000", "YYYY-MM-DD HH:mm Z");
});

ProductPriceSchema
.virtual("unitPriceDisplay")
.get(function () {
  return this.unitPrice ? numeral(this.unitPrice).format("0,0.00") : "0.00";
});

ProductPriceSchema
.virtual("unitCreditValueDisplay")
.get(function () {
  return this.unitCreditValue ? numeral(this.unitCreditValue).format("0,0") : "0";
});

ProductPriceSchema
.virtual("priceDescription")
.get(function () {
  let result = "-";
  const instance = this as IProductPrice;
  if (instance.product) {
    result = `${instance.product.productDesc} @ ${instance.currency}${instance.unitPriceDisplay}`;
  }
  return result;
});

ProductPriceSchema
.virtual("creditValueDescription")
.get(function () {
  let result = "-";
  const instance = this as IProductPrice;
  if (instance.product) {
    result = `${instance.product.productDesc} @ ${instance.unitCreditValueDisplay} Credits`;
  }
  return result;
});

const ProductPriceModel = mongoose.model<IProductPrice>("product-price", ProductPriceSchema);
export default ProductPriceModel;
