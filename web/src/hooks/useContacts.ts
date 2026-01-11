/**
 * React hook for managing contacts
 * Provides CRUD operations and reactive updates
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useOrgContext } from '@/store/useOrgStore';
import { generateId, timestamp } from '@/store';
import type { Contact, ContactInput } from '@/types';

export function useContacts() {
  const { store } = useOrgContext();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get the contacts map from the store
  const contactsMap = useMemo(() => store?.contactsMap, [store]);

  // Subscribe to Yjs changes
  useEffect(() => {
    if (!contactsMap) {
      return;
    }

    const updateContacts = () => {
      const allContacts = Array.from(contactsMap.values());
      // Sort by lastName, firstName
      allContacts.sort((a, b) => {
        const lastNameCompare = a.lastName.localeCompare(b.lastName);
        if (lastNameCompare !== 0) return lastNameCompare;
        return a.firstName.localeCompare(b.firstName);
      });
      setContacts(allContacts);
      setIsLoading(false);
    };

    // Initial load
    updateContacts();

    // Subscribe to changes
    contactsMap.observe(updateContacts);

    return () => {
      contactsMap.unobserve(updateContacts);
    };
  }, [contactsMap]);

  /**
   * Add a new contact
   */
  const addContact = useCallback(
    (input: ContactInput): Contact | null => {
      if (!contactsMap) return null;
      const now = timestamp();
      const contact: Contact = {
        ...input,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };
      contactsMap.set(contact.id, contact);
      return contact;
    },
    [contactsMap]
  );

  /**
   * Update an existing contact
   */
  const updateContact = useCallback(
    (id: string, updates: Partial<ContactInput>): Contact | null => {
      if (!contactsMap) return null;
      const existing = contactsMap.get(id);
      if (!existing) return null;

      const updated: Contact = {
        ...existing,
        ...updates,
        updatedAt: timestamp(),
      };
      contactsMap.set(id, updated);
      return updated;
    },
    [contactsMap]
  );

  /**
   * Delete a contact
   */
  const deleteContact = useCallback(
    (id: string): boolean => {
      if (!contactsMap) return false;
      if (!contactsMap.has(id)) return false;
      contactsMap.delete(id);
      return true;
    },
    [contactsMap]
  );

  /**
   * Get a single contact by ID
   */
  const getContact = useCallback(
    (id: string): Contact | undefined => {
      if (!contactsMap) return undefined;
      return contactsMap.get(id);
    },
    [contactsMap]
  );

  /**
   * Search contacts by name, email, or company
   */
  const searchContacts = useCallback(
    (query: string): Contact[] => {
      if (!query.trim()) return contacts;
      const lowerQuery = query.toLowerCase();
      return contacts.filter(
        (c) =>
          c.firstName.toLowerCase().includes(lowerQuery) ||
          c.lastName.toLowerCase().includes(lowerQuery) ||
          c.email?.toLowerCase().includes(lowerQuery) ||
          c.company?.toLowerCase().includes(lowerQuery)
      );
    },
    [contacts]
  );

  return {
    contacts,
    isLoading,
    addContact,
    updateContact,
    deleteContact,
    getContact,
    searchContacts,
  };
}
