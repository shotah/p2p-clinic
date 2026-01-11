import { useContacts } from '@/hooks';
import type { CalendarEvent } from '@/types';
import './calendar.css';

interface EventDetailProps {
  event: CalendarEvent;
  onEdit: () => void;
}

export function EventDetail({ event, onEdit }: EventDetailProps) {
  const { getContact } = useContacts();

  const formatDate = (isoString: string, allDay: boolean) => {
    const date = new Date(isoString);
    if (allDay) {
      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    return date.toLocaleString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatReminder = (minutes: number) => {
    if (minutes === 0) return 'At time of event';
    if (minutes < 60) return `${minutes} minutes before`;
    if (minutes === 60) return '1 hour before';
    if (minutes < 1440) return `${minutes / 60} hours before`;
    if (minutes === 1440) return '1 day before';
    return `${minutes / 1440} days before`;
  };

  const attendees = event.contactIds
    .map((id) => getContact(id))
    .filter(Boolean);

  return (
    <div className="event-detail">
      <div className="event-detail-header">
        <h2>{event.title}</h2>
        <button className="btn btn-secondary btn-sm" onClick={onEdit}>
          Edit
        </button>
      </div>

      <div className="event-field">
        <div className="event-field-label">When</div>
        <div className="event-field-value">
          {formatDate(event.startDate, event.allDay)}
          {!event.allDay && (
            <>
              <br />
              <span className="text-muted">to {formatDate(event.endDate, event.allDay)}</span>
            </>
          )}
        </div>
      </div>

      {event.description && (
        <div className="event-field">
          <div className="event-field-label">Description</div>
          <div className="event-field-value" style={{ whiteSpace: 'pre-wrap' }}>
            {event.description}
          </div>
        </div>
      )}

      {event.reminders.length > 0 && (
        <div className="event-field">
          <div className="event-field-label">Reminders</div>
          <div className="event-field-value">
            {event.reminders.map((m) => formatReminder(m)).join(', ')}
          </div>
        </div>
      )}

      {attendees.length > 0 && (
        <div className="event-field">
          <div className="event-field-label">Attendees</div>
          <div className="attendee-list">
            {attendees.map((contact) => (
              <div key={contact!.id} className="attendee-chip">
                <span className="attendee-avatar">
                  {contact!.firstName[0]}{contact!.lastName[0]}
                </span>
                {contact!.firstName} {contact!.lastName}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
