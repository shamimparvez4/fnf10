import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireSession } from "../../../lib/guard";
import { computeTotals, groupByYear } from "../../../lib/fund";

// Returns the signed-in member's own statement.
export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const months = await prisma.monthRecord.findMany({
    where: { userId: session.user.id },
    orderBy: [{ year: "asc" }, { monthIndex: "asc" }],
  });

  const { paid, due } = computeTotals(months);

  return NextResponse.json({
    name: session.user.name,
    totalPaid: paid,
    totalDue: due,
    byYear: groupByYear(months),
  });
}
