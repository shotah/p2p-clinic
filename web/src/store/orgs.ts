/**
 * Orgs Store
 * 
 * Manages organizations (orgs) which are containers for contacts and events.
 * Orgs themselves are stored locally in IndexedDB - only the data within each
 * org syncs P2P via Yjs.
 */

import type { Org, OrgInput } from '@/types';

const DB_NAME = 'p2p-clinic-orgs';
const DB_VERSION = 1;
const STORE_NAME = 'orgs';

let db: IDBDatabase | null = null;

/**
 * Open the orgs database
 */
async function openDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Generate a random hex color for org identification
 */
function generateOrgColor(): string {
  const colors = [
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#f43f5e', // Rose
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#14b8a6', // Teal
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Generate a random room ID for P2P sync
 */
export function generateRoomId(): string {
  return crypto.randomUUID();
}

/**
 * Get all orgs
 */
export async function getAllOrgs(): Promise<Org[]> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a single org by ID
 */
export async function getOrg(id: string): Promise<Org | undefined> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get the default org (first org created)
 */
export async function getDefaultOrg(): Promise<Org | undefined> {
  const orgs = await getAllOrgs();
  return orgs.find((org) => org.isDefault) || orgs[0];
}

/**
 * Create a new org
 */
export async function createOrg(input: OrgInput): Promise<Org> {
  const database = await openDB();
  const org: Org = {
    ...input,
    id: crypto.randomUUID(),
    color: input.color || generateOrgColor(),
    createdAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(org);

    request.onsuccess = () => resolve(org);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update an existing org
 */
export async function updateOrg(
  id: string,
  updates: Partial<OrgInput>
): Promise<Org | undefined> {
  const existing = await getOrg(id);
  if (!existing) return undefined;

  const updated: Org = { ...existing, ...updates };
  const database = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(updated);

    request.onsuccess = () => resolve(updated);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete an org
 */
export async function deleteOrg(id: string): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Check if any orgs exist (for first-run detection)
 */
export async function hasOrgs(): Promise<boolean> {
  const orgs = await getAllOrgs();
  return orgs.length > 0;
}

/**
 * Create the default "Personal" org for first-time users
 */
export async function createDefaultOrg(): Promise<Org> {
  return createOrg({
    name: 'Personal',
    color: '#6366f1', // Indigo
    isDefault: true,
  });
}
