import { NextResponse } from "next/server";
import type { GenerationTokenStatus } from "@/types";

const mockTokenStatus: GenerationTokenStatus = {
  tokens: 7,
  autoCap: 10,
  createdAt: new Date("2025-09-30T15:00:00Z").toISOString(),
  updatedAt: new Date("2025-10-05T02:00:00Z").toISOString(),
  lastLoginAt: new Date("2025-10-05T02:05:00Z").toISOString(),
  lastRefillAt: new Date("2025-10-04T15:00:00Z").toISOString(),
  lastConsumedAt: new Date("2025-10-02T11:00:00Z").toISOString(),
  lastConsumedSignature: "mock-signature-previous-story",
};

export async function GET() {
  return NextResponse.json({ status: mockTokenStatus });
}
