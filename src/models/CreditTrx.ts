import mongoose from "mongoose";
import moment from "moment";

const Schema = mongoose.Schema;

// Transaction Type
export const TRXTYPE_CREDIT_TOPUP = "T";
export const TRXTYPE_CREDIT_REFUND = "R";
export const TRXTYPE_COMPLIMENTARY_CREDIT = "C";
export const TRXTYPE_CREDIT_UTILIZATION = "U";
export const TRXTYPE_CREDIT_EXPIRED = "E";

// Payment Method
export const PAYMTHD_MANUAL = "M";
export const PAYMTHD_AVAILABLE_BALANCE = "B";

// Status
export const STATUS_ACTIVE = "A";
export const STATUS_PENDING = "P";
export const STATUS_DELETED = "D";

export interface ICreditTrx extends mongoose.Document {
  trxDate: Date;
  trxDateDisplay?: string;
  trxType: string;
  trxTypeDisplay?: string;
  creditAccount: any;
  currency: string;
  product: any;
  productPrice: any;
  unitPrice: number;
  unitCredit: number;
  qty: number;
  totalAmount: number;
  totalCredit: number;
  roundingAmount: number;
  paymentReference: string;
  totalCreditAvailable: number;
  totalAmountAfterRounding: number;
  trxDocument: any;
  status: string;
  createdBy: any;
  updatedBy: any;
}

const CreditTrxSchema = new mongoose.Schema(
  {
    trxDate: Date,
    trxType: String,
    creditAccount: { type: Schema.Types.ObjectId, ref: "credit-account" },
    currency: String,
    product: { type: Schema.Types.ObjectId, ref: "product" },
    productPrice: { type: Schema.Types.ObjectId, ref: "product-price" },
    unitPrice: Number,
    unitCredit: Number,
    qty: Number,
    totalAmount: Number,
    totalCredit: Number,
    roundingAmount: Number,
    paymentReference: String,
    totalCreditAvailable: Number,
    trxDocument: { type: Schema.Types.ObjectId, ref: "trx-document" },
    status: { type: String, required: true, default: "A" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Virtual for Date display
CreditTrxSchema
.virtual("trxDateDisplay")
.get(function () {
    return this.trxDate ? moment(this.trxDate).format("YYYY-MM-DD") : "?";
});

CreditTrxSchema
  .virtual("totalAmountAfterRounding")
  .get(function () {
    const totalAmountBeforeRounding: number = this.totalAmount || 0.00;
    const roundingAmount: number = this.roundingAmount || 0.00;
    return (totalAmountBeforeRounding + roundingAmount);
  });

  CreditTrxSchema
  .virtual("trxTypeDisplay")
  .get(function () {
    let result: string = this.trxType;
    if (result === TRXTYPE_CREDIT_TOPUP) {
      result = "Credit Top-up";
    } else if (result === TRXTYPE_CREDIT_REFUND) {
      result = "Credit Refund";
    } else if (result === TRXTYPE_COMPLIMENTARY_CREDIT) {
      result = "Free Credit";
    } else if (result === TRXTYPE_CREDIT_UTILIZATION) {
      result = "Credit Utilization";
    } else if (result === TRXTYPE_CREDIT_EXPIRED) {
      result = "Credit Expired";
    }
    return result;
  });

const CreditTrxModel = mongoose.model<ICreditTrx>("credit-trx", CreditTrxSchema);
export default CreditTrxModel;
