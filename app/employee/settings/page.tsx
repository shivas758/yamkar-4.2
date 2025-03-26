"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Bell, Mail, MessageSquare, Moon, Shield, Smartphone, Languages } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function SettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    smsNotifications: false,
    darkMode: false,
    language: "english",
    twoFactorAuth: false,
  })

  const handleSettingChange = (setting: string, value: boolean | string) => {
    setSettings((prev) => ({ ...prev, [setting]: value }))
    toast({
      title: "Setting Updated",
      description: "Your preference has been saved.",
      duration: 3000,
    })
  }

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, this would update the password in the backend
    toast({
      title: "Password Updated",
      description: "Your password has been successfully changed.",
      duration: 3000,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#228B22]">Settings</h1>
        <p className="text-[#6B8E23]">Manage your account preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Configure how you want to receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#6B8E23]" />
                <div>
                  <div className="font-medium">Email Notifications</div>
                  <div className="text-sm text-muted-foreground">Receive notifications via email</div>
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
                  <div className="text-sm text-muted-foreground">Receive push notifications on your device</div>
                </div>
              </div>
              <Switch
                checked={settings.pushNotifications}
                onCheckedChange={(checked) => handleSettingChange("pushNotifications", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#6B8E23]" />
                <div>
                  <div className="font-medium">SMS Notifications</div>
                  <div className="text-sm text-muted-foreground">Receive notifications via SMS</div>
                </div>
              </div>
              <Switch
                checked={settings.smsNotifications}
                onCheckedChange={(checked) => handleSettingChange("smsNotifications", checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize your app experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-[#6B8E23]" />
                <div>
                  <div className="font-medium">Dark Mode</div>
                  <div className="text-sm text-muted-foreground">Toggle dark mode theme</div>
                </div>
              </div>
              <Switch
                checked={settings.darkMode}
                onCheckedChange={(checked) => handleSettingChange("darkMode", checked)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-[#6B8E23]" />
                <Label>Language</Label>
              </div>
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

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage your account security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#6B8E23]" />
                <div>
                  <div className="font-medium">Two-Factor Authentication</div>
                  <div className="text-sm text-muted-foreground">Add an extra layer of security</div>
                </div>
              </div>
              <Switch
                checked={settings.twoFactorAuth}
                onCheckedChange={(checked) => handleSettingChange("twoFactorAuth", checked)}
              />
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type="password" />
              </div>
              <Button type="submit" className="w-full bg-[#228B22] hover:bg-[#1a6b1a]">
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mobile App</CardTitle>
            <CardDescription>Manage your mobile app settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-[#6B8E23]" />
              <div>
                <div className="font-medium">Connected Devices</div>
                <div className="text-sm text-muted-foreground">iPhone 13 Pro • Last active: 2 minutes ago</div>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full text-[#E2725B] border-[#E2725B] hover:bg-[#E2725B] hover:text-white"
              onClick={() => {
                toast({
                  title: "Device Disconnected",
                  description: "Your device has been disconnected successfully.",
                  duration: 3000,
                })
              }}
            >
              Disconnect Device
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

