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
    const transferId = Number(id);

    if (Number.isNaN(transferId)) {
      return new Response("Invalid Transfer ID", { status: 400 });
    }

    // =========================================================
    // FETCH TRANSFER + ITEMS + DEVICES
    // =========================================================

    const transfer = await prisma.transfer.findUnique({
      where: {
        id: transferId,
      },
      include: {
        items: {
          include: {
            device: true,
          },
        },
      },
    });

    if (!transfer) {
      return new Response("Transfer record not found", { status: 404 });
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

    const expDateStr = transfer.dateExpediteur
      ? new Date(transfer.dateExpediteur).toLocaleDateString("fr-FR")
      : "-";

    const destDateStr = transfer.dateDestinataire
      ? new Date(transfer.dateDestinataire).toLocaleDateString("fr-FR")
      : "-";

    // =========================================================
    // PAGE / TABLE CONFIGURATION
    // =========================================================

    const tableX = 40;
    const tableWidth = pageWidth - 80;
    const rowHeight = 22;

    const colCode = 80;
    const colSerial = 100;
    const colType = 115;
    const colBrand = 80;
    const colModel = 100;
    const colQty =
      tableWidth -
      colCode -
      colSerial -
      colType -
      colBrand -
      colModel;

    const columns = [
      {
        title: "CODE INVENTAIRE",
        x: tableX,
        width: colCode,
      },
      {
        title: "NUMERO DE SERIE",
        x: tableX + colCode,
        width: colSerial,
      },
      {
        title: "TYPE Matériel",
        x: tableX + colCode + colSerial,
        width: colType,
      },
      {
        title: "MARQUE",
        x: tableX + colCode + colSerial + colType,
        width: colBrand,
      },
      {
        title: "MODELE",
        x: tableX + colCode + colSerial + colType + colBrand,
        width: colModel,
      },
      {
        title: "QT",
        x:
          tableX +
          colCode +
          colSerial +
          colType +
          colBrand +
          colModel,
        width: colQty,
      },
    ];

    // =========================================================
    // PAGINATION
    // =========================================================

    const itemsPerPage = 15;
    const totalItems = transfer.items.length;

    const totalPages = Math.max(
      1,
      Math.ceil(totalItems / itemsPerPage)
    );

    // =========================================================
    // GENERATE PAGES
    // =========================================================

    for (
      let pageNumber = 1;
      pageNumber <= totalPages;
      pageNumber++
    ) {
      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      const isLastPage = pageNumber === totalPages;

      // =========================================================
    // DRAW HEADER
    // =========================================================

    const drawHeader = (
      page: any,
      pageNumber: number,
      totalPages: number
    ) => {
      const width = pageWidth;
      const height = pageHeight;

      // Header: approximately 5 points from the top
      

      const headerX = 40;
     const headerY = height - 110;
     const headerWidth = width - 80;
    const headerHeight = 90;

      // Outer border
      page.drawRectangle({
        x: headerX,
        y: headerY,
        width: headerWidth,
        height: headerHeight,
        borderWidth: 0.5,
        borderColor: rgb(0, 0, 0),
      });

      // Vertical separator after logo
      page.drawLine({
        start: { x: 140, y: headerY },
        end: {
          x: 140,
          y: headerY + headerHeight,
        },
        thickness: 1,
        color: rgb(0, 0, 0),
      });

      // Vertical separator before document reference
      page.drawLine({
        start: { x: width - 160, y: headerY },
        end: {
          x: width - 160,
          y: headerY + headerHeight,
        },
        thickness: 1,
        color: rgb(0, 0, 0),
      });

      // Logo
      page.drawImage(logoImage, {
        x: 55,
        y: height - 97,
        width: 70,
        height: 70,
      });

      // Title
      page.drawText("LETTRE DE DECHARGE", {
        x: 185,
        y: height - 70,
        size: 16,
        font: boldFont,
      });

      // Document reference
      const documentX = width - 150;

      page.drawText("MOD-SMI-PS3-01", {
        x: documentX,
        y: height - 40,
        size: 11,
        font: boldFont,
      });

      // Revision
      page.drawText("Rev", {
        x: documentX + 22,
        y: height - 55,
        size: 11,
        font: boldFont,
      });

      page.drawText(" : 01", {
        x: documentX + 43,
        y: height - 55,
        size: 11,
        font,
      });

      // Document date
      page.drawText("Du: 29/01/2020", {
        x: documentX + 6,
        y: height - 75,
        size: 11,
        font,
      });

      // Separator
      const pageSeparatorY = height - 90;

      page.drawLine({
        start: {
          x: documentX - 10,
          y: pageSeparatorY,
        },
        end: {
          x: documentX + 110,
          y: pageSeparatorY,
        },
        thickness: 1,
        color: rgb(0, 0, 0),
      });

      // Dynamic page number
      const pageText = `Page ${pageNumber} sur ${totalPages}`;
      const pageFontSize = 9;

      const pageTextWidth = boldFont.widthOfTextAtSize(
        pageText,
        pageFontSize
      );

      page.drawText(pageText, {
        x: documentX + (100 - pageTextWidth) / 2,
        y: height - 103,
        size: pageFontSize,
        font: boldFont,
      });
    };

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
        start: {
          x: 130,
          y: headerY,
        },
        end: {
          x: 130,
          y: headerY + headerHeight,
        },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });

      // Header separator 2
      page.drawLine({
        start: {
          x: pageWidth - 150,
          y: headerY,
        },
        end: {
          x: pageWidth - 150,
          y: headerY + headerHeight,
        },
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
      page.drawText("BON DE TRANSFERT MATERIEL INFORMATIQUE", {
        x: 160,
        y: headerY + 35,
        size: 11,
        font: boldFont,
      });

      // Document info
      const docX = pageWidth - 140;

      page.drawText("MOD-SMI-PS3-09", {
        x: docX,
        y: headerY + 55,
        size: 10,
        font: boldFont,
      });

      page.drawText("         Rev : 00        ", {
        x: docX,
        y: headerY + 40,
        size: 9,
        font,
      });

      page.drawText("    Du: 21/05/2025    ", {
        x: docX,
        y: headerY + 25,
        size: 9,
        font,
      });

      page.drawLine({
  start: { x: docX -10, y: headerY + 20 },
  end: { x: docX + 100, y: headerY + 20 },
  thickness: 1,
  color: rgb(0, 0, 0),
});

      page.drawText(`      Page ${pageNumber} sur ${totalPages}     `, {
        x: docX,
        y: headerY + 7,
        size: 9,
        font: boldFont,
      });

      let currentY = headerY - 25;

      // =======================================================
      // FIRST PAGE ONLY:
      // EXPEDITEUR / DESTINATAIRE / NATURE
      // =======================================================

      if (pageNumber === 1) {
        // -------------------------------------------------------
        // SENDER & RECIPIENT BOXES
        // -------------------------------------------------------

        const boxWidth = (headerWidth - 15) / 2;

        // Expéditeur
        page.drawRectangle({
          x: headerX,
          y: currentY - 50,
          width: boxWidth,
          height: 75,
          borderWidth: 0.5,
          borderColor: rgb(0, 0, 0),
        });

        page.drawText("Expéditeur", {
          x: headerX + 85,
          y: currentY + 5,
          size: 13,
          font: boldFont,
        });

        page.drawText(
          `Site/Projet : ${transfer.siteExpediteur || "-"}`,
          {
            x: headerX + 5,
            y: currentY - 20,
            size: 9,
            font: boldFont,
          }
        );

        page.drawText(`Date : ${expDateStr}`, {
          x: headerX + 5,
          y: currentY - 40,
          size: 9,
          font: boldFont,
        });

        // Destinataire
        const destX = headerX + boxWidth + 15;

        page.drawRectangle({
          x: destX - 15,
          y: currentY - 50,
          width: boxWidth + 15,
          height: 75,
          borderWidth: 0.5,
          borderColor: rgb(0, 0, 0),
        });

        page.drawText("Destinataire", {
          x: destX + 80,
          y: currentY + 5,
          size: 13,
          font: boldFont,
        });

        page.drawText(
          `Site/Projet : ${transfer.siteDestinataire || "-"}`,
          {
            x: destX - 5,
            y: currentY - 20,
            size: 9,
            font: boldFont,
          }
        );

        page.drawText(`Date : ${destDateStr}`, {
          x: destX - 5,
          y: currentY - 40,
          size: 9,
          font: boldFont,
        });

        currentY -= 65;

        // -------------------------------------------------------
        // MATERIAL NATURE
        // -------------------------------------------------------

        const isInvestment =
          transfer.nature === "INVESTISSEMENT";

        // Investment checkbox
        page.drawRectangle({
          x: headerX + 120,
          y: currentY - 10,
          width: 20,
          height: 20,
          borderWidth: 0.5,
          borderColor: rgb(0, 0, 0),
          color: rgb(1, 1, 1),
        });

        if (isInvestment) {
          page.drawText("X", {
            x: headerX + 125,
            y: currentY - 3,
            size: 11,
            font: boldFont,
            color: rgb(0, 0, 0),
          });
        }

        page.drawText("Investissement", {
          x: headerX + 20,
          y: currentY - 7,
          size: 11,
          font,
        });

        // Consommable checkbox
        page.drawRectangle({
          x: headerX + 360,
          y: currentY - 10,
          width: 20,
          height: 20,
          borderWidth: 0.5,
          borderColor: rgb(0, 0, 0),
          color: rgb(1, 1, 1),
        });

        if (!isInvestment) {
          page.drawText("X", {
            x: headerX + 365,
            y: currentY - 3,
            size: 11,
            font: boldFont,
            color: rgb(0, 0, 0),
          });
        }

        page.drawText("Consommable", {
          x: headerX + 270,
          y: currentY - 7,
          size: 11,
          font,
        });

        // Vertical line before INVESTISSEMENT
        page.drawLine({
          start: {
            x: headerX ,
            y: currentY +15,
          },
          end: {
            x: headerX ,
            y: currentY -20,
          },
          thickness: 0.7,
          color: rgb(0, 0, 0),
        });

        // Vertical line after CONSOMMABLE
        page.drawLine({
          start: {
            x: headerX + 515,
            y: currentY + 15,
          },
          end: {
            x: headerX + 515,
            y: currentY - 25,
          },
          thickness: 0.7,
          color: rgb(0, 0, 0),
        });

        currentY -= 20;
      } else {
        // On continuation pages, leave some space after header
        currentY -= 15;
      }

      // =======================================================
      // TABLE HEADER
      // =======================================================

      page.drawRectangle({
        x: tableX,
        y: currentY - rowHeight,
        width: tableWidth,
        height: rowHeight,
        borderWidth: 0.5,
        borderColor: rgb(0, 0, 0),
        color: rgb(0.9, 0.9, 0.9),
      });

      columns.forEach((col) => {
        const textWidth =
          boldFont.widthOfTextAtSize(col.title, 8);

        page.drawText(col.title, {
          x: col.x + (col.width - textWidth) / 2,
          y: currentY - 14,
          size: 8,
          font: boldFont,
        });

        if (col.x > tableX) {
          page.drawLine({
            start: {
              x: col.x,
              y: currentY - rowHeight,
            },
            end: {
              x: col.x,
              y: currentY,
            },
            thickness: 0.5,
            color: rgb(0, 0, 0),
          });
        }
      });

      currentY -= rowHeight;

      // =======================================================
      // TABLE ROWS
      // =======================================================

      const startIndex =
        (pageNumber - 1) * itemsPerPage;

      const pageItems = transfer.items.slice(
        startIndex,
        startIndex + itemsPerPage
      );

      for (let i = 0; i < itemsPerPage; i++) {
        const item = pageItems[i];

        // Row border
        page.drawRectangle({
          x: tableX,
          y: currentY - rowHeight,
          width: tableWidth,
          height: rowHeight,
          borderWidth: 0.5,
          borderColor: rgb(0, 0, 0),
        });

        // Vertical lines
        columns.forEach((col) => {
          if (col.x > tableX) {
            page.drawLine({
              start: {
                x: col.x,
                y: currentY - rowHeight,
              },
              end: {
                x: col.x,
                y: currentY,
              },
              thickness: 0.5,
              color: rgb(0, 0, 0),
            });
          }
        });

        // Device data
        if (item) {
          const dev = item.device;

          page.drawText(
            (dev.codeSarpi || "-").substring(0, 15),
            {
              x: tableX + 4,
              y: currentY - 14,
              size: 8,
              font,
            }
          );

          page.drawText(
            (dev.serialNumber || "-").substring(0, 18),
            {
              x: tableX + colCode + 4,
              y: currentY - 14,
              size: 8,
              font,
            }
          );

          page.drawText(
            (dev.type || "-").substring(0, 20),
            {
              x:
                tableX +
                colCode +
                colSerial +
                4,
              y: currentY - 14,
              size: 8,
              font,
            }
          );

          page.drawText(
            (dev.brand || "-").substring(0, 15),
            {
              x:
                tableX +
                colCode +
                colSerial +
                colType +
                4,
              y: currentY - 14,
              size: 8,
              font,
            }
          );

          page.drawText(
            (dev.model || "-").substring(0, 18),
            {
              x:
                tableX +
                colCode +
                colSerial +
                colType +
                colBrand +
                4,
              y: currentY - 14,
              size: 8,
              font,
            }
          );

          const qtyStr = String(
            item.quantity || 1
          ).padStart(2, "0");

          const qWidth =
            font.widthOfTextAtSize(qtyStr, 8);

          page.drawText(qtyStr, {
            x:
              columns[5].x +
              (columns[5].width - qWidth) / 2,
            y: currentY - 14,
            size: 8,
            font,
          });
        }

        currentY -= rowHeight;
      }

      // =======================================================
      // NOTES + SIGNATURES ONLY ON LAST PAGE
      // =======================================================

      if (isLastPage) {
        // -------------------------------------------------------
        // NOTES
        // -------------------------------------------------------

        currentY -= 5;

        page.drawRectangle({
          x: tableX,
          y: currentY - 40,
          width: tableWidth,
          height: 45,
          borderWidth: 0.5,
          borderColor: rgb(0, 0, 0),
        });

        page.drawText("Notes et Remarques :", {
          x: tableX + 5,
          y: currentY - 12,
          size: 9,
          font: boldFont,
        });

        if (transfer.note) {
          page.drawText(
            transfer.note.substring(0, 120),
            {
              x: tableX + 5,
              y: currentY - 28,
              size: 8,
              font,
            }
          );
        }

        currentY -= 40;

        // -------------------------------------------------------
        // SIGNATURE BOXES
        // -------------------------------------------------------

        const sigColWidth = tableWidth / 4;
        const sigHeight = 90;

        const sigTitles = [
          ["   MAGASIN IT   ", "Griffe et signature"],
          [
            "VISA RESPONSABLE DES",
            "  ACTIFS ET MOYENS   ",
            "    INFORMATIQUE  ",
            "    Griffe et signature    ",
          ],
          [
            "   Transporteur  ",
            "    Nom et prénom   ",
            "     et signature     ",
          ],
          [
            " RECEPTIONNAIRE MATERIEL",
            "   SITE / PROJET   ",
            "    Nom et prénom    ",
            "     et signature   ",
          ],
        ];

        for (let c = 0; c < 4; c++) {
          const sigX =
            tableX + c * sigColWidth;

          page.drawRectangle({
            x: sigX,
            y: currentY - sigHeight,
            width: sigColWidth,
            height: sigHeight,
            borderWidth: 0.5,
            borderColor: rgb(0, 0, 0),
          });

          let lineY = currentY - 12;

          sigTitles[c].forEach((line) => {
            page.drawText(line, {
              x: sigX + 14,
              y: lineY,
              size: 7,
              font: boldFont,
            });

            lineY -= 9;
          });

          page.drawText("DATE:", {
            x: sigX + 4,
            y: currentY - sigHeight + 8,
            size: 8,
            font: boldFont,
          });
        }
      }

      // =======================================================
      // FOOTER
      // =======================================================

      const footerSize = 7;
      const footerY1 = 79;
      const footerY2 = 66;

      const fText1 = "Ce document est la propriété de SARPI";
      const fText2 =
        "Il ne pourra sans autorisation écrite être reproduit ou communiqué à des tiers";

      const w1 = boldFont.widthOfTextAtSize(fText1, footerSize);
      const w2 = boldFont.widthOfTextAtSize(fText2, footerSize);

      // White background behind the footer prevents table/signature content
      // from making the footer difficult to read if the page is crowded.
      page.drawRectangle({
        x: 25,
        y: 25,
        width: pageWidth - 50,
        height: 34,
        color: rgb(1, 1, 1),
        borderWidth: 0,
      });

      page.drawText(fText1, {
        x: (pageWidth - w1) / 2,
        y: footerY1,
        size: footerSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      page.drawText(fText2, {
        x: (pageWidth - w2) / 2,
        y: footerY2,
        size: footerSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      // Underline first footer text
      page.drawLine({
        start: {
          x: (pageWidth - w1) / 2,
          y: footerY1 - 2,
        },
        end: {
          x: (pageWidth + w1) / 2,
          y: footerY1 - 2,
        },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });

      // Underline second footer text
      page.drawLine({
        start: {
          x: (pageWidth - w2) / 2,
          y: footerY2 - 2,
        },
        end: {
          x: (pageWidth + w2) / 2,
          y: footerY2 - 2,
        },
        thickness: 0.5,
        color: rgb(0, 0, 0),
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
        "Content-Disposition": `inline; filename="bon-de-transfert-${transfer.id}.pdf"`,
      },
    });
  } catch (error) {
    console.error(
      "PDF generation error:",
      error
    );

    return new Response(
      "Failed to generate Transfer PDF",
      { status: 500 }
    );
  }
}