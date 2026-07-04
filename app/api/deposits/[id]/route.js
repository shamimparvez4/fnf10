import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/guard";

export async function PATCH(req, { params }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { action } = body; // "approve" | "reject"

  const deposit = await prisma.depositRequest.findUnique({ where: { id: params.id } });
  if (!deposit || deposit.status !== "PENDING") {
    return NextResponse.json({ error: "Deposit not found or already decided" }, { status: 404 });
  }

  if (action === "approve") {
    await prisma.$transaction([
      prisma.monthRecord.updateMany({
        where: { userId: deposit.userId, year: deposit.year, monthIndex: deposit.monthIndex },
        data: { status: "PAID", amount: deposit.amount },
      }),
      prisma.depositRequest.update({
        where: { id: deposit.id },
        data: { status: "APPROVED", decidedAt: new Date(), decidedBy: session.user.id },
      }),
    ]);
  } else if (action === "reject") {
    await prisma.depositRequest.update({
      where: { id: deposit.id },
      data: { status: "REJECTED", decidedAt: new Date(), decidedBy: session.user.id },
    });
  } else {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
