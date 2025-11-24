const featureFlags = {
  kanban_enabled: process.env.FEATURE_FLAGS?.includes('kanban') ?? true,
  email_integration_ui: process.env.FEATURE_FLAGS?.includes('email_integration') ?? true,
  ai_extraction_ui: process.env.FEATURE_FLAGS?.includes('email_integration') ?? true,
} as const;

export function getFeatureFlag(flag: keyof typeof featureFlags): boolean {
  return featureFlags[flag];
}

export default featureFlags;

