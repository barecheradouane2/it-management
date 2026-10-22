import "dotenv/config";
import path from "node:path";
import * as XLSX from "xlsx";
import { prisma } from "../lib/prisma";

type ExcelDevice = {
  "Code-Sarpi"?: unknown;
  Type?: unknown;
  Marque?: unknown;
  Modele?: unknown;
  "N°Serie"?: unknown;
};

function clean(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text || text === "/" || text.toLowerCase() === "nan") return null;
  return text;
}

type DeviceTypeValue =
  | "UNITE" | "ECRAN" | "ONDULEUR" | "IMPRIMANTE" | "LAPTOP" | "DATASHOW"
  | "POINT_ACCES" | "SWITCH" | "HARD_DISK" | "FLASH_DISK" | "TONER" | "BATTERIE";

function normalizeType(value: unknown): DeviceTypeValue | null {
  const type = clean(value)?.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!type) return null;

  const map: Record<string, DeviceTypeValue> = {
    UNITE: "UNITE",
    STATION: "UNITE",
    ECRAN: "ECRAN",
    ONDELOUR: "ONDULEUR",
    ONDULEUR: "ONDULEUR",
    IMPRIMANTE: "IMPRIMANTE",
    LAPTOP: "LAPTOP",
    DATASHOW: "DATASHOW",
    "POINT D'ACCES": "POINT_ACCES",
    POINT_ACCES: "POINT_ACCES",
    SWITCH: "SWITCH",
    "DISQUE DUR": "HARD_DISK",
    HARD_DISK: "HARD_DISK",
    "CLE USB": "FLASH_DISK",
    FLASH_DISK: "FLASH_DISK",
    TONER: "TONER",
    BATTERIE: "BATTERIE",
  };
  return map[type] ?? null;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const inputPath = args.find((arg) => arg !== "--dry-run") ?? path.resolve(process.cwd(), "pc.xlsx");
  const workbook = XLSX.readFile(inputPath);
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) throw new Error("The Excel workbook has no worksheets.");

  const rows = XLSX.utils.sheet_to_json<ExcelDevice>(workbook.Sheets[firstSheetName], {
    defval: null,
    raw: false,
  });

  console.log(`Excel file: ${inputPath}`);
  console.log(`Rows found: ${rows.length}`);
  console.log(`Mode: ${dryRun ? "DRY RUN (no inserts)" : "IMPORT"}\n`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  // Track unique values in this workbook, so repeated codes/serials aren't imported twice.
  const seenCodes = new Set<string>();
  const seenSerials = new Set<string>();

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const excelRow = index + 2; // row 1 is the header
    const codeSarpi = clean(row["Code-Sarpi"]);
    const serialNumber = clean(row["N°Serie"]);
    const rawType = clean(row.Type);
    const brand = clean(row.Marque) ?? "Inconnue";
    const model = clean(row.Modele);
    const type = normalizeType(rawType);

    if (!type) {
      console.error(
        `SKIP Excel row ${excelRow}: unknown or missing Type=${JSON.stringify(rawType)}`
      );
      skipped++;
      continue;
    }

    if (codeSarpi && seenCodes.has(codeSarpi)) {
      console.error(`SKIP Excel row ${excelRow}: duplicate Code-Sarpi in workbook: ${codeSarpi}`);
      skipped++;
      continue;
    }
    if (serialNumber && seenSerials.has(serialNumber)) {
      console.error(`SKIP Excel row ${excelRow}: duplicate N°Serie in workbook: ${serialNumber}`);
      skipped++;
      continue;
    }

    try {
      // Do not overwrite or duplicate records already present in PostgreSQL.
      const existing = await prisma.device.findFirst({
        where: {
          OR: [
            ...(codeSarpi ? [{ codeSarpi }] : []),
            ...(serialNumber ? [{ serialNumber }] : []),
          ],
        },
        select: { id: true, codeSarpi: true, serialNumber: true },
      });

      if (existing) {
        console.error(
          `SKIP Excel row ${excelRow}: already exists in DB (id=${existing.id}, ` +
          `code=${existing.codeSarpi ?? "none"}, serial=${existing.serialNumber ?? "none"})`
        );
        skipped++;
        // Mark keys so later duplicate rows in this same workbook are also skipped.
        if (codeSarpi) seenCodes.add(codeSarpi);
        if (serialNumber) seenSerials.add(serialNumber);
        continue;
      }

      if (!dryRun) {
        await prisma.device.create({
          data: {
            codeSarpi,
            serialNumber,
            type,
            brand,
            model,
            // Schema defaults: condition=NEUF, state=en_Stock, qty=1.
          },
        });
      }

      if (codeSarpi) seenCodes.add(codeSarpi);
      if (serialNumber) seenSerials.add(serialNumber);
      imported++;
      console.log(`${dryRun ? "VALID" : "IMPORTED"} row ${excelRow}: ${type} | ${brand} | ${model ?? "no model"}`);
    } catch (error: unknown) {
      failed++;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`FAILED Excel row ${excelRow}: ${message}`);
    }
  }

  console.log("\nImport finished.");
  console.log(`${dryRun ? "Would import" : "Imported"}: ${imported}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Failed:   ${failed}`);
  console.log(`Read:     ${rows.length}`);
}

main()
  .catch((error) => {
    console.error("Import stopped:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
