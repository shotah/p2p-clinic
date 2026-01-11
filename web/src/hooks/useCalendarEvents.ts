/**
 * React hook for managing calendar events
 * Provides CRUD operations and reactive updates
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useOrgContext } from '@/store/useOrgStore';
import { generateId, timestamp } from '@/store';
import type { CalendarEvent, CalendarEventInput } from '@/types';

export function useCalendarEvents() {
  const { store } = useOrgContext();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get the events map from the store
  const eventsMap = useMemo(() => store?.eventsMap, [store]);

  // Subscribe to Yjs changes
  useEffect(() => {
    if (!eventsMap) {
      return;
    }

    const updateEvents = () => {
      const allEvents = Array.from(eventsMap.values());
      // Sort by startDate
      allEvents.sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
      setEvents(allEvents);
      setIsLoading(false);
    };

    // Initial load
    updateEvents();

    // Subscribe to changes
    eventsMap.observe(updateEvents);

    return () => {
      eventsMap.unobserve(updateEvents);
    };
  }, [eventsMap]);

  /**
   * Add a new event
   */
  const addEvent = useCallback(
    (input: CalendarEventInput): CalendarEvent | null => {
      if (!eventsMap) return null;
      const now = timestamp();
      const event: CalendarEvent = {
        ...input,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };
      eventsMap.set(event.id, event);
      return event;
    },
    [eventsMap]
  );

  /**
   * Update an existing event
   */
  const updateEvent = useCallback(
    (id: string, updates: Partial<CalendarEventInput>): CalendarEvent | null => {
      if (!eventsMap) return null;
      const existing = eventsMap.get(id);
      if (!existing) return null;

      const updated: CalendarEvent = {
        ...existing,
        ...updates,
        updatedAt: timestamp(),
      };
      eventsMap.set(id, updated);
      return updated;
    },
    [eventsMap]
  );

  /**
   * Delete an event
   */
  const deleteEvent = useCallback(
    (id: string): boolean => {
      if (!eventsMap) return false;
      if (!eventsMap.has(id)) return false;
      eventsMap.delete(id);
      return true;
    },
    [eventsMap]
  );

  /**
   * Get a single event by ID
   */
  const getEvent = useCallback(
    (id: string): CalendarEvent | undefined => {
      if (!eventsMap) return undefined;
      return eventsMap.get(id);
    },
    [eventsMap]
  );

  /**
   * Get events for a specific date
   */
  const getEventsForDate = useCallback(
    (date: Date): CalendarEvent[] => {
      const dateStr = date.toISOString().split('T')[0];
      return events.filter((e) => {
        const eventDate = e.startDate.split('T')[0];
        return eventDate === dateStr;
      });
    },
    [events]
  );

  /**
   * Get events for a date range
   */
  const getEventsInRange = useCallback(
    (start: Date, end: Date): CalendarEvent[] => {
      const startTime = start.getTime();
      const endTime = end.getTime();
      return events.filter((e) => {
        const eventStart = new Date(e.startDate).getTime();
        const eventEnd = new Date(e.endDate).getTime();
        // Event overlaps with range
        return eventStart <= endTime && eventEnd >= startTime;
      });
    },
    [events]
  );

  /**
   * Get events that have a specific contact
   */
  const getEventsWithContact = useCallback(
    (contactId: string): CalendarEvent[] => {
      return events.filter((e) => e.contactIds.includes(contactId));
    },
    [events]
  );

  return {
    events,
    isLoading,
    addEvent,
    updateEvent,
    deleteEvent,
    getEvent,
    getEventsForDate,
    getEventsInRange,
    getEventsWithContact,
  };
}
