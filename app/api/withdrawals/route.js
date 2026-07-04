import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireSession } from "../../../lib/guard";
import { computeTotals } from "../../../lib/fund";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const where = session.user.role === "ADMIN" ? {} : { userId: session.user.id };
  const withdrawals = await prisma.withdrawalRequest.findMany({
    where,
    include: { user: { select: { name: true } } },
    orderBy: { requestedAt: "desc" },
  });

  return NextResponse.json(withdrawals);
}

export async function POST(req) {
  const { session, error } = await requireSession();
  if (error) return error;
  if (session.user.role !== "MEMBER") {
    return NextResponse.json({ error: "Only members submit withdrawal requests" }, { status: 403 });
  }

  const body = await req.json();
  const amount = parseInt(body.amount, 10);
  const reason = (body.reason || "").trim();

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ error: "A reason is required" }, { status: 400 });
  }

  const withdrawal = await prisma.withdrawalRequest.create({
    data: { userId: session.user.id, amount, reason },
  });

  return NextResponse.json(withdrawal, { status: 201 });
}
