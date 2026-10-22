import "dotenv/config";
import path from "node:path";
import * as XLSX from "xlsx";
import { prisma } from "../lib/prisma";

type ExcelAssignment = {
  codeSarpi?: unknown;
  type?: unknown;
  brand?: unknown;
  model?: unknown;
  serialNumber?: unknown;
  fullname?: unknown;
  bureau?: unknown;
  block?: unknown;
};

function clean(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text || text === "/" || text.toLowerCase() === "nan") return null;
  return text;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const inputPath =
    args.find((arg) => arg !== "--dry-run") ??
    path.resolve(process.cwd(), "Assignment.xlsx");

  const workbook = XLSX.readFile(inputPath);
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) throw new Error("The Excel workbook has no worksheets.");

  const rows = XLSX.utils.sheet_to_json<ExcelAssignment>(
    workbook.Sheets[firstSheetName],
    {
      defval: null,
      raw: false,
    }
  );

  console.log(`Excel file: ${inputPath}`);
  console.log(`Rows found: ${rows.length}`);
  console.log(`Mode: ${dryRun ? "DRY RUN (no inserts)" : "IMPORT"}\n`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  // Track devices assigned within this run to avoid duplicate assignments in the same file
  const seenAssignedDeviceIds = new Set<number>();

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const excelRow = index + 2; // Row 1 is header

    const fullname = clean(row.fullname);
    const codeSarpi = clean(row.codeSarpi);
    const serialNumber = clean(row.serialNumber);
    const bureau = clean(row.bureau);

    // Skip empty lines or rows missing employee name
    if (!fullname) {
      skipped++;
      continue;
    }

    // A device must have at least a serialNumber or codeSarpi to be identified in the DB
    if (!codeSarpi && !serialNumber) {
      console.error(
        `SKIP Excel row ${excelRow}: No serialNumber or codeSarpi provided for employee "${fullname}"`
      );
      skipped++;
      continue;
    }

    try {
      // 1. Locate the Employee in DB
      const employee = await prisma.employee.findFirst({
        where: {
          fullname: { equals: fullname, mode: "insensitive" },
        },
        select: { id: true, fullname: true },
      });

      if (!employee) {
        console.error(
          `SKIP Excel row ${excelRow}: Employee "${fullname}" not found in database.`
        );
        skipped++;
        continue;
      }

      // 2. Locate the Device in DB
      const device = await prisma.device.findFirst({
        where: {
          OR: [
            ...(serialNumber ? [{ serialNumber }] : []),
            ...(codeSarpi ? [{ codeSarpi }] : []),
          ],
        },
        select: { id: true, type: true, serialNumber: true, codeSarpi: true },
      });

      if (!device) {
        console.error(
          `SKIP Excel row ${excelRow}: Device (code=${codeSarpi ?? "none"}, serial=${serialNumber ?? "none"}) not found in database.`
        );
        skipped++;
        continue;
      }

      // 3. Check for duplicates in workbook execution
      if (seenAssignedDeviceIds.has(device.id)) {
        console.error(
          `SKIP Excel row ${excelRow}: Device ID ${device.id} is already processed in this workbook run.`
        );
        skipped++;
        continue;
      }

      // 4. Check if this active assignment already exists in PostgreSQL
      const existingAssignment = await prisma.assignment.findFirst({
        where: {
          deviceId: device.id,
          employeeId: employee.id,
          returnedAt: null,
        },
      });

      if (existingAssignment) {
        console.error(
          `SKIP Excel row ${excelRow}: Device ID ${device.id} is already assigned to "${employee.fullname}" (assignment ID=${existingAssignment.id}).`
        );
        seenAssignedDeviceIds.add(device.id);
        skipped++;
        continue;
      }

      // 5. Create assignment and transition device state to en_Service
      if (!dryRun) {
        await prisma.$transaction([
          prisma.assignment.create({
            data: {
              deviceId: device.id,
              employeeId: employee.id,
              bureau,
              condition: "NEUF",
              qty: 1,
            },
          }),
          prisma.device.update({
            where: { id: device.id },
            data: { state: "en_Service" },
          }),
        ]);
      }

      seenAssignedDeviceIds.add(device.id);
      imported++;
      console.log(
        `${dryRun ? "VALID" : "ASSIGNED"} row ${excelRow}: ${employee.fullname} -> ${device.type} (Serial: ${device.serialNumber ?? "none"}, Code: ${device.codeSarpi ?? "none"})`
      );
    } catch (error: unknown) {
      failed++;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`FAILED Excel row ${excelRow}: ${message}`);
    }
  }

  console.log("\nImport finished.");
  console.log(`${dryRun ? "Would assign" : "Assigned"}: ${imported}`);
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