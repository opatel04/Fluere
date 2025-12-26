import { apiClient as api, aiApiClient } from './client';
import { ProjectSpec, SpecVersion, UpdateSpecDTO, SpecContent } from '../types/spec';

export const specApi = {
    generateSpec: async (emailId: string) => {
        const response = await aiApiClient.post<{ success: boolean; data: { spec: ProjectSpec; version: SpecVersion } }>(
            '/specs/generate',
            { emailId }
        );
        return response.data.data;
    },

    getSpec: async (id: string) => {
        const response = await api.get<{ success: boolean; data: { spec: ProjectSpec; content: any } }>(
            `/specs/${id}`
        );
        return response.data.data;
    },

    updateSpec: async (id: string, data: UpdateSpecDTO) => {
        const response = await api.put<{ success: boolean; data: SpecVersion }>(
            `/specs/${id}`,
            data
        );
        return response.data.data;
    },

    lockSpec: async (id: string) => {
        const response = await api.post<{ success: boolean; data: ProjectSpec }>(
            `/specs/${id}/lock`
        );
        return response.data.data;
    },

    syncToTrello: async (id: string) => {
        const response = await api.post<{ success: boolean; message: string }>(
            `/specs/${id}/sync-trello`
        );
        return response.data;
    },

    getVersions: async (id: string) => {
        const response = await api.get<{ success: boolean; data: SpecVersion[] }>(
            `/specs/${id}/versions`
        );
        return response.data.data;
    },

    listSpecs: async () => {
        const response = await api.get<{ success: boolean; data: ProjectSpec[] }>(
            '/specs'
        );
        return response.data.data;
    },
    async chatWithSpec(specId: string, message: string): Promise<{ spec: ProjectSpec; content: SpecContent; reply: string }> {
        const response = await aiApiClient.post(`/specs/${specId}/chat`, { message });
        return response.data.data;
    },

    getScopeCreepAlerts: async (specId: string) => {
        const response = await api.get<{ success: boolean; data: any[] }>(
            `/specs/${specId}/alerts`
        );
        return response.data.data;
    },

    resolveScopeCreepAlert: async (alertId: string, resolutionType: string) => {
        const response = await api.post<{ success: boolean; data: any }>(
            `/specs/alerts/${alertId}/resolve`,
            { resolutionType }
        );
        return response.data.data;
    },

    generateAlertResponse: async (alertId: string, tone: 'friendly' | 'professional' | 'firm') => {
        const response = await aiApiClient.post<{ success: boolean; data: { response: string } }>(
            `/specs/alerts/${alertId}/generate-response`,
            { tone }
        );
        return response.data.data.response;
    },

    compareVersions: async (specId: string, version1: number, version2: number) => {
        const response = await api.get<{ success: boolean; data: any }>(
            `/specs/${specId}/versions/compare?v1=${version1}&v2=${version2}`
        );
        return response.data.data;
    },
};
