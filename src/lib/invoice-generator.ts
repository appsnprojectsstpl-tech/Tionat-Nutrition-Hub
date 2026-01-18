import { jsPDF } from "jspdf";
import type { Order } from "@/lib/types";
import { format } from "date-fns";

export const generateInvoice = (order: Order) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // --- Header ---
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text("INVOICE", pageWidth - 20, 20, { align: "right" });

    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("Tionat Nutrition Hub", 20, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("123 Wellness Street, Health City", 20, 26);
    doc.text("GSTIN: 12AAAAA1234A1Z5", 20, 31);
    doc.text("support@tionat.com", 20, 36);

    // --- Invoice Details ---
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 45, pageWidth - 20, 45);

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Right Side: Status
    doc.text(`Invoice #: ${order.invoiceNumber || `INV-${order.id.slice(0, 8).toUpperCase()}`}`, pageWidth - 20, 55, { align: 'right' });
    doc.text(`Date: ${order.orderDate && (order.orderDate as any).toDate ? format((order.orderDate as any).toDate(), 'PPP') : 'N/A'}`, pageWidth - 20, 60, { align: 'right' });
    doc.text(`Status: ${order.status}`, pageWidth - 20, 65, { align: 'right' });

    // Left Side: Bill To
    doc.text("Bill To:", 20, 55);
    doc.setFont("helvetica", "bold");
    doc.text(order.shippingAddress?.name || "Customer", 20, 60);
    doc.setFont("helvetica", "normal");

    // Split address for wrapping
    const addressLines = doc.splitTextToSize(order.shippingAddress?.address || "", 80);
    doc.text(addressLines, 20, 65);

    const cityLineY = 65 + (addressLines.length * 4);
    doc.text(`${order.shippingAddress?.city || ""}, ${order.shippingAddress?.pincode || ""}`, 20, cityLineY);
    doc.text(`Phone: ${order.shippingAddress?.phone || ""}`, 20, cityLineY + 5);

    // --- Table Header ---
    const tableTop = cityLineY + 15;
    doc.setFillColor(245, 245, 245);
    doc.rect(20, tableTop, pageWidth - 40, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.text("Item", 25, tableTop + 5);
    doc.text("Qty", pageWidth - 100, tableTop + 5, { align: "right" });
    doc.text("Price", pageWidth - 60, tableTop + 5, { align: "right" });
    doc.text("Total", pageWidth - 25, tableTop + 5, { align: "right" });

    // --- Table Body ---
    let y = tableTop + 14;
    doc.setFont("helvetica", "normal");

    if (order.orderItems) {
        order.orderItems.forEach((item) => {
            const nameLines = doc.splitTextToSize(item.name, 90);
            doc.text(nameLines, 25, y);

            doc.text(item.quantity.toString(), pageWidth - 100, y, { align: "right" });
            doc.text(item.price.toFixed(2), pageWidth - 60, y, { align: "right" });
            doc.text((item.quantity * item.price).toFixed(2), pageWidth - 25, y, { align: "right" });

            y += Math.max(nameLines.length * 5, 8);
        });
    }

    doc.line(20, y, pageWidth - 20, y);

    // --- Summary ---
    y += 5;
    const summaryX = pageWidth - 60;

    doc.text("Subtotal:", summaryX, y, { align: "right" });
    doc.text((order.totalAmount || 0).toFixed(2), pageWidth - 25, y, { align: "right" });
    y += 5;

    doc.text("Discount:", summaryX, y, { align: "right" });
    doc.text("0.00", pageWidth - 25, y, { align: "right" }); // Placeholder
    y += 5;

    // GST Calc (Approx 18%)
    const gstAmount = (order.totalAmount || 0) - ((order.totalAmount || 0) / 1.18);
    doc.text("GST (18% Included):", summaryX, y, { align: "right" });
    doc.text(gstAmount.toFixed(2), pageWidth - 25, y, { align: "right" });
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Total:", summaryX, y, { align: "right" });
    doc.text(`Rs. ${(order.totalAmount || 0).toFixed(2)}`, pageWidth - 25, y, { align: "right" });

    // --- Footer ---
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Thank you for choosing Tionat Nutrition Hub!", pageWidth / 2, 270, { align: "center" });
    doc.text("This is a computer-generated invoice and needs no signature.", pageWidth / 2, 275, { align: "center" });

    doc.save(`Invoice-${order.invoiceNumber || order.id}.pdf`);
};
