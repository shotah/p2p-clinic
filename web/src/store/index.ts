/**
 * Yjs Document Store
 *
 * This is the core data layer for P2P Clinic.
 * - Each org has its own Yjs document
 * - Uses Yjs for CRDT-based conflict-free sync
 * - Persists to IndexedDB via y-indexeddb
 * - Will connect to peers via y-webrtc (added later)
 */

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import type { Contact, CalendarEvent } from '@/types';

// Database name prefix for IndexedDB
const DB_PREFIX = 'p2p-clinic-org-';

// Store for org documents and their persistence
interface OrgStore {
  doc: Y.Doc;
  persistence: IndexeddbPersistence;
  contactsMap: Y.Map<Contact>;
  eventsMap: Y.Map<CalendarEvent>;
}

const orgStores = new Map<string, OrgStore>();

/**
 * Get or create a Yjs document for an org
 */
export async function getOrgStore(orgId: string): Promise<OrgStore> {
  // Return existing store if already loaded
  const existing = orgStores.get(orgId);
  if (existing) {
    return existing;
  }

  // Create new document and persistence
  const doc = new Y.Doc();
  const persistence = new IndexeddbPersistence(`${DB_PREFIX}${orgId}`, doc);

  // Wait for data to load from IndexedDB
  await new Promise<void>((resolve) => {
    persistence.once('synced', () => {
      console.log(`[Store] Loaded org ${orgId} from IndexedDB`);
      resolve();
    });
  });

  // Create typed accessors
  const contactsMap = doc.getMap<Contact>('contacts');
  const eventsMap = doc.getMap<CalendarEvent>('events');

  const store: OrgStore = {
    doc,
    persistence,
    contactsMap,
    eventsMap,
  };

  orgStores.set(orgId, store);
  return store;
}

/**
 * Check if an org store is loaded
 */
export function isOrgStoreLoaded(orgId: string): boolean {
  return orgStores.has(orgId);
}

/**
 * Get an already-loaded org store (throws if not loaded)
 */
export function getLoadedOrgStore(orgId: string): OrgStore {
  const store = orgStores.get(orgId);
  if (!store) {
    throw new Error(`Org store ${orgId} not loaded`);
  }
  return store;
}

/**
 * Unload an org store (for cleanup)
 */
export function unloadOrgStore(orgId: string): void {
  const store = orgStores.get(orgId);
  if (store) {
    store.persistence.destroy();
    store.doc.destroy();
    orgStores.delete(orgId);
    console.log(`[Store] Unloaded org ${orgId}`);
  }
}

/**
 * Clear all data for an org
 */
export async function clearOrgData(orgId: string): Promise<void> {
  const store = await getOrgStore(orgId);
  store.doc.transact(() => {
    store.contactsMap.clear();
    store.eventsMap.clear();
  });
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get current ISO timestamp
 */
export function timestamp(): string {
  return new Date().toISOString();
}

// Export types for use in hooks
export type { OrgStore };
