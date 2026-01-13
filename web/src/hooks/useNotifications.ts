/**
 * useNotifications Hook
 *
 * Manages browser notification permissions and schedules reminders
 * for upcoming calendar events.
 */

import type { CalendarEvent } from '@/types';
import {
  calculateReminderTime,
  formatReminderTime,
  getNotificationPermission,
  isNotificationsSupported,
  requestNotificationPermission,
  scheduleNotification,
  type NotificationPermission,
} from '@/utils/notifications';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ScheduledReminder {
  eventId: string;
  reminderMinutes: number;
  cancel: () => void;
}

export interface UseNotificationsResult {
  isSupported: boolean;
  permission: NotificationPermission;
  requestPermission: () => Promise<void>;
  scheduleReminders: (events: CalendarEvent[]) => void;
  clearReminders: () => void;
  scheduledCount: number;
}

// Check how far ahead to schedule reminders (24 hours)
const SCHEDULE_AHEAD_MS = 24 * 60 * 60 * 1000;

export function useNotifications(): UseNotificationsResult {
  const [permission, setPermission] = useState<NotificationPermission>(
    getNotificationPermission()
  );
  const scheduledReminders = useRef<ScheduledReminder[]>([]);
  const [scheduledCount, setScheduledCount] = useState(0);

  const isSupported = isNotificationsSupported();

  // Request permission
  const requestPermission = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
  }, []);

  // Clear all scheduled reminders
  const clearReminders = useCallback(() => {
    for (const reminder of scheduledReminders.current) {
      reminder.cancel();
    }
    scheduledReminders.current = [];
    setScheduledCount(0);
  }, []);

  // Schedule reminders for a list of events
  const scheduleReminders = useCallback(
    (events: CalendarEvent[]) => {
      // Clear existing reminders first
      clearReminders();

      if (permission !== 'granted') {
        return;
      }

      const now = Date.now();
      const cutoff = now + SCHEDULE_AHEAD_MS;
      const newReminders: ScheduledReminder[] = [];

      for (const event of events) {
        const eventStart = new Date(event.startDate);

        // Skip past events
        if (eventStart.getTime() <= now) continue;

        // Skip events too far in the future
        if (eventStart.getTime() > cutoff) continue;

        // Schedule a reminder for each reminder time
        for (const reminderMinutes of event.reminders) {
          const reminderTime = calculateReminderTime(
            eventStart,
            reminderMinutes
          );

          // Skip if reminder time has passed
          if (reminderTime.getTime() <= now) continue;

          const { cancel } = scheduleNotification(
            `📅 ${event.title}`,
            reminderTime,
            {
              body: `${formatReminderTime(
                reminderMinutes
              )} - ${eventStart.toLocaleString()}`,
              tag: `${event.id}-${reminderMinutes}`, // Prevent duplicates
            }
          );

          newReminders.push({
            eventId: event.id,
            reminderMinutes,
            cancel,
          });
        }
      }

      scheduledReminders.current = newReminders;
      setScheduledCount(newReminders.length);

      if (newReminders.length > 0) {
        console.log(
          `[Notifications] Scheduled ${newReminders.length} reminders`
        );
      }
    },
    [permission, clearReminders]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearReminders();
    };
  }, [clearReminders]);

  // Re-check permission periodically (in case user changed it in browser settings)
  useEffect(() => {
    const checkPermission = () => {
      const current = getNotificationPermission();
      if (current !== permission) {
        setPermission(current);
      }
    };

    const intervalId = setInterval(checkPermission, 30000); // Every 30 seconds
    return () => clearInterval(intervalId);
  }, [permission]);

  return {
    isSupported,
    permission,
    requestPermission,
    scheduleReminders,
    clearReminders,
    scheduledCount,
  };
}
