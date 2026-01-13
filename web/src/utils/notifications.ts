/**
 * Browser Notifications for Calendar Reminders
 *
 * Uses the Web Notifications API to show reminders for upcoming events.
 */

export type NotificationPermission = 'default' | 'granted' | 'denied';

/**
 * Check if browser notifications are supported
 */
export function isNotificationsSupported(): boolean {
  return 'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationsSupported()) return 'denied';
  return Notification.permission as NotificationPermission;
}

/**
 * Request permission to show notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationsSupported()) {
    console.warn('[Notifications] Not supported in this browser');
    return 'denied';
  }

  try {
    const result = await Notification.requestPermission();
    console.log('[Notifications] Permission:', result);
    return result as NotificationPermission;
  } catch (error) {
    console.error('[Notifications] Failed to request permission:', error);
    return 'denied';
  }
}

/**
 * Show a browser notification
 */
export function showNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (!isNotificationsSupported()) {
    console.warn('[Notifications] Not supported');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('[Notifications] Permission not granted');
    return null;
  }

  try {
    const notification = new Notification(title, {
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      ...options,
    });

    // Auto-close after 10 seconds
    setTimeout(() => notification.close(), 10000);

    return notification;
  } catch (error) {
    console.error('[Notifications] Failed to show notification:', error);
    return null;
  }
}

/**
 * Schedule a notification for a specific time
 */
export function scheduleNotification(
  title: string,
  scheduledTime: Date,
  options?: NotificationOptions
): { cancel: () => void } {
  const now = Date.now();
  const delay = scheduledTime.getTime() - now;

  if (delay <= 0) {
    // Time has already passed
    showNotification(title, options);
    return { cancel: () => {} };
  }

  const timeoutId = setTimeout(() => {
    showNotification(title, options);
  }, delay);

  return {
    cancel: () => clearTimeout(timeoutId),
  };
}

/**
 * Calculate the notification time for a reminder
 * @param eventStart - Event start time
 * @param reminderMinutes - Minutes before event to remind
 */
export function calculateReminderTime(
  eventStart: Date,
  reminderMinutes: number
): Date {
  return new Date(eventStart.getTime() - reminderMinutes * 60 * 1000);
}

/**
 * Format a human-readable reminder time description
 */
export function formatReminderTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} before`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} before`;
  }
  return `${hours}h ${remainingMinutes}m before`;
}
