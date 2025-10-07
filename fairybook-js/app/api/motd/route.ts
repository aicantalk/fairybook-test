import { NextResponse } from "next/server";
import type { MotdRecord } from "@/types";

const mockMotd: MotdRecord = {
  message: "<strong>환영합니다!</strong> Gemini 프록시 연결 전까지는 모의 데이터가 제공됩니다.",
  isActive: true,
  updatedAt: new Date("2025-10-01T12:00:00Z").toISOString(),
  updatedAtKst: "2025-10-01 21:00 KST",
  updatedBy: "운영팀",
  signature: "mock-signature-001",
};

export async function GET() {
  return NextResponse.json({ motd: mockMotd });
}
