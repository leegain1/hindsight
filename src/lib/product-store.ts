import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const SUBMISSIONS_FILE = path.join(DATA_DIR, "submissions.json");
const APPROVED_FILE = path.join(DATA_DIR, "approved-products.json");

export interface Submission {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  ingredients: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
}

export interface ApprovedProduct {
  barcode: string;
  name: string;
  brand: string;
  ingredients: string;
  approvedAt: string;
}

function read<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function write(file: string, data: unknown) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

export function getApprovedByBarcode(barcode: string): ApprovedProduct | null {
  const list = read<ApprovedProduct[]>(APPROVED_FILE, []);
  return list.find((p) => p.barcode === barcode) ?? null;
}

export function getAllApproved(): ApprovedProduct[] {
  return read<ApprovedProduct[]>(APPROVED_FILE, []);
}

export function getAllSubmissions(): Submission[] {
  return read<Submission[]>(SUBMISSIONS_FILE, []);
}

export function addSubmission(
  data: Omit<Submission, "id" | "submittedAt" | "status">
): Submission {
  const list = read<Submission[]>(SUBMISSIONS_FILE, []);
  const item: Submission = {
    ...data,
    id: Date.now().toString(),
    submittedAt: new Date().toISOString(),
    status: "pending",
  };
  list.push(item);
  write(SUBMISSIONS_FILE, list);
  return item;
}

export function resolveSubmission(
  id: string,
  status: "approved" | "rejected"
): Submission | null {
  const list = read<Submission[]>(SUBMISSIONS_FILE, []);
  const idx = list.findIndex((s) => s.id === id);
  if (idx === -1) return null;

  list[idx].status = status;
  write(SUBMISSIONS_FILE, list);

  if (status === "approved") {
    const s = list[idx];
    const approved = read<ApprovedProduct[]>(APPROVED_FILE, []);
    // upsert
    const existing = approved.findIndex((p) => p.barcode === s.barcode);
    const entry: ApprovedProduct = {
      barcode: s.barcode,
      name: s.name,
      brand: s.brand,
      ingredients: s.ingredients,
      approvedAt: new Date().toISOString(),
    };
    if (existing >= 0) approved[existing] = entry;
    else approved.push(entry);
    write(APPROVED_FILE, approved);
  }

  return list[idx];
}
