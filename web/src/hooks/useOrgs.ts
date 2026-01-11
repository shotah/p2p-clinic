/**
 * useOrgs Hook
 *
 * Provides access to organizations and the currently selected org.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Org, OrgInput } from '@/types';
import {
  getAllOrgs,
  getOrg,
  createOrg as createOrgInDB,
  updateOrg as updateOrgInDB,
  deleteOrg as deleteOrgInDB,
  generateRoomId,
} from '@/store/orgs';

// Storage key for the currently selected org ID
const CURRENT_ORG_KEY = 'p2p-clinic-current-org';

export interface UseOrgsResult {
  orgs: Org[];
  currentOrg: Org | null;
  isLoading: boolean;
  needsOnboarding: boolean;
  selectOrg: (id: string) => Promise<void>;
  createOrg: (input: OrgInput) => Promise<Org>;
  updateOrg: (id: string, updates: Partial<OrgInput>) => Promise<void>;
  deleteOrg: (id: string) => Promise<void>;
  createSharedOrg: (name: string) => Promise<Org>;
  refresh: () => Promise<void>;
}

export function useOrgs(): UseOrgsResult {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Org | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loadCount, setLoadCount] = useState(0);

  // Load orgs from IndexedDB
  const loadOrgs = useCallback(async () => {
    try {
      const allOrgs = await getAllOrgs();
      setOrgs(allOrgs);

      // Check if we need onboarding (no orgs exist)
      if (allOrgs.length === 0) {
        setNeedsOnboarding(true);
        setCurrentOrg(null);
        return;
      }

      setNeedsOnboarding(false);

      // Restore the previously selected org
      const savedOrgId = localStorage.getItem(CURRENT_ORG_KEY);
      if (savedOrgId) {
        const savedOrg = allOrgs.find((o) => o.id === savedOrgId);
        if (savedOrg) {
          setCurrentOrg(savedOrg);
          return;
        }
      }

      // Fall back to default org or first org
      const defaultOrg = allOrgs.find((o) => o.isDefault) || allOrgs[0];
      setCurrentOrg(defaultOrg);
      localStorage.setItem(CURRENT_ORG_KEY, defaultOrg.id);
    } catch (error) {
      console.error('[useOrgs] Failed to load orgs:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load - trigger via loadCount to avoid direct setState in effect
  useEffect(() => {
    loadOrgs();
  }, [loadOrgs, loadCount]);

  // Refresh function that triggers a reload
  const refresh = useCallback(async () => {
    setLoadCount((c) => c + 1);
  }, []);

  // Select a different org
  const selectOrg = useCallback(async (id: string) => {
    const org = await getOrg(id);
    if (org) {
      setCurrentOrg(org);
      localStorage.setItem(CURRENT_ORG_KEY, id);
    }
  }, []);

  // Create a new org
  const createOrg = useCallback(
    async (input: OrgInput): Promise<Org> => {
      const org = await createOrgInDB(input);
      await loadOrgs();

      // If this is the first org, select it automatically
      if (orgs.length === 0) {
        setCurrentOrg(org);
        localStorage.setItem(CURRENT_ORG_KEY, org.id);
      }

      return org;
    },
    [loadOrgs, orgs.length]
  );

  // Create a shared org (with room ID for P2P sync)
  const createSharedOrg = useCallback(
    async (name: string): Promise<Org> => {
      const org = await createOrgInDB({
        name,
        color: '', // Will be auto-generated
        roomId: generateRoomId(),
      });
      await loadOrgs();
      return org;
    },
    [loadOrgs]
  );

  // Update an org
  const updateOrg = useCallback(
    async (id: string, updates: Partial<OrgInput>): Promise<void> => {
      await updateOrgInDB(id, updates);
      await loadOrgs();

      // If we updated the current org, refresh it
      if (currentOrg?.id === id) {
        const updated = await getOrg(id);
        if (updated) setCurrentOrg(updated);
      }
    },
    [loadOrgs, currentOrg?.id]
  );

  // Delete an org
  const deleteOrg = useCallback(
    async (id: string): Promise<void> => {
      await deleteOrgInDB(id);
      await loadOrgs();

      // If we deleted the current org, switch to another
      if (currentOrg?.id === id) {
        const remaining = await getAllOrgs();
        if (remaining.length > 0) {
          const newCurrent = remaining.find((o) => o.isDefault) || remaining[0];
          setCurrentOrg(newCurrent);
          localStorage.setItem(CURRENT_ORG_KEY, newCurrent.id);
        } else {
          setCurrentOrg(null);
          localStorage.removeItem(CURRENT_ORG_KEY);
          setNeedsOnboarding(true);
        }
      }
    },
    [loadOrgs, currentOrg?.id]
  );

  return {
    orgs,
    currentOrg,
    isLoading,
    needsOnboarding,
    selectOrg,
    createOrg,
    updateOrg,
    deleteOrg,
    createSharedOrg,
    refresh,
  };
}

// Re-export for convenience
export { hasOrgs, createDefaultOrg } from '@/store/orgs';
