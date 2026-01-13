/**
 * Org Context Types and Context Object
 */

import { createContext } from 'react';
import type { Org } from '@/types';
import type { OrgStore } from './index';
import type { SyncStatus } from '@/sync/SyncManager';

export interface SyncState {
  status: SyncStatus;
  peerCount: number;
  error: Error | null;
}

export interface OrgContextValue {
  org: Org;
  store: OrgStore | null;
  isLoading: boolean;
  // Sync state
  syncState: SyncState;
  // Sync actions
  enableP2P: (password: string) => Promise<void>;
  disableP2P: () => Promise<void>;
  startSync: (password: string) => Promise<void>;
  stopSync: () => void;
  generateShareCode: () => Promise<string>;
  // Org update action
  updateOrg: (updates: Partial<Org>) => Promise<void>;
  // Leave org (delete all local data)
  leaveOrg: () => Promise<void>;
}

export const OrgContext = createContext<OrgContextValue | null>(null);

// Re-export types for convenience
export type { OrgStore, SyncStatus };
