/**
 * Org Context Types and Context Object
 */

import { createContext } from 'react';
import type { Org } from '@/types';
import type { OrgStore } from './index';

export interface OrgContextValue {
  org: Org;
  store: OrgStore | null;
  isLoading: boolean;
}

export const OrgContext = createContext<OrgContextValue | null>(null);

// Re-export OrgStore type for convenience
export type { OrgStore };
