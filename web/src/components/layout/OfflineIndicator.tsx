/**
 * Offline Indicator Component
 *
 * Shows a banner when the user is offline.
 */

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import './layout.css';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="offline-indicator">
      <span className="offline-icon">📡</span>
      <span>You're offline. Changes will sync when you reconnect.</span>
    </div>
  );
}
