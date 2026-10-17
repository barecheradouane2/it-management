import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";

import { prisma } from "@/lib/prisma";
import { DeviceState } from "@prisma/client";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // =========================================================
    // GET EMPLOYEE ID
    // =========================================================

    const { id } = await params;
    const employeeId = Number(id);

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return new Response("Invalid employee ID", {
        status: 400,
      });
    }

    // =========================================================
    // GET EMPLOYEE + ACTIVE ASSIGNMENTS + DEVICES
    // =========================================================

    const employee = await prisma.employee.findUnique({
  where: { id: employeeId },
  include: {
    assignments: {
      where: {
        returnedAt: null,
        device: {
          state: DeviceState.en_Service,
        },
      },
      include: {
        device: true,
      },
      orderBy: {
        assignedAt: "asc",
      },
    },
  },
});

    if (!employee) {
      return new Response("Employee not found", {
        status: 404,
      });
    }

    // =========================================================
    // CREATE PDF
    // =========================================================

    const pdfDoc = await PDFDocument.create();

    const pageWidth = 595.28;
    const pageHeight = 841.89;

    const font = await pdfDoc.embedFont(
      StandardFonts.Helvetica
    );

    const boldFont = await pdfDoc.embedFont(
      StandardFonts.HelveticaBold
    );

    // =========================================================
    // LOGO
    // =========================================================

    const logoPath = path.join(
      process.cwd(),
      "public",
      "sarpi-logo.png"
    );

    if (!fs.existsSync(logoPath)) {
      console.error("SARPI logo not found:", logoPath);

      return new Response("SARPI logo not found", {
        status: 500,
      });
    }

    const logoBytes = fs.readFileSync(logoPath);
    const logoImage = await pdfDoc.embedPng(logoBytes);

    // =========================================================
    // DATE
    // =========================================================

    const today = new Date().toLocaleDateString("fr-FR");

    // =========================================================
    // TABLE CONFIGURATION
    // =========================================================

    const tableX = 50;
    const tableWidth = pageWidth - 105;
    const rowHeight = 35;

    const colDesignation = 125;
    const colQty = 35;
    const colSerial = 120;
    const colPurpose = 85;

    const colPeriod =
      tableWidth -
      colDesignation -
      colQty -
      colSerial -
      colPurpose;

    const columns = [
      {
        title: "Désignation",
        x: tableX,
        width: colDesignation,
      },
      {
        title: "Qté",
        x: tableX + colDesignation,
        width: colQty,
      },
      {
        title: "N° Série",
        x: tableX + colDesignation + colQty,
        width: colSerial,
      },
      {
        title: "Objet de\nl'affectation",
        x: tableX + colDesignation + colQty + colSerial,
        width: colPurpose,
      },
      {
        title: "Période",
        x:
          tableX +
          colDesignation +
          colQty +
          colSerial +
          colPurpose,
        width: colPeriod,
      },
    ];

    // =========================================================
    // DEVICES PER PAGE
    // =========================================================

    const devicesPerPage = 4;
    const totalDevices = employee.assignments.length;

    const totalPages = Math.max(
      1,
      Math.ceil(totalDevices / devicesPerPage)
    );

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

    // =========================================================
    // DRAW EMPLOYEE INFORMATION
    // =========================================================

    const drawEmployeeInformation = (page: any) => {
      const width = pageWidth;
      const height = pageHeight;

      let y = height - 125;

      page.drawText(`In Amenas le : ${today}`, {
        x: width - 180,
        y,
        size: 10,
        font,
      });

      y -= 35;

      page.drawText("Je soussigné Mr/Mme :", {
        x: 50,
        y,
        size: 10,
        font,
      });

      page.drawText(employee.fullname, {
        x: 160,
        y,
        size: 10,
        font: boldFont,
      });

      page.drawText(
        "                                               Demeurant à  ...........................",
        {
          x: 180,
          y,
          size: 10,
          font,
        }
      );

      y -= 20;

      page.drawText(
        "Wilaya de                      dont le numéro de la pièce d’identité CN/PC est                                             occupant le",
        {
          x: 50,
          y,
          size: 10,
          font,
        }
      );

      y -= 20;

      page.drawText("poste de :", {
        x: 50,
        y,
        size: 10,
        font,
      });

      page.drawText(employee.function || "-", {
        x: 100,
        y,
        size: 10,
        font: boldFont,
      });

      page.drawText(
        `                  affecté à                                                         déclare avoir reçus le  ${today}`,
        {
          x: 150,
          y,
          size: 10,
          font,
        }
      );

      y -= 20;

      page.drawText(
        "les équipements    précisés    ci-dessous   qui   demeurent   propriété   de  la société    SARPI et   m’engage à :",
        {
          x: 50,
          y,
          size: 10,
          font,
        }
      );

      y -= 20;

      page.drawText(
        "• Déclarer toute perte ou vol du dit équipement auprès des autorités concernés (Police ou ,",
        {
          x: 60,
          y,
          size: 10,
          font,
        }
      );

      y -= 18;

      page.drawText("Gendarmerie)", {
        x: 60,
        y,
        size: 10,
        font,
      });

      y -= 18;

      page.drawText(
        "• Prendre soin du matériel et le mettre à disposition de la DSI à la demande.",
        {
          x: 60,
          y,
          size: 10,
          font,
        }
      );

      y -= 25;

      page.drawText("NB:", {
        x: 50,
        y,
        size: 11,
        font: boldFont,
      });

      y -= 1;

      page.drawLine({
        start: { x: 50, y },
        end: { x: 69, y },
        thickness: 1,
        color: rgb(0, 0, 0),
      });

      y -= 20;

      page.drawText(
        "•   Ce document est établi uniquement dans le cas de mise à disposition de matériel informatique (Laptop",
        {
          x: 60,
          y,
          size: 9,
          font,
        }
      );

      y -= 20;

      page.drawText(
        "     Station,Pc,Ecran,chargeur, Appareil photo, disque externe, tablette...)",
        {
          x: 60,
          y,
          size: 9,
          font,
        }
      );

      y -= 20;

      page.drawText(
        "•  La décharge doit préciser le modèle et le numéro de série de l’équipement informatique.",
        {
          x: 60,
          y,
          size: 9,
          font,
        }
      );

      y -= 20;

      page.drawText(
        "•  Il est nécessaire de préciser l’objet et la période de l’affectation : pour formation, mission, production......",
        {
          x: 60,
          y,
          size: 9,
          font,
        }
      );

      y -= 30;

      return y;
    };

    // =========================================================
    // DRAW TABLE HEADER
    // =========================================================

    const drawTableHeader = (page: any, y: number) => {
      const headerBottomY = y - rowHeight + 5;

      page.drawRectangle({
        x: tableX,
        y: headerBottomY,
        width: tableWidth,
        height: rowHeight,
        borderWidth: 0.5,
        borderColor: rgb(0, 0, 0),
        color: rgb(0.9, 0.9, 0.9),
      });

      let currentX = tableX;

      for (const column of columns) {
        if (currentX !== tableX) {
          page.drawLine({
            start: {
              x: currentX,
              y: headerBottomY,
            },
            end: {
              x: currentX,
              y: y + 5,
            },
            thickness: 0.5,
            color: rgb(0, 0, 0),
          });
        }

        currentX += column.width;
      }

      for (const column of columns) {
        if (column.title.includes("\n")) {
          const parts = column.title.split("\n");

          const textWidth1 = boldFont.widthOfTextAtSize(
            parts[0],
            9
          );

          page.drawText(parts[0], {
            x:
              column.x +
              (column.width - textWidth1) / 2,
            y: y - 13,
            size: 9,
            font: boldFont,
          });

          const textWidth2 = boldFont.widthOfTextAtSize(
            parts[1],
            9
          );

          page.drawText(parts[1], {
            x:
              column.x +
              (column.width - textWidth2) / 2,
            y: y - 23,
            size: 9,
            font: boldFont,
          });
        } else {
          const textWidth = boldFont.widthOfTextAtSize(
            column.title,
            9
          );

          page.drawText(column.title, {
            x:
              column.x +
              (column.width - textWidth) / 2,
            y: y - 18,
            size: 9,
            font: boldFont,
          });
        }
      }
    };

    // =========================================================
    // DRAW DEVICE ROW
    // =========================================================

    const drawDeviceRow = (
      page: any,
      y: number,
      assignment: any
    ) => {
      const device = assignment.device;
      const serialNumber = device.serialNumber || "-";
      const purpose = "Mise à disposition";

      const startDate =
        assignment.assignedAt.toLocaleDateString("fr-FR");

      const endDate = assignment.returnedAt
        ? assignment.returnedAt.toLocaleDateString("fr-FR")
        : "En cours";

      const period = `${startDate} - ${endDate}`;

      page.drawRectangle({
        x: tableX,
        y: y - rowHeight + 5,
        width: tableWidth,
        height: rowHeight,
        borderWidth: 0.5,
        borderColor: rgb(0, 0, 0),
      });

      let rowX = tableX;

      for (const column of columns) {
        rowX += column.width;

        if (rowX < tableX + tableWidth) {
          page.drawLine({
            start: {
              x: rowX,
              y: y - rowHeight + 5,
            },
            end: {
              x: rowX,
              y: y + 5,
            },
            thickness: 0.5,
            color: rgb(0, 0, 0),
          });
        }
      }

      const line1 = `${device.type}${
        device.brand ? ` - ${device.brand}` : ""
      }`;

      const line2 = device.model || "";

      const line3 = device.codeSarpi
        ? `(${device.codeSarpi})`
        : "";

      page.drawText(line1.substring(0, 22), {
        x: tableX + 4,
        y: y - 5,
        size: 8,
        font,
      });

      if (line2) {
        page.drawText(line2.substring(0, 22), {
          x: tableX + 4,
          y: y - 15,
          size: 8,
          font,
        });
      }

      if (line3) {
        page.drawText(line3.substring(0, 22), {
          x: tableX + 4,
          y: y - 25,
          size: 8,
          font,
        });
      }

      const qtyText = "01";
      const qtyWidth = font.widthOfTextAtSize(
        qtyText,
        8
      );

      page.drawText(qtyText, {
        x:
          tableX +
          colDesignation +
          (colQty - qtyWidth) / 2,
        y: y - 15,
        size: 8,
        font,
      });

      page.drawText(serialNumber.substring(0, 20), {
        x:
          tableX +
          colDesignation +
          colQty +
          4,
        y: y - 15,
        size: 8,
        font,
      });

      page.drawText(purpose.substring(0, 15), {
        x:
          tableX +
          colDesignation +
          colQty +
          colSerial +
          4,
        y: y - 15,
        size: 8,
        font,
      });

      page.drawText(period, {
        x:
          tableX +
          colDesignation +
          colQty +
          colSerial +
          colPurpose +
          4,
        y: y - 15,
        size: 8,
        font,
      });
    };

    // =========================================================
    // DRAW SIGNATURE
    // =========================================================

    const drawSignature = (page: any,tableBottomY: number) => {
      // let signatureY = 240;
        let signatureY = tableBottomY - 18;

      page.drawText(
        "SARPI SPA se réserve le droit de poursuivre devant les juridictions compétentes toute personne",
        {
          x: 50,
          y: signatureY,
          size: 9,
          font,
        }
      );

      signatureY -= 15;

      page.drawText(
        "n’ayant pas respecté ces engagements, ou n’ayant pas restitué l’équipement à la direction IT.",
        {
          x: 50,
          y: signatureY,
          size: 9,
          font,
        }
      );

      signatureY -= 25;

      page.drawText(
        `Nom et Prénom : ${employee.fullname}`,
        {
          x: 50,
          y: signatureY,
          size: 10,
          font: boldFont,
        }
      );

      signatureY -= 20;

      page.drawText(`Date : ${today}`, {
        x: 50,
        y: signatureY,
        size: 10,
        font: boldFont,
      });

      signatureY -= 20;

      page.drawText("Signature :", {
        x: 50,
        y: signatureY,
        size: 10,
        font: boldFont,
      });
    };

    // =========================================================
    // DRAW FOOTER
    // =========================================================

    const drawFooter = (page: any) => {
      const footerY1 = 80;
      const footerY2 = 70;
      const footerSize = 8;

      const footerText1 =
        "Ce document est la propriété de SARPI";

      const footerText1Width =
        boldFont.widthOfTextAtSize(
          footerText1,
          footerSize
        );

      const footerText1X =
        (pageWidth - footerText1Width) / 2;

      page.drawText(footerText1, {
        x: footerText1X,
        y: footerY1,
        size: footerSize,
        font: boldFont,
      });

      page.drawLine({
        start: {
          x: footerText1X,
          y: footerY1 - 2,
        },
        end: {
          x: footerText1X + footerText1Width,
          y: footerY1 - 2,
        },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });

      const footerText2 =
        "Il ne pourra sans autorisation écrite être reproduit ou communiqué à des tiers";

      const footerText2Width =
        boldFont.widthOfTextAtSize(
          footerText2,
          footerSize
        );

      const footerText2X =
        (pageWidth - footerText2Width) / 2;

      page.drawText(footerText2, {
        x: footerText2X,
        y: footerY2,
        size: footerSize,
        font: boldFont,
      });

      page.drawLine({
        start: {
          x: footerText2X,
          y: footerY2 - 2,
        },
        end: {
          x: footerText2X + footerText2Width,
          y: footerY2 - 2,
        },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });
    };

    // =========================================================
    // GENERATE PAGES
    // =========================================================

    for (
      let pageNumber = 1;
      pageNumber <= totalPages;
      pageNumber++
    ) {
      const page = pdfDoc.addPage([
        pageWidth,
        pageHeight,
      ]);

      drawHeader(page, pageNumber, totalPages);

      let y = drawEmployeeInformation(page);

      drawTableHeader(page, y);

      y -= rowHeight;

      const startIndex =
        (pageNumber - 1) * devicesPerPage;

      const endIndex = Math.min(
        startIndex + devicesPerPage,
        totalDevices
      );

      const pageAssignments =
        employee.assignments.slice(
          startIndex,
          endIndex
        );

      for (const assignment of pageAssignments) {
        drawDeviceRow(page, y, assignment);
        y -= rowHeight;
      }

      if (totalDevices === 0) {
        page.drawRectangle({
          x: tableX,
          y: y - rowHeight + 5,
          width: tableWidth,
          height: rowHeight,
          borderWidth: 0.5,
          borderColor: rgb(0, 0, 0),
        });

        const noDevicesText =
          "Aucun équipement actuellement affecté";

        const noDevicesWidth =
          font.widthOfTextAtSize(
            noDevicesText,
            8
          );

        page.drawText(noDevicesText, {
          x:
            tableX +
            (tableWidth - noDevicesWidth) / 2,
          y: y - 15,
          size: 8,
          font,
        });

        y -= rowHeight;
      }

      // Signature only on the last page
      
        drawSignature(page,y);
      

      drawFooter(page);
    }

    // =========================================================
    // SAVE PDF
    // =========================================================

    const pdfBytes = await pdfDoc.save();

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          `inline; filename="lettre-decharge-${employee.id}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);

    return new Response(
      "Failed to generate PDF",
      { status: 500 }
    );
  }
}