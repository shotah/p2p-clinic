import { NavLink, Outlet } from 'react-router-dom';
import type { Org } from '@/types';
import { OrgSwitcher } from './OrgSwitcher';
import './layout.css';

interface AppLayoutProps {
  orgs?: Org[];
  currentOrg?: Org | null;
  onSelectOrg?: (id: string) => void;
  onCreateOrg?: () => void;
}

export function AppLayout({
  orgs = [],
  currentOrg,
  onSelectOrg,
  onCreateOrg,
}: AppLayoutProps) {
  return (
    <div className="app-layout">
      <nav className="app-nav">
        <div className="nav-brand">P2P Clinic</div>
        <div className="nav-links">
          <NavLink
            to="/contacts"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Contacts
          </NavLink>
          <NavLink
            to="/calendar"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Calendar
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Settings
          </NavLink>
        </div>
        <div className="nav-spacer" />
        {onSelectOrg && onCreateOrg ? (
          <OrgSwitcher
            orgs={orgs}
            currentOrg={currentOrg ?? null}
            onSelectOrg={onSelectOrg}
            onCreateOrg={onCreateOrg}
          />
        ) : (
          <div className="nav-status">
            <span
              className="status-dot"
              style={{ backgroundColor: currentOrg?.color || '#6b7280' }}
            />
            <span className="status-text">{currentOrg?.name || 'No Org'}</span>
          </div>
        )}
      </nav>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
