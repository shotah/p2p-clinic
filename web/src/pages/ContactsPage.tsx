import { useState } from 'react';
import { ContactList, ContactForm, ContactDetail } from '@/components/contacts';
import { useContacts } from '@/hooks';
import type { Contact, ContactInput } from '@/types';
import './pages.css';

type View = 'list' | 'detail' | 'add' | 'edit';

export function ContactsPage() {
  const { addContact, updateContact, deleteContact } = useContacts();
  const [view, setView] = useState<View>('list');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const handleSelect = (contact: Contact) => {
    setSelectedContact(contact);
    setView('detail');
  };

  const handleAdd = () => {
    setSelectedContact(null);
    setView('add');
  };

  const handleEdit = () => {
    setView('edit');
  };

  const handleCancel = () => {
    if (selectedContact) {
      setView('detail');
    } else {
      setView('list');
    }
  };

  const handleSave = (data: ContactInput) => {
    if (view === 'edit' && selectedContact) {
      const updated = updateContact(selectedContact.id, data);
      if (updated) {
        setSelectedContact(updated);
      }
      setView('detail');
    } else {
      const newContact = addContact(data);
      setSelectedContact(newContact);
      setView('detail');
    }
  };

  const handleDelete = () => {
    if (selectedContact) {
      deleteContact(selectedContact.id);
      setSelectedContact(null);
      setView('list');
    }
  };

  return (
    <div className="page-layout contacts-page">
      <div className="page-sidebar">
        <ContactList
          onSelect={handleSelect}
          onAdd={handleAdd}
          selectedId={selectedContact?.id}
        />
      </div>
      <div className="page-content">
        {view === 'list' && (
          <div className="empty-content">
            <p>Select a contact or add a new one</p>
          </div>
        )}
        {view === 'detail' && selectedContact && (
          <ContactDetail contact={selectedContact} onEdit={handleEdit} />
        )}
        {(view === 'add' || view === 'edit') && (
          <ContactForm
            contact={view === 'edit' ? selectedContact ?? undefined : undefined}
            onSave={handleSave}
            onCancel={handleCancel}
            onDelete={view === 'edit' ? handleDelete : undefined}
          />
        )}
      </div>
    </div>
  );
}
