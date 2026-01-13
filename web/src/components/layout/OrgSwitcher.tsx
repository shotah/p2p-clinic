/**
 * Org Switcher Component
 *
 * Dropdown in the nav bar to switch between organizations.
 */

import { useState, useRef, useEffect } from 'react';
import type { Org } from '@/types';
import { useOrgContext } from '@/store/useOrgStore';
import './layout.css';

interface OrgSwitcherProps {
  orgs: Org[];
  currentOrg: Org | null;
  onSelectOrg: (id: string) => void;
  onCreateOrg: () => void;
}

export function OrgSwitcher({
  orgs,
  currentOrg,
  onSelectOrg,
  onCreateOrg,
}: OrgSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Get sync state from context (may throw if not in provider, so we catch)
  let syncStatus: 'disconnected' | 'connecting' | 'syncing' | 'error' = 'disconnected';
  try {
    const context = useOrgContext();
    syncStatus = context.syncState.status;
  } catch {
    // Not in OrgProvider context, default to disconnected
  }

  const getSyncStatusColor = () => {
    switch (syncStatus) {
      case 'syncing': return '#22c55e';
      case 'connecting': return '#eab308';
      case 'error': return '#ef4444';
      default: return null;
    }
  };
  
  const syncStatusColor = getSyncStatusColor();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close dropdown on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleSelect = (id: string) => {
    onSelectOrg(id);
    setIsOpen(false);
  };

  return (
    <div className="org-switcher" ref={dropdownRef}>
      <button
        className="org-switcher-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span
          className="org-dot"
          style={{ backgroundColor: currentOrg?.color || '#6b7280' }}
        />
        <span className="org-name">{currentOrg?.name || 'No Org'}</span>
        {syncStatusColor && (
          <span 
            className={`sync-indicator ${syncStatus}`}
            style={{ backgroundColor: syncStatusColor }}
            title={syncStatus === 'syncing' ? 'Syncing' : syncStatus === 'connecting' ? 'Connecting...' : 'Error'}
          />
        )}
        <span className="org-chevron">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="org-switcher-dropdown" role="listbox">
          <div className="org-list">
            {orgs.map((org) => (
              <button
                key={org.id}
                className={`org-option ${
                  org.id === currentOrg?.id ? 'active' : ''
                }`}
                onClick={() => handleSelect(org.id)}
                role="option"
                aria-selected={org.id === currentOrg?.id}
              >
                <span
                  className="org-dot"
                  style={{ backgroundColor: org.color }}
                />
                <span className="org-option-name">{org.name}</span>
                {org.roomId && <span className="org-sync-badge">P2P</span>}
              </button>
            ))}
          </div>
          <div className="org-actions">
            <button className="org-action" onClick={onCreateOrg}>
              + New Organization
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
