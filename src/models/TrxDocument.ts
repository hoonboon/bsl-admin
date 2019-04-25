import mongoose from "mongoose";

const Schema = mongoose.Schema;

// Document Type
export const DOCTYPE_INVOICE = "INV";
export const DOCTYPE_CREDIT_NOTE = "CN";

// Status
export const STATUS_ACTIVE = "A";
export const STATUS_DELETED = "D";

export interface ITrxDocument extends mongoose.Document {
  docType: string;
  seqNo: number;
  creditTrx: any;
  billingName: string;
  billingAddress: string;
  status: string;
  createdBy: any;
  updatedBy: any;
}

const TrxDocumentSchema = new mongoose.Schema(
  {
    docType: String,
    seqNo: Number,
    creditTrx: { type: Schema.Types.ObjectId, ref: "CreditTrx" },
    billingName: String,
    billingAddress: String,
    status: { type: String, required: true, default: "A" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const TrxDocumentModel = mongoose.model<ITrxDocument>("TrxDocument", TrxDocumentSchema);
export default TrxDocumentModel;
