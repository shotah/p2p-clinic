/**
 * Org Provider Component
 *
 * Provides the current org's Yjs store to child components.
 * Manages P2P sync lifecycle via SyncManager.
 */

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { Org } from '@/types';
import { getOrgStore, type OrgStore } from './index';
import { OrgContext, type SyncState } from './OrgContextTypes';
import { SyncManager, type SyncStatus } from '@/sync/SyncManager';
import { signalingClient } from '@/sync/SignalingClient';
import { hashPassword, verifyPassword } from '@/crypto';
import { updateOrg as updateOrgInDb, generateRoomId } from './orgs';

interface OrgProviderProps {
  org: Org;
  onOrgUpdate: (org: Org) => void;
  onLeaveOrg: () => Promise<void>;
  children: ReactNode;
}

const DEFAULT_SYNC_STATE: SyncState = {
  status: 'disconnected',
  peerCount: 0,
  error: null,
};

export function OrgProvider({ org, onOrgUpdate, onLeaveOrg, children }: OrgProviderProps) {
  const [store, setStore] = useState<OrgStore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncState, setSyncState] = useState<SyncState>(DEFAULT_SYNC_STATE);
  
  const syncManagerRef = useRef<SyncManager | null>(null);

  // Load the Yjs store for this org
  useEffect(() => {
    let cancelled = false;

    async function loadStore() {
      setIsLoading(true);
      try {
        const orgStore = await getOrgStore(org.id);
        if (!cancelled) {
          setStore(orgStore);
        }
      } catch (error) {
        console.error(
          `[OrgContext] Failed to load store for org ${org.id}:`,
          error
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadStore();

    return () => {
      cancelled = true;
    };
  }, [org.id]);

  // Cleanup sync manager when org changes
  useEffect(() => {
    return () => {
      if (syncManagerRef.current) {
        syncManagerRef.current.stop();
        syncManagerRef.current = null;
      }
      setSyncState(DEFAULT_SYNC_STATE);
    };
  }, [org.id]);

  // Update org in database and notify parent
  const updateOrg = useCallback(async (updates: Partial<Org>) => {
    const updated = await updateOrgInDb(org.id, updates);
    if (updated) {
      onOrgUpdate(updated);
    }
  }, [org.id, onOrgUpdate]);

  // Start P2P sync with password
  const startSync = useCallback(async (password: string) => {
    if (!store || !org.roomId) {
      throw new Error('Cannot start sync: no store or roomId');
    }

    // Verify password if we have a stored hash
    if (org.passwordHash) {
      const valid = await verifyPassword(password, org.passwordHash);
      if (!valid) {
        throw new Error('Incorrect password');
      }
    }

    // Stop existing sync if any
    if (syncManagerRef.current) {
      syncManagerRef.current.stop();
    }

    // Create new sync manager
    const manager = new SyncManager(org.roomId, password, store.doc, {
      onStatusChange: (status: SyncStatus) => {
        setSyncState(prev => ({ ...prev, status }));
      },
      onPeerConnected: () => {
        setSyncState(prev => ({ 
          ...prev, 
          peerCount: syncManagerRef.current?.getPeerCount() ?? 0 
        }));
      },
      onPeerDisconnected: () => {
        setSyncState(prev => ({ 
          ...prev, 
          peerCount: syncManagerRef.current?.getPeerCount() ?? 0 
        }));
      },
      onError: (error: Error) => {
        setSyncState(prev => ({ ...prev, error }));
      },
    });

    syncManagerRef.current = manager;
    await manager.start();
  }, [store, org.roomId, org.passwordHash]);

  // Stop P2P sync
  const stopSync = useCallback(() => {
    if (syncManagerRef.current) {
      syncManagerRef.current.stop();
      syncManagerRef.current = null;
    }
    setSyncState(DEFAULT_SYNC_STATE);
  }, []);

  // Enable P2P for this org (first time setup)
  const enableP2P = useCallback(async (password: string) => {
    const roomId = generateRoomId();
    const passwordHash = await hashPassword(password);
    
    await updateOrg({ roomId, passwordHash });
  }, [updateOrg]);

  // Disable P2P for this org
  const disableP2P = useCallback(async () => {
    stopSync();
    await updateOrg({ roomId: undefined, passwordHash: undefined });
  }, [updateOrg, stopSync]);

  // Generate a one-time share code
  const generateShareCode = useCallback(async (): Promise<string> => {
    if (!org.roomId) {
      throw new Error('Cannot generate share code: P2P not enabled');
    }
    const { code } = await signalingClient.createInvite(org.roomId);
    return code;
  }, [org.roomId]);

  // Leave org - stop sync first, then let parent handle deletion
  const leaveOrg = useCallback(async () => {
    // Stop any active sync
    stopSync();
    // Let parent (App) handle the actual deletion
    await onLeaveOrg();
  }, [stopSync, onLeaveOrg]);

  return (
    <OrgContext.Provider
      value={{
        org,
        store,
        isLoading,
        syncState,
        enableP2P,
        disableP2P,
        startSync,
        stopSync,
        generateShareCode,
        updateOrg,
        leaveOrg,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}
