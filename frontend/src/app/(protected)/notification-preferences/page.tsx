'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NotificationSettings } from '@/components/settings/NotificationSettings';

export default function NotificationPreferencesPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notification Preferences</h1>
        <p className="text-muted-foreground">
          Manage your email notifications and daily briefing settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Customize when and how you receive notifications from Fluere
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationSettings />
        </CardContent>
      </Card>
    </div>
  );
}
