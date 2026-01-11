import { useState } from 'react';
import { CalendarGrid, EventForm, EventDetail, MONTHS } from '@/components/calendar';
import { useCalendarEvents } from '@/hooks';
import type { CalendarEvent, CalendarEventInput } from '@/types';
import './pages.css';

type View = 'calendar' | 'detail' | 'add' | 'edit';

export function CalendarPage() {
  const { events, addEvent, updateEvent, deleteEvent } = useCalendarEvents();
  
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [view, setView] = useState<View>('calendar');

  const goToPrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const goToToday = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setSelectedDate(now);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setView('add');
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setView('detail');
  };

  const handleAddEvent = () => {
    setSelectedEvent(null);
    setView('add');
  };

  const handleEdit = () => {
    setView('edit');
  };

  const handleCancel = () => {
    if (selectedEvent) {
      setView('detail');
    } else {
      setView('calendar');
      setSelectedDate(null);
    }
  };

  const handleSave = (data: CalendarEventInput) => {
    if (view === 'edit' && selectedEvent) {
      const updated = updateEvent(selectedEvent.id, data);
      if (updated) {
        setSelectedEvent(updated);
      }
      setView('detail');
    } else {
      const newEvent = addEvent(data);
      setSelectedEvent(newEvent);
      setView('detail');
    }
  };

  const handleDelete = () => {
    if (selectedEvent) {
      deleteEvent(selectedEvent.id);
      setSelectedEvent(null);
      setSelectedDate(null);
      setView('calendar');
    }
  };

  // Get events for selected date sidebar
  const selectedDateEvents = selectedDate
    ? events.filter((e) => {
        const eventDate = e.startDate.split('T')[0];
        const selectedStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
        return eventDate === selectedStr;
      })
    : [];

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="page-layout calendar-page">
      <div className="calendar-main">
        <div className="calendar-toolbar">
          <div className="calendar-nav">
            <button onClick={goToPrevMonth}>&larr;</button>
            <button onClick={goToToday}>Today</button>
            <button onClick={goToNextMonth}>&rarr;</button>
          </div>
          <h2>{MONTHS[month]} {year}</h2>
          <button className="btn btn-primary btn-sm" onClick={handleAddEvent}>
            + New Event
          </button>
        </div>
        <CalendarGrid
          year={year}
          month={month}
          events={events}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          onSelectEvent={handleSelectEvent}
        />
      </div>

      <div className="calendar-sidebar">
        {view === 'calendar' && selectedDate && (
          <div className="day-events-panel">
            <div className="day-events-header">
              <h3>
                {selectedDate.toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </h3>
            </div>
            {selectedDateEvents.length === 0 ? (
              <div className="no-events">No events</div>
            ) : (
              <div className="day-events-list">
                {selectedDateEvents.map((event) => (
                  <div
                    key={event.id}
                    className="day-event-item"
                    onClick={() => handleSelectEvent(event)}
                  >
                    <div className="day-event-title">{event.title}</div>
                    {!event.allDay && (
                      <div className="day-event-time">{formatTime(event.startDate)}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'detail' && selectedEvent && (
          <EventDetail event={selectedEvent} onEdit={handleEdit} />
        )}

        {(view === 'add' || view === 'edit') && (
          <EventForm
            event={view === 'edit' ? selectedEvent ?? undefined : undefined}
            initialDate={selectedDate ?? undefined}
            onSave={handleSave}
            onCancel={handleCancel}
            onDelete={view === 'edit' ? handleDelete : undefined}
          />
        )}
      </div>
    </div>
  );
}
