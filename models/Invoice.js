import mongoose from "mongoose";

const productsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const invoice = mongoose.Schema(
  {
    invoiceId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: false,
    },
    customerName: {
      type: String,
      required: true,
    },
    customerEmail: {
      type: String,
      required: true,
    },
    orgName: {
      type: String,
      required: true,
    },
    orgEmail: {
      type: String,
      required: true,
    },
    qrData: {
      type: String,
      required: true,
    },
    products: {
      type: [productsSchema],
      required: false,
      default: [],
    },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  invoices: {
    type: [invoice],
    default: [],
    required: true,
  },
});

const Invoice =
  mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);

export default Invoice;
