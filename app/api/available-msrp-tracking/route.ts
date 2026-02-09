import { NextResponse } from "next/server";
import fs from "fs";

const WEEKLY_REPORT_PATH = "/root/upscaled-tl-data/data/techliquidators/weekly_report.json";
const DB_PATH = "/root/upscaled-tl-data/data/techliquidators/available_msrp_tracking.db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "weekly";

    // For now, just return weekly report (simplest)
    if (fs.existsSync(WEEKLY_REPORT_PATH)) {
      const data = JSON.parse(fs.readFileSync(WEEKLY_REPORT_PATH, "utf-8"));
      return NextResponse.json(data);
    }

    return NextResponse.json({ weeks: [], message: "No tracking data yet" });
  } catch (error) {
    console.error("Error fetching tracking data:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracking data" },
      { status: 500 }
    );
  }
}
