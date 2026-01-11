import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import {
  ContactsPage,
  CalendarPage,
  SettingsPage,
  OnboardingPage,
} from '@/pages';
import { useOrgs } from '@/hooks';
import { OrgProvider } from '@/store/OrgContext';
import type { Org } from '@/types';
import './pages/pages.css';

function App() {
  const {
    orgs,
    currentOrg,
    isLoading,
    needsOnboarding,
    selectOrg,
    createOrg,
    refresh,
  } = useOrgs();

  // State for showing the create org modal
  const [showCreateOrg, setShowCreateOrg] = useState(false);

  // Handle creating a new org
  const handleCreateOrg = async (
    name: string,
    isShared: boolean
  ): Promise<Org> => {
    const org = await createOrg({
      name,
      color: '', // Auto-generated
      isDefault: orgs.length === 0,
      roomId: isShared ? crypto.randomUUID() : undefined,
    });
    await refresh();
    setShowCreateOrg(false);
    return org;
  };

  // Handle joining an existing org (placeholder - will be implemented with P2P)
  const handleJoinOrg = async (
    shareCode: string,
    password: string
  ): Promise<void> => {
    // TODO: Implement with Worker signaling
    if (!shareCode || !password) {
      throw new Error('Share code and password are required');
    }
    throw new Error('P2P sync not yet implemented');
  };

  // Handle org selection
  const handleSelectOrg = (id: string) => {
    selectOrg(id);
  };

  // Handle creating a new org from the switcher
  const handleCreateOrgClick = () => {
    setShowCreateOrg(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  // Onboarding for new users or creating new org
  if (needsOnboarding || showCreateOrg) {
    return (
      <OnboardingPage
        onCreateOrg={handleCreateOrg}
        onJoinOrg={handleJoinOrg}
      />
    );
  }

  // Must have a current org at this point
  if (!currentOrg) {
    return (
      <div className="error-screen">
        <h1>Error</h1>
        <p>No organization found. Please refresh the page.</p>
      </div>
    );
  }

  // Main app with org context
  return (
    <OrgProvider org={currentOrg} key={currentOrg.id}>
      <Routes>
        <Route
          element={
            <AppLayout
              orgs={orgs}
              currentOrg={currentOrg}
              onSelectOrg={handleSelectOrg}
              onCreateOrg={handleCreateOrgClick}
            />
          }
        >
          <Route path="/" element={<Navigate to="/calendar" replace />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </OrgProvider>
  );
}

export default App;
