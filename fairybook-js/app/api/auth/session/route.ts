import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    authenticated: false,
    user: null,
    message: "Firebase 인증 연결 전까지는 목업 세션이 사용됩니다.",
  });
}
