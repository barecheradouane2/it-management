import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";
import type { Prisma, DeviceState, DeviceCondition, DeviceType } from "@prisma/client";
import path from "path";
import fs from "fs/promises";

// Map bureau / room number or pattern to corresponding Service
function getServiceFromBureau(location?: string | null): string {
  if (!location) return "";
  const loc = location.trim().toUpperCase();

  // Customize mapping according to your internal room/bureau naming rules
  if (/^(B|BUR|BUREAU)?\s*(10[1-9]|11[0-9])/i.test(loc)) return "Informatique / IT";
  if (/^(B|BUR|BUREAU)?\s*(20[1-9]|21[0-9])/i.test(loc)) return "Finances & Comptabilité";
  if (/^(B|BUR|BUREAU)?\s*(30[1-9]|31[0-9])/i.test(loc)) return "Ressources Humaines";
  if (/^(B|BUR|BUREAU)?\s*(40[1-9]|41[0-9])/i.test(loc)) return "Technique & Maintenance";
  if (loc.includes("MAGASIN") || loc.includes("STOCK")) return "Approvisionnement";

  return "Services Généraux"; // Fallback default
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deviceIdParam = searchParams.get("deviceId");
  const deviceId = deviceIdParam ? Number(deviceIdParam) : null;
  const search = searchParams.get("search")?.trim() || "";
  const stateParam = searchParams.get("state") as DeviceState | null;
  const condition = searchParams.get("condition") as DeviceCondition | null;
  const type = searchParams.get("type") as DeviceType | null;
  const brand = searchParams.get("brand")?.trim() || "";

  const conditions: Prisma.DeviceWhereInput[] = [];

  // Filter strictly for en_Service and en_Stock
  const allowedStates: DeviceState[] = ["en_Service" as DeviceState, "en_Stock" as DeviceState];

  if (deviceId !== null && !Number.isNaN(deviceId)) {
    conditions.push({ id: deviceId });
  } else {
    if (search) {
      conditions.push({
        OR: [
          { codeSarpi: { contains: search, mode: "insensitive" } },
          { serialNumber: { contains: search, mode: "insensitive" } },
          { hostName: { contains: search, mode: "insensitive" } },
          { brand: { contains: search, mode: "insensitive" } },
          { model: { contains: search, mode: "insensitive" } },
          { location: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (stateParam && allowedStates.includes(stateParam)) {
      conditions.push({ state: stateParam });
    } else {
      conditions.push({ state: { in: allowedStates } });
    }

    if (condition) conditions.push({ condition });
    if (type) conditions.push({ type });
    if (brand) conditions.push({ brand });
  }

  const devices = await prisma.device.findMany({
    where: conditions.length > 0 ? { AND: conditions } : {},
    orderBy: { createdAt: "desc" },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Fiche Recensement", {
    pageSetup: {
      orientation: "landscape",
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,  // Fit all columns on 1 page wide
      fitToHeight: 1, // Fit all rows on 1 page tall
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.3,
        bottom: 0.3,
        header: 0.1,
        footer: 0.1,
      },
    },
  });

  // Explicit column widths (Column A to N)
  sheet.columns = [
    { key: "codeSarpi", width: 18 },       // Col A: CODE SARPI
    { key: "designation", width: 25 },     // Col B: Désignation
    { key: "type", width: 16 },            // Col C: Type de Matériel
    { key: "dirReg", width: 9 },           // Col D: Dir Reg
    { key: "projet", width: 9 },           // Col E: Projet
    { key: "direction", width: 13 },       // Col F: Direction
    { key: "service", width: 14 },         // Col G: Service
    { key: "lieu", width: 16 },            // Col H: Lieu
    { key: "marque", width: 14 },          // Col I: Marque
    { key: "model", width: 16 },           // Col J: Modèle
    { key: "serie", width: 17 },           // Col K: N° Série
    { key: "immat", width: 13 },           // Col L: Immatriculation
    { key: "etat", width: 13 },            // Col M: Etat du Bien
    { key: "obs", width: 18 },             // Col N: OBS
  ];

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  const columnsHeaders = [
    "CODE SARPI",
    "Désignation",
    "Type de Matériel",
    "Dir Reg",
    "Projet",
    "Direction",
    "Service",
    "Lieu",
    "Marque",
    "Modèle",
    "N° Série",
    "Immatriculation",
    "Etat du Bien",
    "OBS",
  ];

  // Load logo as base64
  let logoImageId: number | null = null;
  try {
    const logoPath = path.join(process.cwd(), "public", "sarpi-logo.png");
    const logoBase64 = await fs.readFile(logoPath, { encoding: "base64" });
    logoImageId = workbook.addImage({
      base64: logoBase64,
      extension: "png",
    });
  } catch (err) {
    console.warn("Logo file not found in public/sarpi-logo.png, continuing without logo.", err);
  }

  let currentRowIdx = 1;

  // -------------------------------------------------------------
  // 1. PAGE HEADER (SARPI logo & FICHE DE RECENSEMENT)
  // -------------------------------------------------------------
  const titleRow = sheet.getRow(currentRowIdx);
  titleRow.height = 48;

  sheet.mergeCells(`B${currentRowIdx}:C${currentRowIdx}`);

  if (logoImageId !== null) {
    sheet.addImage(logoImageId, {
      tl: { col: 1.05, row: currentRowIdx - 0.95 },
      ext: { width: 130, height: 44 },
    });
  } else {
    const companyCell = sheet.getCell(`B${currentRowIdx}`);
    companyCell.value = "SARPI spa";
    companyCell.font = { bold: true, size: 14, name: "Calibri" };
    companyCell.alignment = { vertical: "middle", horizontal: "left" };
  }

  sheet.mergeCells(`D${currentRowIdx}:L${currentRowIdx}`);
  const docTitleCell = sheet.getCell(`D${currentRowIdx}`);
  docTitleCell.value = `FICHE DE RECENSEMENT N° ……………...`;
  docTitleCell.font = { bold: true, size: 12, name: "Calibri" };
  docTitleCell.alignment = { horizontal: "center", vertical: "middle" };

  currentRowIdx += 2;

  // -------------------------------------------------------------
  // 2. GROUPED HEADERS (Localisation & Référence Technique)
  // -------------------------------------------------------------
  const groupHeaderRow = sheet.getRow(currentRowIdx);
  groupHeaderRow.height = 34;

  // Localisation spans Col D to Col H (Dir Reg, Projet, Direction, Service, Lieu)
  sheet.mergeCells(`D${currentRowIdx}:H${currentRowIdx}`);
  const locCell = sheet.getCell(`D${currentRowIdx}`);
  locCell.value = "Localisation";
  locCell.font = { bold: true, size: 10, name: "Calibri" };
  locCell.alignment = { horizontal: "center", vertical: "middle" };
  locCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE9ECEF" },
  };

  // Référence Technique spans Col I to Col L (Marque, Modèle, N° Série, Immatriculation)
  sheet.mergeCells(`I${currentRowIdx}:L${currentRowIdx}`);
  const refCell = sheet.getCell(`I${currentRowIdx}`);
  refCell.value = "Référence Technique";
  refCell.font = { bold: true, size: 10, name: "Calibri" };
  refCell.alignment = { horizontal: "center", vertical: "middle" };
  refCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE9ECEF" },
  };

  for (let c = 4; c <= 8; c++) groupHeaderRow.getCell(c).border = thinBorder;
  for (let c = 9; c <= 12; c++) groupHeaderRow.getCell(c).border = thinBorder;

  currentRowIdx++;

  // -------------------------------------------------------------
  // 3. TABLE COLUMN HEADERS
  // -------------------------------------------------------------
  const colHeaderRow = sheet.getRow(currentRowIdx);
  colHeaderRow.height = 30;

  columnsHeaders.forEach((name, idx) => {
    const cell = colHeaderRow.getCell(idx + 1);
    cell.value = name;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9.5, name: "Calibri" };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" },
    };
    cell.border = thinBorder;
  });

  currentRowIdx++;

  // -------------------------------------------------------------
  // 4. DATA ROWS
  // -------------------------------------------------------------
  devices.forEach((d) => {
    const dataRow = sheet.getRow(currentRowIdx);
    dataRow.height = 22;

    const computedService = getServiceFromBureau(d.location);
    const formattedType = d.type ? d.type.replaceAll("_", " ").trim() : "";

    const rowValues = [
      d.codeSarpi || "",
      [d.type, d.brand, d.model]
        .filter(Boolean)
        .map((value) => value!.replaceAll("_", " ").trim())
        .join(" "),
      formattedType,
      "DRIA",
      "DRIA",
      "DRIA",
      computedService,
      d.location || "",
      d.brand || "",
      d.model || "",
      d.serialNumber || "",
      "",
      d.condition || d.state || "",
      d.note || "",
    ];

    rowValues.forEach((val, colIdx) => {
      const cell = dataRow.getCell(colIdx + 1);
      cell.value = val;
      cell.font = { size: 9, name: "Calibri" };
      cell.alignment = {
        vertical: "middle",
        horizontal: colIdx === 0 || colIdx === 1 ? "left" : "center",
        wrapText: true,
      };
      cell.border = thinBorder;
    });

    currentRowIdx++;
  });

  // -------------------------------------------------------------
  // 5. FOOTER (Nom, Prénom, Date, Signature)
  // -------------------------------------------------------------
  const labelRow = sheet.getRow(currentRowIdx);
  labelRow.height = 18;

  sheet.mergeCells(`B${currentRowIdx}:E${currentRowIdx}`);
  const nameLabel = sheet.getCell(`B${currentRowIdx}`);
  nameLabel.value = "Nom & Prénom :";
  nameLabel.font = { bold: true, size: 9.5, name: "Calibri" };
  nameLabel.alignment = { vertical: "middle", horizontal: "left" };

  sheet.mergeCells(`F${currentRowIdx}:I${currentRowIdx}`);
  const dateLabel = sheet.getCell(`F${currentRowIdx}`);
  dateLabel.value = "Date :";
  dateLabel.font = { bold: true, size: 9.5, name: "Calibri" };
  dateLabel.alignment = { vertical: "middle", horizontal: "left" };

  sheet.mergeCells(`K${currentRowIdx}:N${currentRowIdx}`);
  const signLabel = sheet.getCell(`K${currentRowIdx}`);
  signLabel.value = "Signature :";
  signLabel.font = { bold: true, size: 9.5, name: "Calibri" };
  signLabel.alignment = { vertical: "middle", horizontal: "left" };

  for (let c = 2; c <= 5; c++) labelRow.getCell(c).border = thinBorder;
  for (let c = 6; c <= 9; c++) labelRow.getCell(c).border = thinBorder;
  for (let c = 11; c <= 14; c++) labelRow.getCell(c).border = thinBorder;

  currentRowIdx++;

  const signAreaRow = sheet.getRow(currentRowIdx);
  signAreaRow.height = 36;

  sheet.mergeCells(`B${currentRowIdx}:E${currentRowIdx}`);
  sheet.mergeCells(`F${currentRowIdx}:I${currentRowIdx}`);
  sheet.mergeCells(`K${currentRowIdx}:N${currentRowIdx}`);

  for (let c = 2; c <= 5; c++) signAreaRow.getCell(c).border = thinBorder;
  for (let c = 6; c <= 9; c++) signAreaRow.getCell(c).border = thinBorder;
  for (let c = 11; c <= 14; c++) signAreaRow.getCell(c).border = thinBorder;

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Disposition": `attachment; filename="Fiche_Recensement_${Date.now()}.xlsx"`,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}