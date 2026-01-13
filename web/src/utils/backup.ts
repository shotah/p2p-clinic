/**
 * Backup and Restore Utilities
 * Export/import all local data as JSON for a specific org
 */

import type { Contact, CalendarEvent, Org } from '@/types';
import type * as Y from 'yjs';

interface BackupData {
  version: 1;
  exportedAt: string;
  orgName: string;
  contacts: Contact[];
  events: CalendarEvent[];
}

interface BackupMaps {
  contactsMap: Y.Map<Contact>;
  eventsMap: Y.Map<CalendarEvent>;
}

/**
 * Export all data as a downloadable JSON file
 */
export function exportBackup(org: Org, maps: BackupMaps): void {
  const backup: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    orgName: org.name,
    contacts: Array.from(maps.contactsMap.values()),
    events: Array.from(maps.eventsMap.values()),
  };

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const safeName = org.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const filename = `p2p-clinic-${safeName}-${new Date().toISOString().split('T')[0]}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import data from a backup file
 * Returns info about what was imported
 */
export async function importBackup(
  file: File,
  maps: BackupMaps
): Promise<{
  contacts: number;
  events: number;
  merged: boolean;
}> {
  const text = await file.text();
  const backup = JSON.parse(text) as BackupData;

  // Validate backup format
  if (!backup.version || !backup.contacts || !backup.events) {
    throw new Error('Invalid backup file format');
  }

  let contactsImported = 0;
  let eventsImported = 0;

  // Import contacts (merge by ID, add new ones)
  for (const contact of backup.contacts) {
    if (!maps.contactsMap.has(contact.id)) {
      maps.contactsMap.set(contact.id, contact);
      contactsImported++;
    } else {
      // Update if imported is newer
      const existing = maps.contactsMap.get(contact.id)!;
      if (new Date(contact.updatedAt) > new Date(existing.updatedAt)) {
        maps.contactsMap.set(contact.id, contact);
        contactsImported++;
      }
    }
  }

  // Import events (merge by ID, add new ones)
  for (const event of backup.events) {
    if (!maps.eventsMap.has(event.id)) {
      maps.eventsMap.set(event.id, event);
      eventsImported++;
    } else {
      // Update if imported is newer
      const existing = maps.eventsMap.get(event.id)!;
      if (new Date(event.updatedAt) > new Date(existing.updatedAt)) {
        maps.eventsMap.set(event.id, event);
        eventsImported++;
      }
    }
  }

  return {
    contacts: contactsImported,
    events: eventsImported,
    merged:
      backup.contacts.length > contactsImported ||
      backup.events.length > eventsImported,
  };
}

/**
 * Clear all data for an org (use with caution!)
 */
export function clearAllData(maps: BackupMaps): void {
  maps.contactsMap.clear();
  maps.eventsMap.clear();
}

/**
 * Get data stats for an org
 */
export function getDataStats(maps: BackupMaps): {
  contacts: number;
  events: number;
} {
  return {
    contacts: maps.contactsMap.size,
    events: maps.eventsMap.size,
  };
}

/**
 * Export contacts as vCard format (.vcf)
 */
export function exportContactsVCard(contacts: Contact[], orgName: string): void {
  const vcards = contacts.map((contact) => {
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${contact.lastName || ''};${contact.firstName || ''};;;`,
      `FN:${contact.firstName} ${contact.lastName}`.trim(),
    ];

    if (contact.email) {
      lines.push(`EMAIL:${contact.email}`);
    }
    if (contact.phone) {
      lines.push(`TEL:${contact.phone}`);
    }
    if (contact.company) {
      lines.push(`ORG:${contact.company}`);
    }
    if (contact.notes) {
      lines.push(`NOTE:${contact.notes.replace(/\n/g, '\\n')}`);
    }

    lines.push('END:VCARD');
    return lines.join('\r\n');
  });

  const vcf = vcards.join('\r\n');
  const blob = new Blob([vcf], { type: 'text/vcard' });
  const url = URL.createObjectURL(blob);

  const safeName = orgName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const filename = `${safeName}-contacts.vcf`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Format a date for iCalendar format (YYYYMMDDTHHMMSSZ)
 */
function formatICalDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Export calendar events as iCalendar format (.ics)
 */
export function exportEventsICS(events: CalendarEvent[], orgName: string): void {
  const now = formatICalDate(new Date().toISOString());

  const vevents = events.map((event) => {
    const lines = [
      'BEGIN:VEVENT',
      `UID:${event.id}@p2p-clinic`,
      `DTSTAMP:${now}`,
      `DTSTART:${formatICalDate(event.startDate)}`,
      `DTEND:${formatICalDate(event.endDate)}`,
      `SUMMARY:${event.title}`,
    ];

    if (event.description) {
      lines.push(`DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`);
    }

    // Add reminders as VALARM
    for (const minutes of event.reminders) {
      lines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `TRIGGER:-PT${minutes}M`,
        `DESCRIPTION:${event.title}`,
        'END:VALARM'
      );
    }

    lines.push('END:VEVENT');
    return lines.join('\r\n');
  });

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//P2P Clinic//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${orgName}`,
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);

  const safeName = orgName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const filename = `${safeName}-calendar.ics`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
