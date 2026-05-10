import { z } from "zod";
import type { ErpParsedRow } from "./types";

const emailSchema = z.string().email();
const mobileRegex = /^[+0-9\s\-()]{6,20}$/;

export function validateRow(row: ErpParsedRow): string[] {
  const errors: string[] = [];

  if (!row.full_name || row.full_name.trim().length < 2) errors.push("Missing or invalid name");
  if (!row.enrollment_no || row.enrollment_no.trim().length < 1) errors.push("Missing enrollment number");
  if (!row.email || !emailSchema.safeParse(row.email.trim()).success) errors.push("Invalid email");
  if (row.mobile && !mobileRegex.test(row.mobile.trim())) errors.push("Invalid mobile");

  return errors;
}
