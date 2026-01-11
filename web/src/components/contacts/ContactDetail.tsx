import type { Contact } from '@/types';
import './contacts.css';

interface ContactDetailProps {
  contact: Contact;
  onEdit: () => void;
}

export function ContactDetail({ contact, onEdit }: ContactDetailProps) {
  return (
    <div className="contact-detail">
      <div className="contact-detail-header">
        <div className="contact-detail-avatar">
          {contact.firstName[0]}
          {contact.lastName[0]}
        </div>
        <div>
          <div className="contact-detail-name">
            {contact.firstName} {contact.lastName}
          </div>
          {contact.company && (
            <div className="contact-detail-company">{contact.company}</div>
          )}
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={onEdit}
          style={{ marginLeft: 'auto' }}
        >
          Edit
        </button>
      </div>

      {contact.email && (
        <div className="contact-field">
          <div className="contact-field-label">Email</div>
          <div className="contact-field-value">
            <a href={`mailto:${contact.email}`}>{contact.email}</a>
          </div>
        </div>
      )}

      {contact.phone && (
        <div className="contact-field">
          <div className="contact-field-label">Phone</div>
          <div className="contact-field-value">
            <a href={`tel:${contact.phone}`}>{contact.phone}</a>
          </div>
        </div>
      )}

      {contact.notes && (
        <div className="contact-field">
          <div className="contact-field-label">Notes</div>
          <div className="contact-field-value" style={{ whiteSpace: 'pre-wrap' }}>
            {contact.notes}
          </div>
        </div>
      )}
    </div>
  );
}
