import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "LéxAmen",
    timestamp: new Date().toISOString(),
  });
}
