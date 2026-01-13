import { useState, useCallback } from 'react';
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
import { signalingClient } from '@/sync/SignalingClient';
import { hashPassword } from '@/crypto';
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
    updateCurrentOrg,
    leaveOrg,
    refresh,
  } = useOrgs();

  // Handler for when org is updated from within context
  const handleOrgUpdate = useCallback((updatedOrg: Org) => {
    updateCurrentOrg(updatedOrg);
  }, [updateCurrentOrg]);

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

  // Handle joining an existing org via share code
  const handleJoinOrg = async (
    shareCode: string,
    password: string,
    name: string
  ): Promise<void> => {
    if (!shareCode || !password) {
      throw new Error('Share code and password are required');
    }

    // Exchange share code for room ID
    const { roomId } = await signalingClient.joinWithCode(shareCode);

    // Hash the password for verification
    const passwordHash = await hashPassword(password);

    // Create a local org linked to this room
    const org = await createOrg({
      name: name || 'Shared Org',
      color: '', // Auto-generated
      isDefault: orgs.length === 0,
      roomId,
      passwordHash,
    });

    await refresh();
    selectOrg(org.id);
    setShowCreateOrg(false);
  };

  // Handle org selection
  const handleSelectOrg = (id: string) => {
    selectOrg(id);
  };

  // Handle leaving current org (called from OrgContext)
  const handleLeaveOrg = useCallback(async () => {
    if (currentOrg) {
      await leaveOrg(currentOrg.id);
    }
  }, [currentOrg, leaveOrg]);

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
    <OrgProvider org={currentOrg} onOrgUpdate={handleOrgUpdate} onLeaveOrg={handleLeaveOrg} key={currentOrg.id}>
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
