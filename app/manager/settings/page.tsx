"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Bell, Mail, Shield, Users, FileText } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ManagerSettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    teamUpdates: true,
    darkMode: false,
    language: "english",
    autoApproval: false,
    reportFrequency: "weekly",
  })

  const handleSettingChange = (setting: string, value: boolean | string) => {
    setSettings((prev) => ({ ...prev, [setting]: value }))
    toast({
      title: "Setting Updated",
      description: "Your preference has been saved.",
      duration: 3000,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#228B22]">Manager Settings</h1>
        <p className="text-[#6B8E23]">Configure your team and account preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Manage your notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#6B8E23]" />
                <div>
                  <div className="font-medium">Email Notifications</div>
                  <div className="text-sm text-muted-foreground">Receive team updates via email</div>
                </div>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => handleSettingChange("emailNotifications", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#6B8E23]" />
                <div>
                  <div className="font-medium">Push Notifications</div>
                  <div className="text-sm text-muted-foreground">Get instant alerts for important updates</div>
                </div>
              </div>
              <Switch
                checked={settings.pushNotifications}
                onCheckedChange={(checked) => handleSettingChange("pushNotifications", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#6B8E23]" />
                <div>
                  <div className="font-medium">Team Updates</div>
                  <div className="text-sm text-muted-foreground">Receive notifications about team activities</div>
                </div>
              </div>
              <Switch
                checked={settings.teamUpdates}
                onCheckedChange={(checked) => handleSettingChange("teamUpdates", checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Management</CardTitle>
            <CardDescription>Configure team-related settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#6B8E23]" />
                <div>
                  <div className="font-medium">Auto-Approval</div>
                  <div className="text-sm text-muted-foreground">Automatically approve routine requests</div>
                </div>
              </div>
              <Switch
                checked={settings.autoApproval}
                onCheckedChange={(checked) => handleSettingChange("autoApproval", checked)}
              />
            </div>

            <div className="space-y-2">
              <Label>Report Frequency</Label>
              <Select
                value={settings.reportFrequency}
                onValueChange={(value) => handleSettingChange("reportFrequency", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Default Language</Label>
              <Select value={settings.language} onValueChange={(value) => handleSettingChange("language", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="spanish">Spanish</SelectItem>
                  <SelectItem value="french">French</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Team Documentation</CardTitle>
            <CardDescription>Manage team guidelines and documentation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { title: "Employee Handbook", size: "2.4 MB", updated: "2 days ago" },
                { title: "Safety Guidelines", size: "1.8 MB", updated: "1 week ago" },
                { title: "Reporting Templates", size: "956 KB", updated: "3 days ago" },
              ].map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-[#6B8E23]" />
                    <div>
                      <div className="font-medium">{doc.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {doc.size} • Updated {doc.updated}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline">Download</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

