import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { add, format } from "date-fns";
import config from "../config.js";

function parseDuration(durationStr) {
  const result = { days: 0, months: 0, years: 0 };
  const regex = /(\d+)([dwmy])/gi;
  let match;

  while ((match = regex.exec(durationStr)) !== null) {
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    if (unit === "d") result.days += value;
    else if (unit === "w") result.days += value * 7;
    else if (unit === "m") result.months += value;
    else if (unit === "y") result.years += value;
  }

  return result;
}

async function fetchImageAsBase64(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const base64String = Buffer.from(arrayBuffer).toString("base64");
  const mime = blob.type;
  return `data:${mime};base64,${base64String}`;
}

export default async function createInvoice({
  qrData,
  orgName,
  orgEmail,
  duration,
  invoiceId,
  customerName,
  customerEmail,
  currency = "INR",
  products, // [{ name, price, quantity, description }]
  showTax = config.PTERODACTYL_PANEL.showTax,
  taxRate = config.PTERODACTYL_PANEL.taxRate,
  paid = false,
}) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 50;
  const lineHeight = 18;
  const fontSize = 12;

  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // QR Code
  const qrImageBase64 = await QRCode.toDataURL(qrData);
  const qrImageBytes = Uint8Array.from(
    Buffer.from(qrImageBase64.split(",")[1], "base64")
  );
  const qrImage = await pdfDoc.embedPng(qrImageBytes);
  const qrSize = 100;

  page.drawImage(qrImage, {
    x: pageWidth - qrSize - margin,
    y: y - qrSize + 20,
    width: qrSize,
    height: qrSize,
  });

  // Logo
  // if (config.PTERODACTYL_PANEL.orgLogo) {
  //   try {
  //     const logoBase64 = await fetchImageAsBase64(
  //       config.PTERODACTYL_PANEL.orgLogo
  //     );
  //     const logoImageBytes = Uint8Array.from(
  //       Buffer.from(logoBase64.split(",")[1], "base64")
  //     );
  //     const logoImage = await pdfDoc.embedPng(logoImageBytes);
  //     page.drawImage(logoImage, {
  //       x: margin,
  //       y: y - 40,
  //       width: 100,
  //       height: 30,
  //     });
  //   } catch {
  //     console.warn("Failed to load logo.");
  //   }
  // }

  // Header
  page.drawText(orgName, {
    x: margin,
    y,
    size: 18,
    font: bold,
    color: rgb(0, 0, 0.6),
  });

  y -= lineHeight;
  page.drawText(`Email: ${orgEmail}`, {
    x: margin,
    y,
    size: fontSize,
    font,
  });
  y -= lineHeight;
  page.drawText(`Invoice Date: ${format(new Date(), "dd/MM/yyyy")}`, {
    x: margin,
    y,
    size: fontSize,
    font,
  });
  y -= lineHeight * 4;
  const today = new Date();
  const due = add(today, parseDuration(duration));
  const formattedToday = format(today, "dd/MM/yyyy");
  const dueDate = format(due, "dd/MM/yyyy");

  page.drawText(`INVOICE ID: ${invoiceId.split("-")[0]}`, {
    x: pageWidth - 180,
    y,
    size: fontSize,
    font,
  });
  y -= lineHeight;
  page.drawText(`Due Date: ${dueDate}`, {
    x: pageWidth - 180,
    y,
    size: fontSize,
    font,
  });

  y -= lineHeight * 2;

  // Bill To
  page.drawText("Bill To:", { x: margin, y, size: fontSize, font: bold });
  y -= lineHeight;
  page.drawText(customerName, { x: margin, y, size: fontSize, font });
  y -= lineHeight;
  page.drawText(`Email: ${customerEmail}`, {
    x: margin,
    y,
    size: fontSize,
    font,
  });
  y -= lineHeight;

  // Table Header
  const colX = [margin, 200, 360, pageWidth - 140];
  y -= 10;
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1,
  });
  y -= lineHeight;

  page.drawText("Product", { x: colX[0], y, size: fontSize, font: bold });
  // page.drawText("Description", { x: colX[1], y, size: fontSize, font: bold });
  page.drawText("Qty", { x: colX[2], y, size: fontSize, font: bold });
  page.drawText("Price", { x: colX[3], y, size: fontSize, font: bold });

  y -= 5;
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1,
  });
  y -= lineHeight;

  let subtotal = 0;
  for (const { name, description = null, quantity = 1, price } of products) {
    const total = price * quantity;
    subtotal += total;

    page.drawText(name, { x: colX[0], y, size: fontSize, font });
    // page.drawText(description, { x: colX[1], y, size: fontSize, font });
    page.drawText(quantity.toString(), { x: colX[2], y, size: fontSize, font });
    page.drawText(`${currency}${total.toFixed(2)}`, {
      x: colX[3],
      y,
      size: fontSize,
      font,
    });
    y -= lineHeight;
  }

  y -= 10;
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1,
  });
  y -= lineHeight;

  const taxAmount = showTax ? subtotal * taxRate : 0;
  const grandTotal = subtotal + taxAmount;

  if (showTax) {
    page.drawText(`Tax (${taxRate * 100}%)`, {
      x: colX[2],
      y,
      size: fontSize,
      font,
    });
    page.drawText(`${currency}${taxAmount.toFixed(2)}`, {
      x: colX[3],
      y,
      size: fontSize,
      font,
    });
    y -= lineHeight;
  }

  page.drawText("Total", {
    x: colX[2],
    y,
    size: fontSize + 1,
    font: bold,
    color: rgb(0, 0, 0.8),
  });
  page.drawText(`${currency}${grandTotal.toFixed(2)}`, {
    x: colX[3],
    y,
    size: fontSize + 1,
    font: bold,
    color: rgb(0, 0, 0.8),
  });

  y -= lineHeight * 2;

  // Watermark
  const mark = paid ? "PAID" : "UNPAID";
  const color = paid ? rgb(0, 0.6, 0) : rgb(1, 0, 0);

  page.drawText(mark, {
    x: pageWidth / 2 - 60,
    y: pageHeight / 2,
    size: 50,
    font: bold,
    color,
    rotate: { type: "degrees", angle: 45 },
    opacity: 0.2,
  });

  // Footer
  page.drawText("Signed,", { x: margin, y, size: fontSize, font });
  page.drawText(orgName, { x: margin, y: y - 20, size: fontSize, font });
  page.drawText("Page 1 of 1", {
    x: pageWidth - 100,
    y: 30,
    size: 10,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await pdfDoc.save();
}
