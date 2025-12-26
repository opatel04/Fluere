export function track(event: string, payload?: Record<string, any>) {
  // console.log or push to in-memory events store for dev
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', event, payload);
  }
  // TODO: Integrate with external telemetry service when ready
}

// Event types
export const events = {
  page_view: 'page_view',
  create_client: 'create_client',
  create_task: 'create_task',
  accept_ai_task: 'accept_ai_task',
  login_success: 'login_success',
  api_error: 'api_error',
} as const;

