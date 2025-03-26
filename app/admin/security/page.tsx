"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Shield, Key, Lock, UserCog, AlertTriangle, Clock } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function SecurityPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState({
    twoFactorAuth: true,
    passwordExpiry: "90",
    sessionTimeout: "30",
    loginAttempts: "3",
    ipWhitelisting: false,
    auditLogging: true,
  })

  const handleSettingChange = (setting: string, value: boolean | string) => {
    setSettings((prev) => ({ ...prev, [setting]: value }))
    toast({
      title: "Security Setting Updated",
      description: "The security configuration has been updated successfully.",
      duration: 3000,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#228B22]">Security Settings</h1>
        <p className="text-[#6B8E23]">Configure system-wide security settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Settings</CardTitle>
            <CardDescription>Configure authentication security measures</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#6B8E23]" />
                <div>
                  <div className="font-medium">Two-Factor Authentication</div>
                  <div className="text-sm text-muted-foreground">Require 2FA for all users</div>
                </div>
              </div>
              <Switch
                checked={settings.twoFactorAuth}
                onCheckedChange={(checked) => handleSettingChange("twoFactorAuth", checked)}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="h-4 w-4 text-[#6B8E23]" />
                Password Expiry (Days)
              </Label>
              <Select
                value={settings.passwordExpiry}
                onValueChange={(value) => handleSettingChange("passwordExpiry", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select expiry period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#6B8E23]" />
                Session Timeout (Minutes)
              </Label>
              <Select
                value={settings.sessionTimeout}
                onValueChange={(value) => handleSettingChange("sessionTimeout", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timeout period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="120">120 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Access Control</CardTitle>
            <CardDescription>Manage access security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#6B8E23]" />
                Failed Login Attempts
              </Label>
              <Select
                value={settings.loginAttempts}
                onValueChange={(value) => handleSettingChange("loginAttempts", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select attempt limit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 attempts</SelectItem>
                  <SelectItem value="5">5 attempts</SelectItem>
                  <SelectItem value="10">10 attempts</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-[#6B8E23]" />
                <div>
                  <div className="font-medium">IP Whitelisting</div>
                  <div className="text-sm text-muted-foreground">Restrict access to specific IP addresses</div>
                </div>
              </div>
              <Switch
                checked={settings.ipWhitelisting}
                onCheckedChange={(checked) => handleSettingChange("ipWhitelisting", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCog className="h-4 w-4 text-[#6B8E23]" />
                <div>
                  <div className="font-medium">Audit Logging</div>
                  <div className="text-sm text-muted-foreground">Track all security-related events</div>
                </div>
              </div>
              <Switch
                checked={settings.auditLogging}
                onCheckedChange={(checked) => handleSettingChange("auditLogging", checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Security Audit Log</CardTitle>
            <CardDescription>Recent security events and activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  event: "Failed login attempt",
                  user: "john.doe@example.com",
                  ip: "192.168.1.1",
                  time: "2 minutes ago",
                },
                {
                  event: "Password changed",
                  user: "admin@yamkar.com",
                  ip: "192.168.1.100",
                  time: "1 hour ago",
                },
                {
                  event: "2FA enabled",
                  user: "manager@yamkar.com",
                  ip: "192.168.1.50",
                  time: "3 hours ago",
                },
                {
                  event: "New device login",
                  user: "sarah@yamkar.com",
                  ip: "192.168.1.75",
                  time: "5 hours ago",
                },
              ].map((log, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{log.event}</div>
                    <div className="text-sm text-muted-foreground">
                      {log.user} • {log.ip}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">{log.time}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

