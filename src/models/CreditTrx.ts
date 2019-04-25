import mongoose from "mongoose";

const Schema = mongoose.Schema;

// Transaction Type
export const TRXTYPE_CREDIT_TOPUP = "T";
export const TRXTYPE_CREDIT_REFUND = "R";
export const TRXTYPE_COMPLEMENTARY_CREDIT = "C";
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
  tryType: string;
  creditAccount: any;
  currency: string;
  product: any;
  productPrice: any;
  unitPrice: number;
  unitCredit: number;
  qty: number;
  totalAmount: number;
  totalCredit: number;
  totalAmountBeforeRounding: number;
  roundingAmount: number;
  totalAmountAfterRounding: number;
  paymentReference: string;
  totalCreditAvailable: number;
  status: string;
  createdBy: any;
  updatedBy: any;
}

const CreditTrxSchema = new mongoose.Schema(
  {
    trxDate: Date,
    tryType: String,
    creditAccount: { type: Schema.Types.ObjectId, ref: "CreditAccount" },
    currency: String,
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    productPrice: { type: Schema.Types.ObjectId, ref: "ProductPrice" },
    unitPrice: Number,
    unitCredit: Number,
    qty: Number,
    totalAmount: Number,
    totalCredit: Number,
    totalAmountBeforeRounding: Number,
    roundingAmount: Number,
    totalAmountAfterRounding: Number,
    paymentReference: String,
    totalCreditAvailable: Number,
    status: { type: String, required: true, default: "A" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const CreditTrxModel = mongoose.model<ICreditTrx>("CreditTrx", CreditTrxSchema);
export default CreditTrxModel;
