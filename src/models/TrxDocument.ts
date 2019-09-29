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
  trxYear: number;
  seqNo: number;
  seqNoDisplay: string;
  creditTrx: any;
  billingName: string;
  billingAddress: string;
  docNoDisplay: string;
  status: string;
  createdBy: any;
  updatedBy: any;
}

const TrxDocumentSchema = new mongoose.Schema(
  {
    docType: String,
    trxYear: Number,
    seqNo: Number,
    creditTrx: { type: Schema.Types.ObjectId, ref: "credit-trx" },
    billingName: String,
    billingAddress: String,
    status: { type: String, required: true, default: "A" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

TrxDocumentSchema
  .virtual("seqNoDisplay")
  .get(function () {
    let result = "-";
    if (this.seqNo) {
      result = (this.seqNo as number).toString();
      result = result.padStart(3, "0");
    }
    return result;
  });

TrxDocumentSchema
  .virtual("docNoDisplay")
  .get(function () {
    return `${this.docType}-${this.trxYear}-${this.seqNoDisplay}`;
  });

const TrxDocumentModel = mongoose.model<ITrxDocument>("trx-document", TrxDocumentSchema);
export default TrxDocumentModel;
