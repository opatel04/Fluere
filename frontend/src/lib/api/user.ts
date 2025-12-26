import { apiClient as api, aiApiClient } from './client';

export interface UserPreferences {
    id: string;
    user_id: string;
    daily_summary_enabled: boolean;
    daily_summary_time: string;
    daily_summary_timezone: string;
    weekly_report_enabled: boolean;
    follow_up_notifications_enabled: boolean;
    follow_up_threshold_days: number;
    sentiment_analysis_enabled: boolean;
    auto_process_emails: boolean;
    notification_enabled: boolean;
    created_at: string;
    updated_at: string;
}

export interface UpdatePreferencesDTO {
    daily_summary_enabled?: boolean;
    daily_summary_time?: string;
    daily_summary_timezone?: string;
    weekly_report_enabled?: boolean;
    follow_up_notifications_enabled?: boolean;
    follow_up_threshold_days?: number;
    sentiment_analysis_enabled?: boolean;
    auto_process_emails?: boolean;
    notification_enabled?: boolean;
}

export const userApi = {
    getPreferences: async () => {
        const response = await api.get<{ success: boolean; data: { preferences: UserPreferences } }>(
            '/users/preferences'
        );
        return response.data.data.preferences;
    },

    updatePreferences: async (data: UpdatePreferencesDTO) => {
        const response = await api.put<{ success: boolean; data: { preferences: UserPreferences } }>(
            '/users/preferences',
            data
        );
        return response.data.data.preferences;
    },

    sendTestDailySummary: async () => {
        // Use aiApiClient since this generates an AI summary (takes longer with GPT-4o)
        const response = await aiApiClient.post<{ success: boolean; data: { message: string } }>(
            '/users/test-daily-summary'
        );
        return response.data.data;
    },
};
