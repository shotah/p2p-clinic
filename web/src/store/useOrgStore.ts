/**
 * Hooks for accessing the Org Context
 */

import { useContext } from 'react';
import { OrgContext, type OrgContextValue, type OrgStore } from './OrgContextTypes';

/**
 * Hook to access the current org context
 */
export function useOrgContext(): OrgContextValue {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error('useOrgContext must be used within an OrgProvider');
  }
  return context;
}

/**
 * Hook to access the current org's store (throws if not loaded)
 */
export function useOrgStore(): OrgStore {
  const { store, isLoading } = useOrgContext();
  if (isLoading || !store) {
    throw new Error('Org store is not loaded yet');
  }
  return store;
}
