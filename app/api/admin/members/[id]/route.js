import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../../lib/prisma";
import { requireAdmin } from "../../../../../lib/guard";
import { computeTotals, groupByYear } from "../../../../../lib/fund";

// Full statement for one member (admin view).
export async function GET(req, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: { months: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { paid, due } = computeTotals(user.months);
  return NextResponse.json({
    id: user.id,
    name: user.name,
    loginId: user.loginId,
    active: user.active,
    totalPaid: paid,
    totalDue: due,
    byYear: groupByYear(user.months),
  });
}

// Reset password, rename, or activate/deactivate a member.
export async function PATCH(req, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const data = {};
  if (body.name) data.name = body.name;
  if (typeof body.active === "boolean") data.active = body.active;
  if (body.password) data.password = await bcrypt.hash(body.password, 10);

  const user = await prisma.user.update({ where: { id: params.id }, data });
  return NextResponse.json({ id: user.id, name: user.name, active: user.active });
}

export async function DELETE(req, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
