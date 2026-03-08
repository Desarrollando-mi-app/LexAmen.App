import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "Iuris Studio",
    timestamp: new Date().toISOString(),
  });
}
