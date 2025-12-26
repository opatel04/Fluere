'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { userApi, type UserPreferences } from '@/lib/api/user';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// Common timezones
const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona' },
  { value: 'America/Anchorage', label: 'Alaska' },
  { value: 'Pacific/Honolulu', label: 'Hawaii' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Asia/Kolkata', label: 'India' },
  { value: 'Australia/Sydney', label: 'Sydney' },
];

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const { toast } = useToast();

  // Form state
  const [dailySummaryEnabled, setDailySummaryEnabled] = useState(true);
  const [dailySummaryTime, setDailySummaryTime] = useState('08:00');
  const [dailySummaryTimezone, setDailySummaryTimezone] = useState('UTC');
  const [weeklyReportEnabled, setWeeklyReportEnabled] = useState(true);
  const [followUpNotificationsEnabled, setFollowUpNotificationsEnabled] = useState(true);
  const [followUpThresholdDays, setFollowUpThresholdDays] = useState(2);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await userApi.getPreferences();
      setPreferences(prefs);

      // Update form state
      setDailySummaryEnabled(prefs.daily_summary_enabled);
      setDailySummaryTime(prefs.daily_summary_time || '08:00:00');
      setDailySummaryTimezone(prefs.daily_summary_timezone);
      setWeeklyReportEnabled(prefs.weekly_report_enabled);
      setFollowUpNotificationsEnabled(prefs.follow_up_notifications_enabled);
      setFollowUpThresholdDays(prefs.follow_up_threshold_days);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load preferences',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Convert time to HH:MM:SS format
      const timeFormatted = dailySummaryTime.length === 5
        ? `${dailySummaryTime}:00`
        : dailySummaryTime;

      const updatedPrefs = await userApi.updatePreferences({
        daily_summary_enabled: dailySummaryEnabled,
        daily_summary_time: timeFormatted,
        daily_summary_timezone: dailySummaryTimezone,
        weekly_report_enabled: weeklyReportEnabled,
        follow_up_notifications_enabled: followUpNotificationsEnabled,
        follow_up_threshold_days: followUpThresholdDays,
      });

      setPreferences(updatedPrefs);

      toast({
        title: 'Success',
        description: 'Notification preferences saved successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save preferences',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    try {
      setSendingTest(true);

      await userApi.sendTestDailySummary();

      toast({
        title: 'Test email sent!',
        description: 'Check your inbox for the daily summary email',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send test email',
        variant: 'destructive',
      });
    } finally {
      setSendingTest(false);
    }
  };

  // Detect user's timezone
  useEffect(() => {
    if (!preferences) return;

    // Auto-detect timezone on first load
    if (preferences.daily_summary_timezone === 'UTC') {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setDailySummaryTimezone(detectedTimezone);
    }
  }, [preferences]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Daily Summary */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="daily-summary" className="text-base font-semibold">
              Daily Summary Email
            </Label>
            <p className="text-sm text-muted-foreground">
              Get a daily briefing with your tasks, follow-ups, and client status
            </p>
          </div>
          <Switch
            id="daily-summary"
            checked={dailySummaryEnabled}
            onCheckedChange={setDailySummaryEnabled}
          />
        </div>

        {dailySummaryEnabled && (
          <div className="pl-4 space-y-4 border-l-2 border-blue-200">
            <div className="space-y-2">
              <Label htmlFor="summary-time" className="text-sm font-medium">
                Preferred Time
              </Label>
              <Input
                id="summary-time"
                type="time"
                value={dailySummaryTime.substring(0, 5)}
                onChange={(e) => setDailySummaryTime(e.target.value)}
                className="max-w-[200px]"
              />
              <p className="text-xs text-muted-foreground">
                Choose when you want to receive your daily summary
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary-timezone" className="text-sm font-medium">
                Timezone
              </Label>
              <Select value={dailySummaryTimezone} onValueChange={setDailySummaryTimezone}>
                <SelectTrigger id="summary-timezone" className="max-w-[300px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Weekly Report */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="space-y-0.5">
          <Label htmlFor="weekly-report" className="text-base font-semibold">
            Weekly Report
          </Label>
          <p className="text-sm text-muted-foreground">
            Receive a comprehensive weekly summary every Monday
          </p>
        </div>
        <Switch
          id="weekly-report"
          checked={weeklyReportEnabled}
          onCheckedChange={setWeeklyReportEnabled}
        />
      </div>

      {/* Follow-up Notifications */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="followup-notifications" className="text-base font-semibold">
              Follow-up Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Get notified when clients haven't responded
            </p>
          </div>
          <Switch
            id="followup-notifications"
            checked={followUpNotificationsEnabled}
            onCheckedChange={setFollowUpNotificationsEnabled}
          />
        </div>

        {followUpNotificationsEnabled && (
          <div className="pl-4 space-y-2 border-l-2 border-blue-200">
            <Label htmlFor="followup-threshold" className="text-sm font-medium">
              Days before alert
            </Label>
            <Input
              id="followup-threshold"
              type="number"
              min={1}
              max={30}
              value={followUpThresholdDays}
              onChange={(e) => setFollowUpThresholdDays(parseInt(e.target.value) || 2)}
              className="max-w-[120px]"
            />
            <p className="text-xs text-muted-foreground">
              Alert when no response after this many days
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-6 border-t flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handleSendTest}
          disabled={sendingTest || !dailySummaryEnabled}
        >
          {sendingTest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send Test Email
        </Button>

        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
