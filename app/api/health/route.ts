import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "Studio Iuris",
    timestamp: new Date().toISOString(),
  });
}
