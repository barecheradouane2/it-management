import { PDFDocument, StandardFonts, rgb, PDFFont } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

// =========================================================
// HELPER: AUTOMATIC 2-LINE TEXT WRAPPER WITH ELLIPSIS
// =========================================================
function wrapTextTwoLines(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  if (!text) return ["-"];

  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (lines.length === 0) {
        lines.push(currentLine || word);
        currentLine = currentLine ? word : "";
      } else {
        // Second line overflow: truncate with ellipsis
        let truncated = currentLine;
        while (
          truncated.length > 0 &&
          font.widthOfTextAtSize(`${truncated}...`, fontSize) > maxWidth
        ) {
          truncated = truncated.slice(0, -1);
        }
        lines.push(`${truncated}...`);
        return lines;
      }
    }
  }

  if (currentLine && lines.length < 2) {
    lines.push(currentLine);
  }

  return lines;
}

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
    const tableWidth = pageWidth - 80; // 515.28 pt

    const rowHeight = 28;

    const colItem = 30;
    const colRef = 75;
    const colUnit = 40;
    const colQtyDemanded = 42;
    const colQtyGranted = 42;
    const colDelay = 81;
    const colDesignation =
      tableWidth -
      (colItem + colRef + colUnit + colQtyDemanded + colQtyGranted + colDelay);

    const columnDefs = [
      { title: "Item", width: colItem },
      { title: "Désignation", width: colDesignation },
      { title: "Référence / Code", width: colRef },
      { title: "Unité", width: colUnit },
      { title: "Qté Dem.", width: colQtyDemanded },
      { title: "Qté Acc.", width: colQtyGranted },
      { title: "Délai souhaité", width: colDelay },
    ];

    let runningX = tableX;
    const columns = columnDefs.map((col) => {
      const item = { ...col, x: runningX };
      runningX += col.width;
      return item;
    });

    // =========================================================
    // PAGINATION
    // =========================================================

    const itemsPerPage = 10;
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
        size: 13,
        font: boldFont,
      });

      // Document info
      const docX = pageWidth - 140;

      page.drawText(" MOD-SMI-PS2-33 ", {
        x: docX,
        y: headerY + 55,
        size: 9,
        font: boldFont,
      });

      page.drawText("   Rev : 01    ", {
        x: docX,
        y: headerY + 40,
        size: 8.5,
        font,
      });

      page.drawText("   Du: 17/06/2026   ", {
        x: docX,
        y: headerY + 25,
        size: 8.5,
        font,
      });

      page.drawLine({
        start: { x: docX - 10, y: headerY + 20 },
        end: { x: docX + 100, y: headerY + 20 },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });

      page.drawText(`    Page ${pageNumber} sur ${totalPages}`, {
        x: docX,
        y: headerY + 7,
        size: 8.5,
        font: boldFont,
      });

      let currentY = headerY - 20;

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

        page.drawText(`Code du magasin:  :  M501 `, {
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
          y: currentY - 5,
          size: 9,
          font: boldFont,
        });

        page.drawLine({
          start: { x: headerX + 340, y: currentY - 10 },
          end: { x: headerX + headerWidth, y: currentY - 10 },
          thickness: 0.5,
          color: rgb(0, 0, 0),
        });

        page.drawLine({
          start: { x: headerX + 340, y: currentY + 10 },
          end: { x: headerX + 340, y: currentY - 75 },
          thickness: 0.5,
          color: rgb(0, 0, 0),
        });

        page.drawText(`Date  : ${requestDateStr}`, {
          x: headerX + 350,
          y: currentY - 25,
          size: 9,
          font: boldFont,
        });

        page.drawLine({
          start: { x: headerX + 340, y: currentY - 35 },
          end: { x: headerX + headerWidth, y: currentY - 35 },
          thickness: 0.5,
          color: rgb(0, 0, 0),
        });

        page.drawText(`Date De plan de mobilisation : `, {
          x: headerX + 350,
          y: currentY - 50,
          size: 9,
          font: boldFont,
        });

        currentY -= 85;

        page.drawRectangle({
          x: headerX,
          y: currentY - 45,
          width: headerWidth,
          height: 50,
          borderWidth: 0.5,
          borderColor: rgb(0, 0, 0),
        });

        page.drawText(
          `But / destination de la fourniture : ${supplyRequest.purpose || "-"}`,
          {
            x: headerX + 8,
            y: currentY - 10,
            size: 9,
            font: boldFont,
          }
        );

        currentY -= 55;
      } else {
        currentY -= 15;
      }

      // =======================================================
      // TABLE HEADER
      // =======================================================

      const tableHeaderHeight = 34;

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

      page.drawText("Item", {
        x: columns[0].x + 4,
        y: currentY - 20,
        size: 8,
        font: boldFont,
      });

      page.drawText("Désignation", {
        x: columns[1].x + 10,
        y: currentY - 20,
        size: 8,
        font: boldFont,
      });

      page.drawText("Référence / Code", {
        x: columns[2].x + 6,
        y: currentY - 20,
        size: 8,
        font: boldFont,
      });

      page.drawText("Unité", {
        x: columns[3].x + 8,
        y: currentY - 20,
        size: 8,
        font: boldFont,
      });

      // Quantités Header Split
      const qtyHeaderX = columns[4].x;
      const qtyHeaderWidth = colQtyDemanded + colQtyGranted;

      page.drawText("Quantités", {
        x:
          qtyHeaderX +
          (qtyHeaderWidth - boldFont.widthOfTextAtSize("Quantités", 8)) / 2,
        y: currentY - 11,
        size: 8,
        font: boldFont,
      });

      page.drawLine({
        start: { x: qtyHeaderX, y: currentY - 17 },
        end: { x: qtyHeaderX + qtyHeaderWidth, y: currentY - 17 },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });

      page.drawLine({
        start: { x: columns[4].x, y: currentY - tableHeaderHeight },
        end: { x: columns[4].x, y: currentY },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });

      page.drawText("Demandées", {
        x: columns[4].x + 2,
        y: currentY - 27,
        size: 6.5,
        font: boldFont,
      });

      page.drawText("Accordées", {
        x: columns[5].x + 3,
        y: currentY - 27,
        size: 6.5,
        font: boldFont,
      });

      page.drawLine({
        start: { x: columns[5].x, y: currentY - tableHeaderHeight },
        end: { x: columns[5].x, y: currentY - 17 },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });

      page.drawLine({
        start: { x: columns[6].x, y: currentY - tableHeaderHeight },
        end: { x: columns[6].x, y: currentY },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });

      page.drawText("Délai de mise à", {
        x: columns[6].x + 4,
        y: currentY - 13,
        size: 8,
        font: boldFont,
      });
      page.drawText("disposition", {
        x: columns[6].x + 10,
        y: currentY - 23,
        size: 8,
        font: boldFont,
      });

      currentY -= tableHeaderHeight;

      // =======================================================
      // TABLE ROWS
      // =======================================================

      const startIndex = (pageNumber - 1) * itemsPerPage;
      const pageItems = supplyRequest.items.slice(
        startIndex,
        startIndex + itemsPerPage
      );

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
          const singleLineY = currentY - (rowHeight / 2 + 3);

          // Item index
          const itemNoStr = String(startIndex + i + 1);
          page.drawText(itemNoStr, {
            x: columns[0].x + 8,
            y: singleLineY,
            size: 8,
            font,
          });

          // Désignation: dynamic 1 or 2 lines
          const maxDesignationWidth = columns[1].width - 8;
          const designationLines = wrapTextTwoLines(
            item.designation || "-",
            font,
            8,
            maxDesignationWidth
          );

          if (designationLines.length === 1) {
            page.drawText(designationLines[0], {
              x: columns[1].x + 4,
              y: singleLineY,
              size: 8,
              font,
            });
          } else {
            page.drawText(designationLines[0], {
              x: columns[1].x + 4,
              y: currentY - 11,
              size: 8,
              font,
            });
            page.drawText(designationLines[1], {
              x: columns[1].x + 4,
              y: currentY - 21,
              size: 8,
              font,
            });
          }

          // Référence / Code
          page.drawText((item.referenceCode || "-").substring(0, 18), {
            x: columns[2].x + 4,
            y: singleLineY,
            size: 7.5,
            font,
          });

          // Unité
          page.drawText((item.unit || "-").substring(0, 8), {
            x: columns[3].x + 4,
            y: singleLineY,
            size: 8,
            font,
          });

          // Qté Dem.
          const qDemandedStr = String(item.requestedQuantity || 0);
          page.drawText(qDemandedStr, {
            x: columns[4].x + 10,
            y: singleLineY,
            size: 8,
            font,
          });

          // Qté Acc.
          const qGrantedStr =
            item.approvedQuantity !== null ? String(item.approvedQuantity) : "";
          page.drawText(qGrantedStr, {
            x: columns[5].x + 10,
            y: singleLineY,
            size: 8,
            font,
          });

          // Délai
          const itemDelayStr = item.desiredAvailability
            ? new Date(item.desiredAvailability).toLocaleDateString("fr-FR")
            : deadlineStr;
          page.drawText(itemDelayStr.substring(0, 14), {
            x: columns[6].x + 4,
            y: singleLineY,
            size: 7.5,
            font,
          });
        }

        currentY -= rowHeight;
      }

      // =======================================================
      // NOTES + SIGNATURES ONLY ON LAST PAGE
      // =======================================================

      if (isLastPage) {
        // NOTE BOX: DIRECTLY FLUSH UNDER THE TABLE
        const noteHeight = 42;

        page.drawRectangle({
          x: tableX,
          y: currentY - noteHeight,
          width: tableWidth,
          height: noteHeight,
          borderWidth: 0.5,
          borderColor: rgb(0, 0, 0),
        });

        page.drawText("Notes :", {
          x: tableX + 6,
          y: currentY - 12,
          size: 8.5,
          font: boldFont,
        });

        if (supplyRequest.note) {
          const noteLines = wrapTextTwoLines(
            supplyRequest.note,
            font,
            7.5,
            tableWidth - 55
          );

          if (noteLines.length > 0) {
            page.drawText(noteLines[0], {
              x: tableX + 50,
              y: currentY - 12,
              size: 7.5,
              font,
            });
          }
          if (noteLines.length > 1) {
            page.drawText(noteLines[1], {
              x: tableX + 50,
              y: currentY - 24,
              size: 7.5,
              font,
            });
          }
        }

        currentY -= noteHeight;

        // SIGNATURES: EXPANDED SPACING DIRECTLY BELOW NOTES
        const sigColWidth = tableWidth / 3;
        const sigHeight = 110; // Taller box for signatures

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

          // Box border
          page.drawRectangle({
            x: sigX,
            y: currentY - sigHeight,
            width: sigColWidth,
            height: sigHeight,
            borderWidth: 0.5,
            borderColor: rgb(0, 0, 0),
          });

          // Header title rows (2 lines)
          page.drawText(sigTitles[c][0], {
            x: sigX + 6,
            y: currentY - 14,
            size: 7.5,
            font: boldFont,
          });

          page.drawText(sigTitles[c][1], {
            x: sigX + 6,
            y: currentY - 25,
            size: 7.5,
            font: boldFont,
          });

          // Horizontal divider under section title
          page.drawLine({
            start: { x: sigX, y: currentY - 32 },
            end: { x: sigX + sigColWidth, y: currentY - 32 },
            thickness: 0.5,
            color: rgb(0, 0, 0),
          });

          // Fields: Nom, Date, Visa with generous vertical spacing
          let fieldY = currentY - 48;
          const labelSpacing = 18; // 18pt between each field

          // Nom
          page.drawText(sigTitles[c][2], {
            x: sigX + 6,
            y: fieldY,
            size: 7.5,
            font: boldFont,
          });
          fieldY -= labelSpacing;

          // Date
          page.drawText(sigTitles[c][3], {
            x: sigX + 6,
            y: fieldY,
            size: 7.5,
            font: boldFont,
          });
          fieldY -= labelSpacing;

          // Visa
          page.drawText(sigTitles[c][4], {
            x: sigX + 6,
            y: fieldY,
            size: 7.5,
            font: boldFont,
          });
        }

        currentY -= sigHeight;
      }

      // =======================================================
      // FOOTER
      // =======================================================

      const footerY1 = 45;
      const footerY2 = 34;
      const footerSize = 7.5;

      const fText1 = "Ce document est la propriété de SARPI";
      const fText2 =
        "Il ne pourra sans autorisation écrite être reproduit ou communiqué à des tiers";

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
        start: { x: (pageWidth - w1) / 2, y: footerY1 - 2 },
        end: { x: (pageWidth + w1) / 2, y: footerY1 - 2 },
        thickness: 0.6,
      });

      page.drawLine({
        start: { x: (pageWidth - w2) / 2, y: footerY2 - 2 },
        end: { x: (pageWidth + w2) / 2, y: footerY2 - 2 },
        thickness: 0.6,
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
    return new Response("Failed to generate Supply Request PDF", {
      status: 500,
    });
  }
}