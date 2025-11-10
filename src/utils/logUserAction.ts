import { apiCall } from './api';

/**
 * Log user action for analytics
 * @param action - Type of action: 'view', 'click', 'complete', etc.
 * @param feature - Feature name: 'chat', 'diary', 'report', 'garden', 'mission', 'wave', 'profile'
 * @param metadata - Additional metadata (optional)
 */
export async function logUserAction(
  action: string,
  feature: string,
  metadata?: Record<string, any>
): Promise<void> {
  // Temporarily disabled to reduce API load and prevent 429 errors
  // This should be re-enabled with proper rate limiting or batching
  console.log('[Analytics] User action:', { action, feature, metadata });
  return;
  
  // Original implementation (disabled):
  // try {
  //   await apiCall('/logs/action', {
  //     method: 'POST',
  //     body: JSON.stringify({
  //       action,
  //       feature,
  //       metadata: metadata || {}
  //     })
  //   });
  // } catch (error) {
  //   // Silently fail - logging should not interrupt user experience
  //   console.log('Failed to log user action:', error);
  // }
}
