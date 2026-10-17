import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supplyRequestId = Number(id);

    if (Number.isNaN(supplyRequestId)) {
      return new Response("Invalid Supply Request ID", { status: 400 });
    }

    // =========================================================
    // FETCH SUPPLY REQUEST + ITEMS
    // =========================================================

    const supplyRequest = await prisma.supplyRequest.findUnique({
      where: {
        id: supplyRequestId,
      },
      include: {
        items: true,
      },
    });

    if (!supplyRequest) {
      return new Response("Supply request record not found", { status: 404 });
    }

    // =========================================================
    // CREATE PDF & FONTS
    // =========================================================

    const pdfDoc = await PDFDocument.create();

    const pageWidth = 595.28;
    const pageHeight = 841.89;

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // =========================================================
    // LOAD LOGO
    // =========================================================

    const logoPath = path.join(process.cwd(), "public", "sarpi-logo.png");

    if (!fs.existsSync(logoPath)) {
      return new Response("SARPI logo not found", { status: 500 });
    }

    const logoBytes = fs.readFileSync(logoPath);
    const logoImage = await pdfDoc.embedPng(logoBytes);

    // =========================================================
    // DATES & FORMATTING
    // =========================================================

    const requestDateStr = supplyRequest.requestDate
      ? new Date(supplyRequest.requestDate).toLocaleDateString("fr-FR")
      : "-";

    const deadlineStr = supplyRequest.desiredDeadline
      ? new Date(supplyRequest.desiredDeadline).toLocaleDateString("fr-FR")
      : "-";

    // =========================================================
    // PAGE / TABLE CONFIGURATION
    // =========================================================

    const tableX = 40;
    const tableWidth = pageWidth - 80;
    const rowHeight = 22;

    const colItem = 35;
    const colDesignation = 135;
    const colRef = 85;
    const colUnit = 60;
    const colQtyDemanded = 50;
    const colQtyGranted = 50;
    const colDelay =
      tableWidth -
      (colItem + colDesignation + colRef + colUnit + colQtyDemanded + colQtyGranted);

    const columns = [
      { title: "Item", x: tableX, width: colItem },
      { title: "Désignation", x: tableX + colItem, width: colDesignation },
      { title: "Référence / Code", x: tableX + colItem + colDesignation, width: colRef },
      { title: "Unité", x: tableX + colItem + colDesignation + colRef, width: colUnit },
      { title: "Qté Dem.", x: tableX + colItem + colDesignation + colRef + colUnit, width: colQtyDemanded },
      { title: "Qté Acc.", x: tableX + colItem + colDesignation + colRef + colUnit + colQtyDemanded, width: colQtyGranted },
      { title: "Délai souhaité", x: tableX + colItem + colDesignation + colRef + colUnit + colQtyDemanded + colQtyGranted, width: colDelay },
    ];

    // =========================================================
    // PAGINATION
    // =========================================================

    const itemsPerPage = 12;
    const totalItems = supplyRequest.items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    // =========================================================
    // GENERATE PAGES
    // =========================================================

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      const isLastPage = pageNumber === totalPages;

      // =======================================================
      // HEADER BOX
      // =======================================================

      const headerX = 40;
      const headerY = pageHeight - 110;
      const headerWidth = pageWidth - 80;
      const headerHeight = 75;

      page.drawRectangle({
        x: headerX,
        y: headerY,
        width: headerWidth,
        height: headerHeight,
        borderWidth: 0.5,
        borderColor: rgb(0, 0, 0),
      });

      // Header separator 1
      page.drawLine({
        start: { x: 130, y: headerY },
        end: { x: 130, y: headerY + headerHeight },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });

      // Header separator 2
      page.drawLine({
        start: { x: pageWidth - 150, y: headerY },
        end: { x: pageWidth - 150, y: headerY + headerHeight },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });

      // Logo
      page.drawImage(logoImage, {
        x: 50,
        y: headerY + 10,
        width: 55,
        height: 55,
      });

      // Title
      page.drawText("DEMANDE DE FOURNITURE LOCALE (DFL)", {
        x: 142,
        y: headerY + 35,
        size: 14,
        font: boldFont,
      });

      // Document info
      const docX = pageWidth - 140;

      page.drawText(" MOD-SMI-PS2-33 ", {
        x: docX,
        y: headerY + 55,
        size: 10,
        font: boldFont,
      });

      page.drawText("        Rev : 01     ", {
        x: docX,
        y: headerY + 40,
        size: 9,
        font,
      });

      page.drawText("   Du: 17/06/2026     ", {
        x: docX,
        y: headerY + 25,
        size: 9,
        font,
      });

          page.drawLine({
  start: {
    x: docX -10,
    y: headerY + 20,
  },
  end: {
    x: docX + 100,
    y: headerY + 20,
  },
  
  color: rgb(0, 0, 0),
});

      page.drawText(`     Page ${pageNumber} sur ${totalPages}`, {
        x: docX,
        y: headerY + 7,
        size: 9,
        font: boldFont,
      });

      let currentY = headerY - 25;

      // =======================================================
      // FIRST PAGE ONLY: METADATA & INFO BOXES
      // =======================================================

      if (pageNumber === 1) {
        page.drawRectangle({
          x: headerX,
          y: currentY - 75,
          width: headerWidth,
          height: 85,
          borderWidth: 0.5,
          borderColor: rgb(0, 0, 0),
        });

        page.drawText(`Structure Demanderesse  : IT`, {
          x: headerX + 8,
          y: currentY - 5,
          size: 9,
          font: boldFont,
        });

        page.drawText(`DR / Projet  : DRIA`, {
          x: headerX + 8,
          y: currentY - 20,
          size: 9,
        font: boldFont,
        });

         page.drawText(`Code du magasin:  : `, {
          x: headerX + 8,
          y: currentY - 35,
          size: 9,
          font: boldFont,
        });

         page.drawText(`n° de reference Planing travaux   : `, {
          x: headerX + 8,
          y: currentY - 50,
          size: 9,
          font: boldFont,
        });

          page.drawText(`N° : `, {
          x: headerX + 350,
          y: currentY -5,
          size: 9,
          font: boldFont,
        });

              page.drawLine({
  start: {
    x: headerX + 340,
    y: currentY - 10,
  },
  end: {
    x: headerX + headerWidth ,
    y: currentY - 10,
  },
  thickness: 0.5,
  color: rgb(0, 0, 0),
               });

        // iwant vertical lien here 

        page.drawLine({
  start: {
    x: headerX + 340,
    y: currentY +10,
  },
  end: {
    x: headerX + 340,
    y: currentY - 75,
  },
  thickness: 0.5,
  color: rgb(0, 0, 0),
});


        page.drawText(`Date  : ${requestDateStr}`, {
          x: headerX + 350,
          y: currentY - 25,
          size: 9,
          font: boldFont,
        });
        // i want herziantal lien here

        page.drawLine({
  start: {
    x: headerX + 340,
    y: currentY - 35,
  },
  end: {
    x: headerX + headerWidth ,
    y: currentY - 35,
  },
  thickness: 0.5,
  color: rgb(0, 0, 0),
});

        page.drawText(`Date De plan de mobilistaion : `, {
          x: headerX + 350,
          y: currentY - 50,
          size: 9,
          font: boldFont,
        });

        // i want herziantal lien here

        currentY -= 85;

        page.drawRectangle({
          x: headerX,
          y: currentY - 60,
          width: headerWidth,
          height: 70,
          borderWidth: 0.5,
          borderColor: rgb(0, 0, 0),
        });

        page.drawText(`But / destination de la fourniture : ${supplyRequest.purpose || "-"}`, {
          x: headerX + 8,
          y: currentY - 5,
          size: 9,
           font: boldFont,
        });

        currentY -= 40;
      } else {
        currentY -= 15;
      }

      // =======================================================
      // TABLE HEADER
      // =======================================================

      const tableHeaderHeight = rowHeight * 2;

      page.drawRectangle({
        x: tableX,
        y: currentY - tableHeaderHeight,
        width: tableWidth,
        height: tableHeaderHeight,
        borderWidth: 0.5,
        borderColor: rgb(0, 0, 0),
        color: rgb(0.9, 0.9, 0.9),
      });

      columns.forEach((col, index) => {
        if (index > 0 && index < 4) {
          page.drawLine({
            start: { x: col.x, y: currentY - tableHeaderHeight },
            end: { x: col.x, y: currentY },
            thickness: 0.5,
            color: rgb(0, 0, 0),
          });
        }
      });

      page.drawText("Item", { x: columns[0].x + 6, y: currentY - 20, size: 8, font: boldFont });
      page.drawText("Désignation", { x: columns[1].x + 35, y: currentY - 20, size: 8, font: boldFont });
      page.drawText("Référence / Code", { x: columns[2].x + 10, y: currentY - 20, size: 8, font: boldFont });
      page.drawText("Unité", { x: columns[3].x + 15, y: currentY - 20, size: 8, font: boldFont });

      const qtyHeaderX = columns[4].x;
      const qtyHeaderWidth = colQtyDemanded + colQtyGranted;
      page.drawText("Quantités", {
        x: qtyHeaderX + (qtyHeaderWidth - boldFont.widthOfTextAtSize("Quantités", 8)) / 2,
        y: currentY - 12,
        size: 8,
        font: boldFont,
      });

      page.drawLine({
        start: { x: qtyHeaderX, y: currentY - rowHeight },
        end: { x: qtyHeaderX + qtyHeaderWidth, y: currentY - rowHeight  },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });

      page.drawLine({
        start: { x: columns[4].x, y: currentY - tableHeaderHeight },
        end: { x: columns[4].x, y: currentY },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });

      page.drawText("Demandées", { x: columns[4].x + 2, y: currentY - 34, size: 7, font: boldFont });
      page.drawText("Accordées", { x: columns[5].x + 2, y: currentY - 34, size: 7, font: boldFont });

      page.drawLine({
        start: { x: columns[5].x, y: currentY - tableHeaderHeight },
        end: { x: columns[5].x, y: currentY - 24 },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });

      page.drawText("Délai de mise à", { x: columns[6].x + 5, y: currentY - 14, size: 9, font: boldFont });
      page.drawText("disposition", { x: columns[6].x + 10, y: currentY - 24, size: 9, font: boldFont });

      page.drawLine({
        start: { x: columns[6].x, y: currentY - tableHeaderHeight },
        end: { x: columns[6].x, y: currentY },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });

      currentY -= tableHeaderHeight;

      // =======================================================
      // TABLE ROWS
      // =======================================================

      const startIndex = (pageNumber - 1) * itemsPerPage;
      const pageItems = supplyRequest.items.slice(startIndex, startIndex + itemsPerPage);

      for (let i = 0; i < itemsPerPage; i++) {
        const item = pageItems[i];

        page.drawRectangle({
          x: tableX,
          y: currentY - rowHeight,
          width: tableWidth,
          height: rowHeight,
          borderWidth: 0.5,
          borderColor: rgb(0, 0, 0),
        });

        columns.forEach((col, index) => {
          if (index > 0) {
            page.drawLine({
              start: { x: col.x, y: currentY - rowHeight },
              end: { x: col.x, y: currentY },
              thickness: 0.5,
              color: rgb(0, 0, 0),
            });
          }
        });

        if (item) {
          const itemNoStr = String(startIndex + i + 1);
          page.drawText(itemNoStr, { x: columns[0].x + 10, y: currentY - 14, size: 8, font });

          page.drawText((item.designation || "-").substring(0, 35), { x: columns[1].x + 4, y: currentY - 14, size: 8, font });

          page.drawText((item.referenceCode || "-").substring(0, 20), { x: columns[2].x + 4, y: currentY - 14, size: 8, font });

          page.drawText((item.unit || "-").substring(0, 10), { x: columns[3].x + 6, y: currentY - 14, size: 8, font });

          const qDemandedStr = String(item.requestedQuantity || 0);
          page.drawText(qDemandedStr, { x: columns[4].x + 15, y: currentY - 14, size: 8, font });

          const qGrantedStr = item.approvedQuantity !== null ? String(item.approvedQuantity) : "";
          page.drawText(qGrantedStr, { x: columns[5].x + 15, y: currentY - 14, size: 8, font });

          const itemDelayStr = item.desiredAvailability
            ? new Date(item.desiredAvailability).toLocaleDateString("fr-FR")
            : deadlineStr;
          page.drawText(itemDelayStr.substring(0, 15), { x: columns[6].x + 6, y: currentY - 14, size: 8, font });
        }

        currentY -= rowHeight;
      }

      // =======================================================
      // NOTES + SIGNATURES ONLY ON LAST PAGE
      // =======================================================

      if (isLastPage) {
        currentY -= 5;

        page.drawRectangle({
          x: tableX,
          y: currentY - 85,
          width: tableWidth ,
          height: 90,
          borderWidth: 0.5,
          borderColor: rgb(0, 0, 0),
        });

        page.drawText("Notes :", {
          x: tableX + 5,
          y: currentY - 12,
          size: 9,
          font: boldFont,
        });

        if (supplyRequest.note) {
          page.drawText(supplyRequest.note.substring(0, 140), {
            x: tableX + 5,
            y: currentY - 28,
            size: 8,
            font,
          });
        }

        currentY -= 55;

        const sigColWidth = tableWidth / 3;
        const sigHeight = 85;

        const sigTitles = [
          [
            "Premier Responsable de la",
            "Structure Demanderesse :",
            "Nom :",
            "Date :",
            "Visa :",
          ],
          [
            "Validation du Coordinateur GDS",
            "/ cadre GDS :",
            "Nom :",
            "Date :",
            "Visa :",
          ],
          [
            "Validation du Directeur Projet",
            "/ SDR / DR :",
            "Nom :",
            "Date :",
            "Visa :",
          ],
        ];

        for (let c = 0; c < 3; c++) {
          const sigX = tableX + c * sigColWidth;

          page.drawRectangle({
            x: sigX,
            y: currentY - sigHeight -5 ,
            width: sigColWidth,
            height: sigHeight  ,
            borderWidth: 0.5,
            borderColor: rgb(0, 0, 0),
          });

          let lineY = currentY - 15;

          sigTitles[c].forEach((line) => {
            page.drawText(line, {
              x: sigX + 5,
              y: lineY -1,
              size: 7,
              font: boldFont,
            });
            lineY -= 12;
          });
        }
      }

      // =======================================================
      // FOOTER
      // =======================================================

      const footerY1 = 80;
      const footerY2 = 70;
      const footerSize = 8;

      const fText1 = "Ce document est la propriété de SARPI";
      const fText2 = "Il ne pourra sans autorisation écrite être reproduit ou communiqué à des tiers";

      const w1 = boldFont.widthOfTextAtSize(fText1, footerSize);
      const w2 = boldFont.widthOfTextAtSize(fText2, footerSize);

      page.drawText(fText1, {
        x: (pageWidth - w1) / 2,
        y: footerY1,
        size: footerSize,
        font: boldFont,
      });

      page.drawText(fText2, {
        x: (pageWidth - w2) / 2,
        y: footerY2,
        size: footerSize,
        font: boldFont,
      });

      page.drawLine({
        start: { x: (pageWidth - w1) / 2, y: footerY1 - 3 },
        end: { x: (pageWidth + w1) / 2, y: footerY1 - 3 },
        thickness: 0.7,
      });

      page.drawLine({
        start: { x: (pageWidth - w2) / 2, y: footerY2 - 3 },
        end: { x: (pageWidth + w2) / 2, y: footerY2 - 3 },
        thickness: 0.7,
      });
    }

    // =========================================================
    // SAVE AND RETURN PDF
    // =========================================================

    const pdfBytes = await pdfDoc.save();

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="demande-fourniture-${supplyRequest.requestNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return new Response("Failed to generate Supply Request PDF", { status: 500 });
  }
}