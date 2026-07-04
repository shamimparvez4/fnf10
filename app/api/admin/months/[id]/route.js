import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAdmin } from "../../../../../lib/guard";
import { RATE } from "../../../../../lib/fund";

// Lets an admin directly correct a month (e.g. mark historical months paid
// during migration, or fix a mistake) without going through the
// submit -> approve deposit flow.
export async function PATCH(req, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { status, amount } = body;
  if (!["NA", "DUE", "PAID"].includes(status)) {
    return NextResponse.json({ error: "status must be NA, DUE, or PAID" }, { status: 400 });
  }

  const record = await prisma.monthRecord.update({
    where: { id: params.id },
    data: {
      status,
      amount: status === "PAID" ? amount ?? RATE : 0,
    },
  });

  return NextResponse.json(record);
}
