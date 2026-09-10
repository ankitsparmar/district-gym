import { addMonths, differenceInCalendarDays, format } from "date-fns";

/** Generate a human-friendly member code like DG-2026-0001 (caller supplies the running seq). */
export function memberCode(seq: number) {
  const year = new Date().getFullYear();
  return `DG-${year}-${String(seq).padStart(4, "0")}`;
}

export function invoiceNumber(seq: number) {
  const year = new Date().getFullYear();
  return `INV-${year}-${String(seq).padStart(5, "0")}`;
}

/** Next due date = start date + N billing-interval months. Pay-per-visit plans have no recurring due date. */
export function computeNextDueDate(startDate: Date, billingIntervalMonths: number) {
  return addMonths(startDate, billingIntervalMonths);
}

export type DueBucket = "UPCOMING" | "DUE_TODAY" | "OVERDUE" | "OK";

export function classifyDueDate(nextDueDate: Date | null, reminderWindowDays = 3): DueBucket {
  if (!nextDueDate) return "OK";
  const days = differenceInCalendarDays(nextDueDate, new Date());
  if (days < 0) return "OVERDUE";
  if (days === 0) return "DUE_TODAY";
  if (days <= reminderWindowDays) return "UPCOMING";
  return "OK";
}

/**
 * Prorated credit/charge when switching plans mid-cycle.
 * Simple day-based proration: credit the unused days of the old plan,
 * charge the remaining days of the new plan's cycle at its daily rate.
 */
export function computeProration(opts: {
  oldPriceMonthly: number;
  newPriceMonthly: number;
  cycleStart: Date;
  cycleEnd: Date;
  changeDate: Date;
}) {
  const totalDays = Math.max(1, differenceInCalendarDays(opts.cycleEnd, opts.cycleStart));
  const remainingDays = Math.max(0, differenceInCalendarDays(opts.cycleEnd, opts.changeDate));

  const oldDailyRate = opts.oldPriceMonthly / totalDays;
  const newDailyRate = opts.newPriceMonthly / totalDays;

  const unusedCredit = oldDailyRate * remainingDays;
  const newCharge = newDailyRate * remainingDays;

  const net = Math.round((newCharge - unusedCredit) * 100) / 100;
  return {
    unusedCredit: Math.round(unusedCredit * 100) / 100,
    newCharge: Math.round(newCharge * 100) / 100,
    net, // positive = amount owed by member; negative = credit owed to member
  };
}

export function formatMoney(amount: number | string, currency = process.env.CURRENCY || "GBP") {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n || 0);
}

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, "d MMM yyyy");
}
