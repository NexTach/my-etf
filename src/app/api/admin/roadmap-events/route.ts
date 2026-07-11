import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminUser } from "@/lib/admin";
import {
  ROADMAP_EVENT_CATEGORIES,
  ROADMAP_EVENT_KINDS,
  addDaysToDateKey,
  createRoadmapEvent,
  isValidDateKey,
  kstDateKey
} from "@/lib/roadmap";
import { getUserSession } from "@/lib/session";

const idSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/);

const createSchema = z
  .object({
    disclosureId: idSchema,
    eventDate: z.string().refine(isValidDateKey),
    kind: z.enum(ROADMAP_EVENT_KINDS),
    category: z.enum(ROADMAP_EVENT_CATEGORIES),
    label: z.string().trim().max(160).optional()
  })
  .strict();

function errorCode(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code;
  if (typeof error === "object" && error !== null && "code" in error) {
    return String(error.code);
  }
  return undefined;
}

function isEditableDate(date: string) {
  const today = kstDateKey();
  return date >= today && date <= addDaysToDateKey(today, 30);
}

export async function POST(request: Request) {
  const user = await getUserSession();
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "입력값을 확인해 주세요.", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  if (!isEditableDate(parsed.data.eventDate)) {
    return NextResponse.json(
      { error: "핀은 오늘부터 30일 안의 날짜에만 추가할 수 있습니다." },
      { status: 400 }
    );
  }

  try {
    const event = await createRoadmapEvent(parsed.data);
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    const code = errorCode(error);
    if (code === "P2002") {
      return NextResponse.json(
        { error: "같은 공시가 이미 이 날짜에 등록되어 있습니다." },
        { status: 409 }
      );
    }
    if (code === "P2003") {
      return NextResponse.json({ error: "공시를 찾을 수 없습니다." }, { status: 404 });
    }

    console.error("Roadmap event creation failed", { code });
    return NextResponse.json({ error: "핀을 추가하지 못했습니다." }, { status: 500 });
  }
}
