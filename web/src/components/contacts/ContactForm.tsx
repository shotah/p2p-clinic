import { useState } from 'react';
import type { Contact, ContactInput } from '@/types';
import './contacts.css';

interface ContactFormProps {
  contact?: Contact;
  onSave: (data: ContactInput) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function ContactForm({ contact, onSave, onCancel, onDelete }: ContactFormProps) {
  // Initialize state from contact prop (or empty for new contact)
  const [firstName, setFirstName] = useState(contact?.firstName ?? '');
  const [lastName, setLastName] = useState(contact?.lastName ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [company, setCompany] = useState(contact?.company ?? '');
  const [notes, setNotes] = useState(contact?.notes ?? '');

  const isEditing = !!contact;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    onSave({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      company: company.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <h2>{isEditing ? 'Edit Contact' : 'New Contact'}</h2>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="firstName">First Name *</label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="form-group">
          <label htmlFor="lastName">Last Name *</label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="phone">Phone</label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="company">Company</label>
        <input
          id="company"
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        {isEditing && onDelete && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (confirm('Delete this contact?')) {
                onDelete();
              }
            }}
          >
            Delete
          </button>
        )}
        <button type="submit" className="btn btn-primary">
          {isEditing ? 'Save Changes' : 'Add Contact'}
        </button>
      </div>
    </form>
  );
}
