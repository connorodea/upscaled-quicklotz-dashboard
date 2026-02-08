import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SETTINGS_FILE = "/root/upscaled-tl/data/settings.json";

// Default settings
const DEFAULT_SETTINGS = {
  auctionRecoveryRate: 20,
  wholesaleRecoveryRate: 15,
  defaultWeeklyMSRP: 500000,
  shippingAllocationRate: 64,
  defaultWarehouse: "2820 N Great Southwest Pkwy, Grand Prairie, TX 75050",
  supplierApiSync: true,
  gmailIntegration: true,
  carrierTracking: true,
  newOrderAlerts: true,
  deliveryUpdates: true,
  invoiceReminders: true,
  twoFactorAuth: false,
  sessionTimeout: true,
};

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
      // Merge with defaults to ensure new settings are included
      return NextResponse.json({ ...DEFAULT_SETTINGS, ...data });
    }
    
    // Return defaults if no settings file exists
    return NextResponse.json(DEFAULT_SETTINGS);
  } catch (error) {
    console.error("Error reading settings:", error);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function POST(request: Request) {
  try {
    const settings = await request.json();
    
    // Ensure directory exists
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Save settings
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    
    return NextResponse.json({ 
      success: true, 
      message: "Settings saved successfully" 
    });
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json(
      { success: false, message: "Failed to save settings" },
      { status: 500 }
    );
  }
}
