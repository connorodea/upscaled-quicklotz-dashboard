import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Settings, Database, Bell, Shield, RefreshCw } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64 min-h-screen p-6">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure your Sourcing Platform preferences
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
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
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-card-foreground">Gmail Integration</p>
                    <p className="text-sm text-muted-foreground">Pull invoice PDFs</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-card-foreground">Carrier Tracking</p>
                    <p className="text-sm text-muted-foreground">TForce & XPO updates</p>
                  </div>
                  <Switch defaultChecked />
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
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-card-foreground">Delivery Updates</p>
                    <p className="text-sm text-muted-foreground">Shipment status changes</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-card-foreground">Invoice Reminders</p>
                    <p className="text-sm text-muted-foreground">Pending payment alerts</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            {/* Default Values */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
                  <Settings className="h-5 w-5 text-primary" />
                  Default Values
                </CardTitle>
                <CardDescription>Set calculation defaults</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recovery-rate">Default Recovery Rate (%)</Label>
                  <Input
                    id="recovery-rate"
                    type="number"
                    defaultValue="18"
                    className="bg-input border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping-rate">Shipping Allocation Rate (%)</Label>
                  <Input
                    id="shipping-rate"
                    type="number"
                    defaultValue="5"
                    className="bg-input border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default-warehouse">Default Warehouse</Label>
                  <Input
                    id="default-warehouse"
                    defaultValue="Phoenix Warehouse"
                    className="bg-input border-border"
                  />
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
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-card-foreground">Session Timeout</p>
                    <p className="text-sm text-muted-foreground">Auto logout after inactivity</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Button variant="outline" className="w-full mt-4 bg-transparent">
                  Change Password
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button size="lg">
              Save Changes
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
