import "dotenv/config";
import path from "node:path";
import * as XLSX from "xlsx";
import { prisma } from "../lib/prisma";

type ExcelEmployee = {
  FullName?: unknown;
  Function?: unknown;
  Email?: unknown;
  Phone?: unknown;
  Service?: unknown;
};

type ServiceValue =
  | "RH"
  | "BET"
  | "IT"
  | "QAQC"
  | "SMI"
  | "COMPTABLE"
  | "FINANCE"
  | "CND"
  | "COST"
  | "ENGINEERING"
  | "GDS"
  | "TOPO"
  | "PLANNING"
  | "HSE"
  | "LOGISTIC"
  | "ARCHIVES"
  | "CONSTRUCTION"
  | "DCC"
  | "SAS"
  | "OTHER";

function clean(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text || text === "/" || text.toLowerCase() === "nan") return null;
  return text;
}

/**
 * Normalizes explicit Service values or infers them from job functions.
 */
function normalizeService(serviceRaw: unknown, functionRaw: unknown): ServiceValue | null {
  const direct = clean(serviceRaw)?.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const directMap: Record<string, ServiceValue> = {
    RH: "RH",
    BET: "BET",
    IT: "IT",
    QAQC: "QAQC",
    "QA/QC": "QAQC",
    SMI: "SMI",
    COMPTABLE: "COMPTABLE",
    FINANCE: "FINANCE",
    CND: "CND",
    COST: "COST",
    ENGINEERING: "ENGINEERING",
    GDS: "GDS",
    TOPO: "TOPO",
    PLANNING: "PLANNING",
    HSE: "HSE",
    LOGISTIC: "LOGISTIC",
    ARCHIVES: "ARCHIVES",
    CONSTRUCTION: "CONSTRUCTION",
    DCC: "DCC",
    SAS: "SAS",
    OTHER: "OTHER",
  };

  if (direct && directMap[direct]) {
    return directMap[direct];
  }

  // Infer service from job title / function if not explicitly provided
  const fn = clean(functionRaw)?.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!fn) return null;

  if (fn.includes("IT") || fn.includes("INFORMATIQUE")) return "IT";
  if (fn.includes("BET") || fn.includes("B.TECH") || fn.includes("ETUDE")) return "BET";
  if (fn.includes("QAQC") || fn.includes("QA/QC") || fn.includes("QUALITE")) return "QAQC";
  if (fn.includes("HSE") || fn.includes("SECURITE") || fn.includes("CQSSE")) return "HSE";
  if (fn.includes("PLANNING")) return "PLANNING";
  if (fn.includes("COMPTABLE")) return "COMPTABLE";
  if (fn.includes("FINANC")) return "FINANCE";
  if (fn.includes("RH") || fn.includes("GRH") || fn.includes("SOCIAL")) return "RH";
  if (fn.includes("GDS") || fn.includes("GDG")) return "GDS";
  if (fn.includes("CND")) return "CND";
  if (fn.includes("COST")) return "COST";
  if (fn.includes("DCC")) return "DCC";
  if (fn.includes("TOPO")) return "TOPO";
  if (fn.includes("ARCHIVE")) return "ARCHIVES";
  if (fn.includes("TRAVAUX") || fn.includes("CONSTRUCTION") || fn.includes("BASE")) return "CONSTRUCTION";
  if (fn.includes("MATERIEL") || fn.includes("PARC") || fn.includes("LOGISTIC")) return "LOGISTIC";
  if (fn.includes("ING") || fn.includes("ENGINEER") || fn.includes("PIPING") || fn.includes("MECANIQUE") || fn.includes("INSTRUMENTATION")) {
    return "ENGINEERING";
  }

  return "OTHER";
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const inputPath = args.find((arg) => arg !== "--dry-run") ?? path.resolve(process.cwd(), "employe.xlsx");
  const workbook = XLSX.readFile(inputPath);
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) throw new Error("The Excel workbook has no worksheets.");

  const rows = XLSX.utils.sheet_to_json<ExcelEmployee>(workbook.Sheets[firstSheetName], {
    defval: null,
    raw: false,
  });

  console.log(`Excel file: ${inputPath}`);
  console.log(`Rows found: ${rows.length}`);
  console.log(`Mode: ${dryRun ? "DRY RUN (no inserts)" : "IMPORT"}\n`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  // Track unique names and emails in this workbook to avoid duplicate inserts
  const seenFullnames = new Set<string>();
  const seenEmails = new Set<string>();

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const excelRow = index + 2; // Row 1 is header

    const fullname = clean(row.FullName);
    const jobFunction = clean(row.Function);
    const email = clean(row.Email)?.toLowerCase() ?? null;
    const phone = clean(row.Phone);
    const service = normalizeService(row.Service, jobFunction);

    // Skip empty lines (employe.xlsx often has blank spacer rows)
    if (!fullname) {
      continue;
    }

    const normalizedNameKey = fullname.toLowerCase();

    if (seenFullnames.has(normalizedNameKey)) {
      console.error(`SKIP Excel row ${excelRow}: duplicate FullName in workbook: ${fullname}`);
      skipped++;
      continue;
    }

    if (email && seenEmails.has(email)) {
      console.error(`SKIP Excel row ${excelRow}: duplicate Email in workbook: ${email}`);
      skipped++;
      continue;
    }

    try {
      // Check database to prevent duplicating existing employees
      const existing = await prisma.employee.findFirst({
        where: {
          OR: [
            { fullname: { equals: fullname, mode: "insensitive" } },
            ...(email ? [{ email }] : []),
          ],
        },
        select: { id: true, fullname: true, email: true },
      });

      if (existing) {
        console.error(
          `SKIP Excel row ${excelRow}: already exists in DB (id=${existing.id}, ` +
          `fullname="${existing.fullname}", email=${existing.email ?? "none"})`
        );
        skipped++;
        seenFullnames.add(normalizedNameKey);
        if (email) seenEmails.add(email);
        continue;
      }

      if (!dryRun) {
        await prisma.employee.create({
          data: {
            fullname,
            function: jobFunction,
            email,
            phone,
            service,
          },
        });
      }

      seenFullnames.add(normalizedNameKey);
      if (email) seenEmails.add(email);
      imported++;
      console.log(
        `${dryRun ? "VALID" : "IMPORTED"} row ${excelRow}: ${fullname} | ${jobFunction ?? "No Function"} | Service: ${service ?? "None"}`
      );
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