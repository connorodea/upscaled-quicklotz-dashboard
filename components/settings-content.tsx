"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings, Database, Bell, Shield, RefreshCw, Save, TrendingUp, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SettingsData {
  auctionRecoveryRate: number;
  wholesaleRecoveryRate: number;
  defaultWeeklyMSRP: number;
  shippingAllocationRate: number;
  defaultWarehouse: string;
  supplierApiSync: boolean;
  gmailIntegration: boolean;
  carrierTracking: boolean;
  newOrderAlerts: boolean;
  deliveryUpdates: boolean;
  invoiceReminders: boolean;
  twoFactorAuth: boolean;
  sessionTimeout: boolean;
}

export function SettingsContent() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load settings on mount
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading settings:", error);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Settings saved",
          description: "Your preferences have been updated successfully.",
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof SettingsData>(
    key: K,
    value: SettingsData[K]
  ) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your Sourcing Platform preferences
        </p>
      </div>

      <div className="grid gap-4 md:p-6 lg:grid-cols-2">
        {/* Projection Defaults */}
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
              <TrendingUp className="h-5 w-5 text-primary" />
              Projection Defaults
            </CardTitle>
            <CardDescription>Set default values for financial projections</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="auction-recovery">Auction Recovery Rate (%)</Label>
              <Input
                id="auction-recovery"
                type="number"
                value={settings.auctionRecoveryRate}
                onChange={(e) => updateSetting("auctionRecoveryRate", parseFloat(e.target.value))}
                className="bg-input border-border"
              />
              <p className="text-xs text-muted-foreground">
                Default: 20% (what you can sell auction items for)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wholesale-recovery">Wholesale Recovery Rate (%)</Label>
              <Input
                id="wholesale-recovery"
                type="number"
                value={settings.wholesaleRecoveryRate}
                onChange={(e) => updateSetting("wholesaleRecoveryRate", parseFloat(e.target.value))}
                className="bg-input border-border"
              />
              <p className="text-xs text-muted-foreground">
                Default: 15% (what you can sell wholesale items for)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly-msrp">Default Weekly MSRP Target ($)</Label>
              <Input
                id="weekly-msrp"
                type="number"
                value={settings.defaultWeeklyMSRP}
                onChange={(e) => updateSetting("defaultWeeklyMSRP", parseFloat(e.target.value))}
                className="bg-input border-border"
              />
              <p className="text-xs text-muted-foreground">
                Default: $500,000 (weekly sourcing target)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Data Sources */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
              <Database className="h-5 w-5 text-primary" />
              Data Sources
            </CardTitle>
            <CardDescription>Configure data sync settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground">Supplier API</p>
                <p className="text-sm text-muted-foreground">Auto-sync orders and manifests</p>
              </div>
              <Switch
                checked={settings.supplierApiSync}
                onCheckedChange={(checked) => updateSetting("supplierApiSync", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground">Gmail Integration</p>
                <p className="text-sm text-muted-foreground">Pull invoice PDFs</p>
              </div>
              <Switch
                checked={settings.gmailIntegration}
                onCheckedChange={(checked) => updateSetting("gmailIntegration", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground">Carrier Tracking</p>
                <p className="text-sm text-muted-foreground">TForce & XPO updates</p>
              </div>
              <Switch
                checked={settings.carrierTracking}
                onCheckedChange={(checked) => updateSetting("carrierTracking", checked)}
              />
            </div>
            <Button variant="outline" className="w-full gap-2 mt-4 bg-transparent">
              <RefreshCw className="h-4 w-4" />
              Sync Now
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription>Manage alert preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground">New Order Alerts</p>
                <p className="text-sm text-muted-foreground">Get notified of new orders</p>
              </div>
              <Switch
                checked={settings.newOrderAlerts}
                onCheckedChange={(checked) => updateSetting("newOrderAlerts", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground">Delivery Updates</p>
                <p className="text-sm text-muted-foreground">Shipment status changes</p>
              </div>
              <Switch
                checked={settings.deliveryUpdates}
                onCheckedChange={(checked) => updateSetting("deliveryUpdates", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground">Invoice Reminders</p>
                <p className="text-sm text-muted-foreground">Pending payment alerts</p>
              </div>
              <Switch
                checked={settings.invoiceReminders}
                onCheckedChange={(checked) => updateSetting("invoiceReminders", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Warehouse & Shipping */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
              <DollarSign className="h-5 w-5 text-primary" />
              Warehouse & Shipping
            </CardTitle>
            <CardDescription>Default warehouse and shipping settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shipping-rate">Shipping Allocation Rate (%)</Label>
              <Input
                id="shipping-rate"
                type="number"
                value={settings.shippingAllocationRate}
                onChange={(e) => updateSetting("shippingAllocationRate", parseFloat(e.target.value))}
                className="bg-input border-border"
              />
              <p className="text-xs text-muted-foreground">
                Historical avg: 64% of bid price
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-warehouse">Default Warehouse Address</Label>
              <Input
                id="default-warehouse"
                value={settings.defaultWarehouse}
                onChange={(e) => updateSetting("defaultWarehouse", e.target.value)}
                className="bg-input border-border"
              />
              <p className="text-xs text-muted-foreground">
                Texas warehouse (from last shipment)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
              <Shield className="h-5 w-5 text-primary" />
              Security
            </CardTitle>
            <CardDescription>Account and access settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground">Two-Factor Auth</p>
                <p className="text-sm text-muted-foreground">Extra layer of security</p>
              </div>
              <Switch
                checked={settings.twoFactorAuth}
                onCheckedChange={(checked) => updateSetting("twoFactorAuth", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground">Session Timeout</p>
                <p className="text-sm text-muted-foreground">Auto logout after inactivity</p>
              </div>
              <Switch
                checked={settings.sessionTimeout}
                onCheckedChange={(checked) => updateSetting("sessionTimeout", checked)}
              />
            </div>
            <Button variant="outline" className="w-full mt-4 bg-transparent">
              Change Password
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button 
          size="lg" 
          onClick={handleSave}
          disabled={saving}
          className="gap-2"
        >
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
