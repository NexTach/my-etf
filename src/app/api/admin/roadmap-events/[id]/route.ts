import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminUser } from "@/lib/admin";
import {
  ROADMAP_EVENT_CATEGORIES,
  ROADMAP_EVENT_KINDS,
  addDaysToDateKey,
  deleteRoadmapEvent,
  isValidDateKey,
  kstDateKey,
  updateRoadmapEvent
} from "@/lib/roadmap";
import { getUserSession } from "@/lib/session";

const idSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/);

const updateSchema = z
  .object({
    eventDate: z.string().refine(isValidDateKey).optional(),
    kind: z.enum(ROADMAP_EVENT_KINDS).optional(),
    category: z.enum(ROADMAP_EVENT_CATEGORIES).optional(),
    label: z.string().trim().max(160).optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

async function authorizedEventId(context: RouteContext) {
  const user = await getUserSession();
  if (!isAdminUser(user)) {
    return {
      response: NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 })
    };
  }

  const params = await context.params;
  const parsedId = idSchema.safeParse(params.id);
  if (!parsedId.success) {
    return {
      response: NextResponse.json({ error: "핀 ID가 올바르지 않습니다." }, { status: 400 })
    };
  }

  return { id: parsedId.data };
}

export async function PATCH(request: Request, context: RouteContext) {
  const authorization = await authorizedEventId(context);
  if ("response" in authorization) return authorization.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "입력값을 확인해 주세요.", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  if (parsed.data.eventDate && !isEditableDate(parsed.data.eventDate)) {
    return NextResponse.json(
      { error: "핀은 오늘부터 30일 안의 날짜로만 이동할 수 있습니다." },
      { status: 400 }
    );
  }

  try {
    const event = await updateRoadmapEvent(authorization.id, parsed.data);
    return NextResponse.json({ event });
  } catch (error) {
    const code = errorCode(error);
    if (code === "P2002") {
      return NextResponse.json(
        { error: "같은 공시가 이미 이 날짜에 등록되어 있습니다." },
        { status: 409 }
      );
    }
    if (code === "P2025") {
      return NextResponse.json({ error: "핀을 찾을 수 없습니다." }, { status: 404 });
    }

    console.error("Roadmap event update failed", { code });
    return NextResponse.json({ error: "핀을 저장하지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authorization = await authorizedEventId(context);
  if ("response" in authorization) return authorization.response;

  try {
    await deleteRoadmapEvent(authorization.id);
    return NextResponse.json({ deleted: true, id: authorization.id });
  } catch (error) {
    const code = errorCode(error);
    if (code === "P2025") {
      return NextResponse.json({ error: "핀을 찾을 수 없습니다." }, { status: 404 });
    }

    console.error("Roadmap event deletion failed", { code });
    return NextResponse.json({ error: "핀을 삭제하지 못했습니다." }, { status: 500 });
  }
}
