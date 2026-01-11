/**
 * Org Provider Component
 *
 * Provides the current org's Yjs store to child components.
 */

import { useState, useEffect, type ReactNode } from 'react';
import type { Org } from '@/types';
import { getOrgStore, type OrgStore } from './index';
import { OrgContext } from './OrgContextTypes';

interface OrgProviderProps {
  org: Org;
  children: ReactNode;
}

export function OrgProvider({ org, children }: OrgProviderProps) {
  const [store, setStore] = useState<OrgStore | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <OrgContext.Provider value={{ org, store, isLoading }}>
      {children}
    </OrgContext.Provider>
  );
}
