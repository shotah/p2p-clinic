import { useContacts } from '@/hooks';
import type { CalendarEvent, CalendarEventInput, Contact } from '@/types';
import { useMemo, useState } from 'react';
import './calendar.css';

interface EventFormProps {
  event?: CalendarEvent;
  initialDate?: Date;
  onSave: (data: CalendarEventInput) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function EventForm({
  event,
  initialDate,
  onSave,
  onCancel,
  onDelete,
}: EventFormProps) {
  const { contacts } = useContacts();

  // Format date for input - memoize to avoid impure function calls during render
  const { defaultStart, defaultEnd } = useMemo(() => {
    const formatDateForInput = (date: Date) => {
      return date.toISOString().slice(0, 16);
    };

    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    const start = event?.startDate
      ? event.startDate.slice(0, 16)
      : initialDate
      ? formatDateForInput(initialDate)
      : formatDateForInput(now);

    const end = event?.endDate
      ? event.endDate.slice(0, 16)
      : initialDate
      ? formatDateForInput(new Date(initialDate.getTime() + 60 * 60 * 1000))
      : formatDateForInput(oneHourLater);

    return { defaultStart: start, defaultEnd: end };
  }, [event, initialDate]);

  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(
    event?.contactIds ?? []
  );
  const [reminders, setReminders] = useState<number[]>(
    event?.reminders ?? [15]
  );

  const isEditing = !!event;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      allDay,
      contactIds: selectedContactIds,
      reminders,
    });
  };

  const toggleContact = (contactId: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const toggleReminder = (minutes: number) => {
    setReminders((prev) =>
      prev.includes(minutes)
        ? prev.filter((m) => m !== minutes)
        : [...prev, minutes].sort((a, b) => a - b)
    );
  };

  const reminderOptions = [
    { value: 0, label: 'At time of event' },
    { value: 5, label: '5 minutes before' },
    { value: 15, label: '15 minutes before' },
    { value: 30, label: '30 minutes before' },
    { value: 60, label: '1 hour before' },
    { value: 1440, label: '1 day before' },
  ];

  return (
    <form className="event-form" onSubmit={handleSubmit}>
      <h2>{isEditing ? 'Edit Event' : 'New Event'}</h2>

      <div className="form-group">
        <label htmlFor="title">Title *</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
          placeholder="Event title"
        />
      </div>

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
          />
          All day event
        </label>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="startDate">Start</label>
          <input
            id="startDate"
            type={allDay ? 'date' : 'datetime-local'}
            value={allDay ? startDate.split('T')[0] : startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="endDate">End</label>
          <input
            id="endDate"
            type={allDay ? 'date' : 'datetime-local'}
            value={allDay ? endDate.split('T')[0] : endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Add details..."
        />
      </div>

      <div className="form-group">
        <label>Reminders</label>
        <div className="reminder-options">
          {reminderOptions.map((opt) => (
            <label key={opt.value} className="checkbox-label small">
              <input
                type="checkbox"
                checked={reminders.includes(opt.value)}
                onChange={() => toggleReminder(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {contacts.length > 0 && (
        <div className="form-group">
          <label>Attendees</label>
          <div className="contact-picker">
            {contacts.map((contact: Contact) => (
              <label key={contact.id} className="contact-option">
                <input
                  type="checkbox"
                  checked={selectedContactIds.includes(contact.id)}
                  onChange={() => toggleContact(contact.id)}
                />
                <span className="contact-chip">
                  {contact.firstName} {contact.lastName}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        {isEditing && onDelete && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (confirm('Delete this event?')) {
                onDelete();
              }
            }}
          >
            Delete
          </button>
        )}
        <button type="submit" className="btn btn-primary">
          {isEditing ? 'Save Changes' : 'Create Event'}
        </button>
      </div>
    </form>
  );
}
