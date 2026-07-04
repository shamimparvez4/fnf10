export const RATE = 2000;

export const BN_MONTHS = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];

export function fmt(n) {
  return Number(n || 0).toLocaleString("en-US");
}

// Totals (paid / due) for one member across a set of MonthRecord rows.
export function computeTotals(monthRecords) {
  let paid = 0;
  let due = 0;
  for (const m of monthRecords) {
    if (m.status === "PAID") paid += m.amount;
    else if (m.status === "DUE") due += RATE;
  }
  return { paid, due };
}

// Fund-wide balance: total collected (paid across all members) minus approved withdrawals.
export function computeFundBalance(allPaidTotal, approvedWithdrawalsTotal) {
  const collected = allPaidTotal;
  const withdrawn = approvedWithdrawalsTotal;
  return { collected, withdrawn, balance: collected - withdrawn };
}

// Group a flat list of MonthRecord rows into { [year]: MonthRecord[] } sorted by monthIndex.
export function groupByYear(monthRecords) {
  const byYear = {};
  for (const m of monthRecords) {
    if (!byYear[m.year]) byYear[m.year] = [];
    byYear[m.year].push(m);
  }
  Object.values(byYear).forEach((arr) => arr.sort((a, b) => a.monthIndex - b.monthIndex));
  return byYear;
}
