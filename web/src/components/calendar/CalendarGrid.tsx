import type { CalendarEvent } from '@/types';
import { useMemo } from 'react';
import './calendar.css';

interface CalendarGridProps {
  year: number;
  month: number; // 0-indexed
  events: CalendarEvent[];
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function CalendarGrid({
  year,
  month,
  events,
  selectedDate,
  onSelectDate,
  onSelectEvent,
}: CalendarGridProps) {
  // Generate calendar days for the month
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: (Date | null)[] = [];

    // Padding for days before the 1st
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  }, [year, month]);

  // Group events by date string
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const dateStr = event.startDate.split('T')[0];
      if (!map.has(dateStr)) {
        map.set(dateStr, []);
      }
      map.get(dateStr)!.push(event);
    });
    return map;
  }, [events]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const getDateStr = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="calendar-grid">
      <div className="calendar-header">
        <h2>
          {MONTHS[month]} {year}
        </h2>
      </div>

      <div className="calendar-weekdays">
        {DAYS.map((day) => (
          <div key={day} className="weekday">
            {day}
          </div>
        ))}
      </div>

      <div className="calendar-days">
        {calendarDays.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} className="calendar-day empty" />;
          }

          const dateStr = getDateStr(date);
          const dayEvents = eventsByDate.get(dateStr) || [];
          const isToday = dateStr === todayStr;
          const isSelected =
            selectedDate && getDateStr(selectedDate) === dateStr;

          return (
            <div
              key={dateStr}
              className={`calendar-day ${isToday ? 'today' : ''} ${
                isSelected ? 'selected' : ''
              }`}
              onClick={() => onSelectDate(date)}
            >
              <span className="day-number">{date.getDate()}</span>
              <div className="day-events">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="day-event"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(event);
                    }}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="day-event-more">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { MONTHS };
