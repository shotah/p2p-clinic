import { useState } from 'react';
import { useContacts } from '@/hooks';
import type { Contact } from '@/types';
import './contacts.css';

interface ContactListProps {
  onSelect: (contact: Contact) => void;
  onAdd: () => void;
  selectedId?: string;
}

export function ContactList({ onSelect, onAdd, selectedId }: ContactListProps) {
  const { contacts, searchContacts } = useContacts();
  const [search, setSearch] = useState('');

  const filteredContacts = search ? searchContacts(search) : contacts;

  return (
    <div className="contact-list">
      <div className="contact-list-header">
        <h2>Contacts</h2>
        <button className="btn btn-primary btn-sm" onClick={onAdd}>
          + Add
        </button>
      </div>

      <input
        type="text"
        className="search-input"
        placeholder="Search contacts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="contact-items">
        {filteredContacts.length === 0 ? (
          <div className="empty-state">
            {search ? 'No contacts found' : 'No contacts yet'}
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className={`contact-item ${selectedId === contact.id ? 'selected' : ''}`}
              onClick={() => onSelect(contact)}
            >
              <div className="contact-avatar">
                {contact.firstName[0]}
                {contact.lastName[0]}
              </div>
              <div className="contact-info">
                <div className="contact-name">
                  {contact.firstName} {contact.lastName}
                </div>
                {contact.company && (
                  <div className="contact-company">{contact.company}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
