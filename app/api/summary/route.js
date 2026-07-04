import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireSession } from "../../../lib/guard";
import { computeTotals } from "../../../lib/fund";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const members = await prisma.user.findMany({
    where: { role: "MEMBER" },
    include: { months: true },
  });

  let totalPaid = 0;
  let totalDue = 0;
  let cleared = 0;
  const perMember = members.map((m) => {
    const { paid, due } = computeTotals(m.months);
    totalPaid += paid;
    totalDue += due;
    if (due === 0) cleared++;
    return { id: m.id, name: m.name, paid, due };
  });

  const withdrawnAgg = await prisma.withdrawalRequest.aggregate({
    where: { status: "APPROVED" },
    _sum: { amount: true },
  });
  const withdrawn = withdrawnAgg._sum.amount || 0;

  const pendingDepositsCount = await prisma.depositRequest.count({ where: { status: "PENDING" } });
  const pendingWithdrawalsCount = await prisma.withdrawalRequest.count({ where: { status: "PENDING" } });

  return NextResponse.json({
    totalPaid,
    totalDue,
    memberCount: members.length,
    cleared,
    fundBalance: totalPaid - withdrawn,
    withdrawn,
    pendingDepositsCount,
    pendingWithdrawalsCount,
    perMember,
  });
}
