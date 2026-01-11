/**
 * Core data types for P2P Clinic
 * These are stored in Yjs documents and synced P2P
 */

/**
 * Organization - container for contacts and events
 * Each org has its own Yjs document and can sync independently
 */
export interface Org {
  id: string;
  name: string;
  color: string; // Hex color for UI identification
  roomId?: string; // Permanent room ID for P2P sync (undefined = local only)
  isDefault?: boolean; // First org created, usually "Personal"
  createdAt: string; // ISO date
}

/**
 * Input type for creating an org
 */
export type OrgInput = Omit<Org, 'id' | 'createdAt'>;

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string; // ISO datetime
  endDate: string; // ISO datetime
  allDay: boolean;
  contactIds: string[]; // References to Contact.id
  reminders: number[]; // Minutes before event (e.g., [15, 60])
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}

/**
 * Form input types (without auto-generated fields)
 */
export type ContactInput = Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>;
export type CalendarEventInput = Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Company settings (stored locally)
 */
export interface CompanySettings {
  shareCode?: string;
  offlinePasswordHash?: string; // For encryption - never sent to server
  companyName?: string;
  createdAt?: string;
}
