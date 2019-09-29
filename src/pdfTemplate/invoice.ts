import numeral from "numeral";
import path from "path";

import { TemplateOptions } from "../util/pdfGenerator";

const PDF_TEMPLATE_PATH = "../../pdfTemplate/";

export const OPTIONS_INVOICE: TemplateOptions = {
    templatePath: path.resolve(__dirname, PDF_TEMPLATE_PATH + "invoice.pug"),
    stylePath: path.resolve(__dirname, PDF_TEMPLATE_PATH + "invoice.scss"),
    pdfOptions: {
        format: "A4",
        printBackground: true,
        margin: {
            top: "0.5in",
            bottom: "0.5in",
            left: "0.5in",
            right: "0.5in"
        },
    },
};

export interface IInvoiceLine {
    sn: number;
    itemCode: string;
    itemDesc: string;
    unitPrice: number;
    qty: number;
    totalPrice: number;
}

export class InvoiceLine implements IInvoiceLine {
    sn: number;
    itemCode: string;
    itemDesc: string;
    unitPrice: number;
    qty: number;
    totalPrice: number;

    constructor(srcObj: IInvoiceLine) {
        this.sn = srcObj.sn;
        this.itemCode = srcObj.itemCode;
        this.itemDesc = srcObj.itemDesc;
        this.unitPrice = srcObj.unitPrice;
        this.qty = srcObj.qty;
        this.totalPrice = srcObj.totalPrice;
    }

    get unitPriceDisplay() {
        return numeral(this.unitPrice).format("0,0.00");
    }

    get qtyDisplay() {
        return numeral(this.qty).format("0,0");
    }

    get totalPriceDisplay() {
        return numeral(this.totalPrice).format("0,0.00");
    }
}

export interface IInvoice {
    invoiceNo: string;
    invoiceDate: string;
    billTo: {
        name: string;
        address: string;
    };
    currency: string;
    amountDue: number;
    shippingFees?: number;
    totalAmountDue: number;
    roundingAmount: number;
    remarks?: string;
    paymentReference: string;
    lines: InvoiceLine[];
    printDate: string;
}

export class Invoice implements IInvoice {
    invoiceNo: string;
    invoiceDate: string;
    billTo: {
        name: string;
        address: string;
    };
    currency: string;
    amountDue: number;
    shippingFees?: number;
    totalAmountDue: number;
    roundingAmount: number;
    remarks?: string;
    paymentReference: string;
    lines: InvoiceLine[];
    printDate: string;

    constructor(srcObj: IInvoice) {
        this.invoiceNo = srcObj.invoiceNo;
        this.invoiceDate = srcObj.invoiceDate;
        this.billTo = srcObj.billTo;
        this.currency = srcObj.currency;
        this.amountDue = srcObj.amountDue;

        if (srcObj.shippingFees) {
            this.shippingFees = srcObj.shippingFees;
        }

        this.totalAmountDue = srcObj.totalAmountDue;
        this.roundingAmount = srcObj.roundingAmount;

        if (srcObj.remarks) {
            this.remarks = srcObj.remarks;
        }

        this.paymentReference = srcObj.paymentReference;
        this.lines = srcObj.lines;
        this.printDate = srcObj.printDate;
    }

    get amountDueDisplay() {
        return numeral(this.amountDue).format("0,0.00");
    }

    get shippingFeesDisplay() {
        return numeral(this.shippingFees).format("0,0.00");
    }

    get totalAmountDueDisplay() {
        return numeral(this.totalAmountDue).format("0,0.00");
    }

    get roundingAmountDisplay() {
        return numeral(this.roundingAmount).format("0,0.00");
    }

    get totalAmountDueAfterRounding() {
        return (this.totalAmountDue + this.roundingAmount);
    }

    get totalAmountDueAfterRoundingDisplay() {
        return numeral(this.totalAmountDue + this.roundingAmount).format("0,0.00");
    }

    get billToAddressDisplay () {
        return this.billTo.address ? this.billTo.address.replace(/\n/g, "<br/>") : "";
    }

    get paymentReferenceDisplay () {
        return this.paymentReference ? this.paymentReference.replace(/\n/g, "<br/>") : "";
    }
}
