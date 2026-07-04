import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireSession } from "../../../lib/guard";
import { RATE } from "../../../lib/fund";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const where = session.user.role === "ADMIN" ? {} : { userId: session.user.id };
  const deposits = await prisma.depositRequest.findMany({
    where,
    include: { user: { select: { name: true } } },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json(deposits);
}

// A member submits a deposit for one of their DUE months, for admin approval.
export async function POST(req) {
  const { session, error } = await requireSession();
  if (error) return error;
  if (session.user.role !== "MEMBER") {
    return NextResponse.json({ error: "Only members submit deposits" }, { status: 403 });
  }

  const body = await req.json();
  const { monthRecordId, amount } = body;

  const month = await prisma.monthRecord.findUnique({ where: { id: monthRecordId } });
  if (!month || month.userId !== session.user.id) {
    return NextResponse.json({ error: "Month not found" }, { status: 404 });
  }
  if (month.status !== "DUE") {
    return NextResponse.json({ error: "That month is not currently due" }, { status: 400 });
  }

  const deposit = await prisma.depositRequest.create({
    data: {
      userId: session.user.id,
      year: month.year,
      monthIndex: month.monthIndex,
      monthLabel: month.monthLabel,
      amount: amount || RATE,
    },
  });

  return NextResponse.json(deposit, { status: 201 });
}
