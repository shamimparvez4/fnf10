import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/guard";

export async function PATCH(req, { params }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { action } = body; // "approve" | "reject"

  const withdrawal = await prisma.withdrawalRequest.findUnique({ where: { id: params.id } });
  if (!withdrawal || withdrawal.status !== "PENDING") {
    return NextResponse.json({ error: "Withdrawal not found or already decided" }, { status: 404 });
  }

  if (action === "approve") {
    const [paidAgg, withdrawnAgg] = await Promise.all([
      prisma.monthRecord.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
      prisma.withdrawalRequest.aggregate({ where: { status: "APPROVED" }, _sum: { amount: true } }),
    ]);
    const balance = (paidAgg._sum.amount || 0) - (withdrawnAgg._sum.amount || 0);
    if (withdrawal.amount > balance) {
      return NextResponse.json(
        { error: `Cannot approve: requested ${withdrawal.amount} exceeds fund balance of ${balance}.` },
        { status: 400 }
      );
    }
    await prisma.withdrawalRequest.update({
      where: { id: withdrawal.id },
      data: { status: "APPROVED", decidedAt: new Date(), decidedBy: session.user.id },
    });
  } else if (action === "reject") {
    await prisma.withdrawalRequest.update({
      where: { id: withdrawal.id },
      data: { status: "REJECTED", decidedAt: new Date(), decidedBy: session.user.id },
    });
  } else {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
