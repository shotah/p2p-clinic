import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { useOrgContext } from '@/store/useOrgStore';
import { useNotifications, useCalendarEvents, useTheme } from '@/hooks';
import {
  clearAllData,
  exportBackup,
  getDataStats,
  importBackup,
  exportContactsVCard,
  exportEventsICS,
} from '@/utils/backup';
import './pages.css';

// Password strength indicator
function getPasswordStrength(password: string): { level: number; label: string; color: string } {
  if (!password) return { level: 0, label: '', color: '' };
  
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  if (score <= 1) return { level: 1, label: 'Weak', color: '#ef4444' };
  if (score <= 2) return { level: 2, label: 'Fair', color: '#f97316' };
  if (score <= 3) return { level: 3, label: 'Good', color: '#eab308' };
  if (score <= 4) return { level: 4, label: 'Strong', color: '#22c55e' };
  return { level: 5, label: 'Very Strong', color: '#14b8a6' };
}

export function SettingsPage() {
  const { 
    org, 
    store, 
    isLoading,
    syncState,
    enableP2P,
    disableP2P,
    startSync,
    stopSync,
    generateShareCode,
    leaveOrg,
  } = useOrgContext();
  
  const [stats, setStats] = useState({ contacts: 0, events: 0 });
  const [importResult, setImportResult] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notifications
  const { events } = useCalendarEvents();
  const { 
    isSupported: notificationsSupported, 
    permission: notificationPermission,
    requestPermission: requestNotificationPermission,
    scheduleReminders,
    scheduledCount,
  } = useNotifications();

  // Theme
  const { theme, setTheme } = useTheme();

  // Schedule reminders when events change
  useEffect(() => {
    if (notificationPermission === 'granted' && events.length > 0) {
      scheduleReminders(events);
    }
  }, [notificationPermission, events, scheduleReminders]);

  // P2P Settings state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [p2pError, setP2pError] = useState<string | null>(null);
  const [p2pSuccess, setP2pSuccess] = useState<string | null>(null);
  const [isEnabling, setIsEnabling] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [syncPassword, setSyncPassword] = useState('');

  const passwordStrength = getPasswordStrength(password);

  // Create the maps object for backup functions
  const maps = useMemo(() => {
    if (!store) return null;
    return {
      contactsMap: store.contactsMap,
      eventsMap: store.eventsMap,
    };
  }, [store]);

  // Refresh stats
  const refreshStats = useCallback(() => {
    if (maps) {
      setStats(getDataStats(maps));
    }
  }, [maps]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const handleExport = () => {
    if (!maps) return;
    exportBackup(org, maps);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !maps) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await importBackup(file, maps);
      setImportResult(
        `Imported ${result.contacts} contacts and ${result.events} events.` +
          (result.merged
            ? ' Some items were already present and were updated if newer.'
            : '')
      );
      refreshStats();
    } catch (err) {
      setImportResult(
        `Error: ${err instanceof Error ? err.message : 'Failed to import'}`
      );
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClearData = () => {
    if (!maps) return;
    if (
      confirm(
        'Are you sure you want to delete ALL data? This cannot be undone!'
      )
    ) {
      if (
        confirm('Really delete everything? Consider exporting a backup first.')
      ) {
        clearAllData(maps);
        refreshStats();
        setImportResult('All data cleared.');
      }
    }
  };

  // Leave org - deletes all local data and forgets about the room
  // For P2P orgs: other peers keep their copies - this only affects local device
  const handleLeaveOrg = async () => {
    const isShared = !!org.roomId;
    const warningMsg = isShared
      ? 'This will delete all local data for this organization and stop syncing.\n\n' +
        'Other peers will keep their copies - this only affects your device.\n\n' +
        'This cannot be undone!'
      : 'This will permanently delete this organization and all its data.\n\n' +
        'This cannot be undone!';

    if (!confirm(warningMsg)) {
      return;
    }

    if (!confirm('Are you absolutely sure? Consider exporting a backup first.')) {
      return;
    }

    await leaveOrg();
  };

  // P2P handlers
  const handleEnableP2P = async () => {
    setP2pError(null);
    setP2pSuccess(null);
    
    if (!password) {
      setP2pError('Password is required');
      return;
    }
    if (password !== confirmPassword) {
      setP2pError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setP2pError('Password must be at least 8 characters');
      return;
    }

    setIsEnabling(true);
    try {
      await enableP2P(password);
      setP2pSuccess('P2P sync enabled! You can now generate share codes.');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setP2pError(err instanceof Error ? err.message : 'Failed to enable P2P');
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDisableP2P = async () => {
    if (!confirm('Disable P2P sync? Other peers will no longer be able to sync with this org.')) {
      return;
    }
    setP2pError(null);
    setP2pSuccess(null);
    
    try {
      await disableP2P();
      setP2pSuccess('P2P sync disabled.');
    } catch (err) {
      setP2pError(err instanceof Error ? err.message : 'Failed to disable P2P');
    }
  };

  const handleGenerateShareCode = async () => {
    setP2pError(null);
    setShareCode(null);
    setIsGeneratingCode(true);
    
    try {
      const code = await generateShareCode();
      setShareCode(code);
    } catch (err) {
      setP2pError(err instanceof Error ? err.message : 'Failed to generate share code');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleCopyShareCode = () => {
    if (shareCode) {
      navigator.clipboard.writeText(shareCode);
      setP2pSuccess('Share code copied to clipboard!');
    }
  };

  const handleStartSync = async () => {
    setP2pError(null);
    
    if (!syncPassword) {
      setP2pError('Password is required to start syncing');
      return;
    }

    try {
      await startSync(syncPassword);
      setShowPasswordPrompt(false);
      setSyncPassword('');
    } catch (err) {
      setP2pError(err instanceof Error ? err.message : 'Failed to start sync');
    }
  };

  const handleStopSync = () => {
    stopSync();
  };

  // Status display helpers
  const getStatusColor = () => {
    switch (syncState.status) {
      case 'syncing': return '#22c55e';
      case 'connecting': return '#eab308';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = () => {
    switch (syncState.status) {
      case 'syncing': return `Syncing (${syncState.peerCount} peer${syncState.peerCount !== 1 ? 's' : ''})`;
      case 'connecting': return 'Connecting...';
      case 'error': return 'Error';
      default: return 'Offline';
    }
  };

  if (isLoading) {
    return (
      <div className="settings-page">
        <div className="settings-container">
          <div className="spinner" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-container">
        <h1>Settings</h1>

        <section className="settings-section">
          <h2>Current Organization</h2>
          <div className="org-info">
            <span
              className="org-dot large"
              style={{ backgroundColor: org.color }}
            />
            <span className="org-info-name">{org.name}</span>
            {org.roomId && <span className="org-sync-badge">P2P Enabled</span>}
          </div>
        </section>

        <section className="settings-section">
          <h2>P2P Sync</h2>
          
          {p2pError && (
            <div className="import-result error">{p2pError}</div>
          )}
          {p2pSuccess && (
            <div className="import-result success">{p2pSuccess}</div>
          )}

          {!org.roomId ? (
            /* P2P not enabled - show setup form */
            <div className="p2p-setup">
              <p className="section-description">
                Enable P2P sync to share this organization with others.
                You'll need to create a password that all members will use.
              </p>
              
              <div className="form-group">
                <label htmlFor="p2p-password">Sync Password</label>
                <input
                  id="p2p-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                />
                {password && (
                  <div className="password-strength">
                    <div className="strength-bar">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className="strength-segment"
                          style={{
                            backgroundColor: level <= passwordStrength.level ? passwordStrength.color : 'var(--color-border)',
                          }}
                        />
                      ))}
                    </div>
                    <span style={{ color: passwordStrength.color }}>
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="p2p-confirm">Confirm Password</label>
                <input
                  id="p2p-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                />
              </div>

              <button 
                className="btn btn-primary"
                onClick={handleEnableP2P}
                disabled={isEnabling || !password || !confirmPassword}
              >
                {isEnabling ? 'Enabling...' : 'Enable P2P Sync'}
              </button>
            </div>
          ) : (
            /* P2P enabled - show status and controls */
            <div className="p2p-enabled">
              <div className="sync-status">
                <span 
                  className="status-dot" 
                  style={{ backgroundColor: getStatusColor() }}
                />
                <span className="status-label">{getStatusLabel()}</span>
              </div>

              {syncState.status === 'disconnected' && !showPasswordPrompt && (
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowPasswordPrompt(true)}
                >
                  Start Syncing
                </button>
              )}

              {showPasswordPrompt && syncState.status === 'disconnected' && (
                <div className="sync-password-prompt">
                  <div className="form-group">
                    <label htmlFor="sync-password">Enter Sync Password</label>
                    <input
                      id="sync-password"
                      type="password"
                      value={syncPassword}
                      onChange={(e) => setSyncPassword(e.target.value)}
                      placeholder="Enter your sync password"
                      onKeyDown={(e) => e.key === 'Enter' && handleStartSync()}
                    />
                  </div>
                  <div className="button-row">
                    <button 
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowPasswordPrompt(false);
                        setSyncPassword('');
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn btn-primary"
                      onClick={handleStartSync}
                      disabled={!syncPassword}
                    >
                      Connect
                    </button>
                  </div>
                </div>
              )}

              {syncState.status !== 'disconnected' && (
                <button 
                  className="btn btn-secondary"
                  onClick={handleStopSync}
                >
                  Stop Syncing
                </button>
              )}

              <hr className="divider" />

              <h3>Invite Others</h3>
              <p className="section-description">
                Generate a one-time share code (valid for 5 minutes).
                Share the code and password out-of-band (e.g., call or text).
              </p>

              <div className="button-row">
                <button 
                  className="btn btn-secondary"
                  onClick={handleGenerateShareCode}
                  disabled={isGeneratingCode}
                >
                  {isGeneratingCode ? 'Generating...' : 'Generate Share Code'}
                </button>
              </div>

              {shareCode && (
                <div className="share-code-display">
                  <div className="share-code-content">
                    <span className="share-code">{shareCode}</span>
                    <button className="btn btn-small" onClick={handleCopyShareCode}>
                      Copy
                    </button>
                  </div>
                  <div className="share-code-qr">
                    <QRCode 
                      value={shareCode} 
                      size={120}
                      bgColor="transparent"
                      fgColor="#e0e0e0"
                    />
                    <p className="qr-hint">Scan to copy code</p>
                  </div>
                </div>
              )}

              <hr className="divider" />

              <details className="debug-details">
                <summary>Debug Info</summary>
                <div className="debug-info">
                  <div><strong>Room ID:</strong> <code>{org.roomId}</code></div>
                  <div><strong>Password Hash:</strong> <code>{org.passwordHash ? '••••••' : 'None'}</code></div>
                </div>
              </details>

              <hr className="divider" />

              <button 
                className="btn btn-danger"
                onClick={handleDisableP2P}
              >
                Disable P2P Sync
              </button>
            </div>
          )}
        </section>

        <section className="settings-section">
          <h2>Data Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.contacts}</div>
              <div className="stat-label">Contacts</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.events}</div>
              <div className="stat-label">Events</div>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2>Backup &amp; Restore</h2>
          <p className="section-description">
            Export your data as a JSON file for backup, or import from a
            previous backup.
          </p>

          <div className="button-row">
            <button className="btn btn-primary" onClick={handleExport}>
              Export Backup
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleImportClick}
              disabled={isImporting}
            >
              {isImporting ? 'Importing...' : 'Import Backup'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          <h3 style={{ marginTop: '1rem' }}>Export Formats</h3>
          <p className="section-description">
            Export contacts or calendar in standard formats for other apps.
          </p>

          <div className="button-row">
            <button 
              className="btn btn-secondary"
              onClick={() => exportContactsVCard(Array.from(store?.contactsMap.values() || []), org.name)}
              disabled={stats.contacts === 0}
            >
              Export Contacts (.vcf)
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => exportEventsICS(events, org.name)}
              disabled={stats.events === 0}
            >
              Export Calendar (.ics)
            </button>
          </div>

          {importResult && (
            <div
              className={`import-result ${
                importResult.startsWith('Error') ? 'error' : 'success'
              }`}
            >
              {importResult}
            </div>
          )}
        </section>

        <section className="settings-section">
          <h2>Notifications</h2>
          <p className="section-description">
            Get browser notifications for calendar event reminders.
          </p>

          {!notificationsSupported ? (
            <div className="notification-status disabled">
              <span className="notification-icon">🔕</span>
              <span>Notifications not supported in this browser</span>
            </div>
          ) : notificationPermission === 'granted' ? (
            <div className="notification-status enabled">
              <span className="notification-icon">🔔</span>
              <span>
                Notifications enabled
                {scheduledCount > 0 && ` • ${scheduledCount} reminder${scheduledCount !== 1 ? 's' : ''} scheduled`}
              </span>
            </div>
          ) : notificationPermission === 'denied' ? (
            <div className="notification-status disabled">
              <span className="notification-icon">🔕</span>
              <span>Notifications blocked. Enable them in browser settings.</span>
            </div>
          ) : (
            <div className="notification-prompt">
              <p>Allow notifications to receive reminders for your calendar events.</p>
              <button 
                className="btn btn-primary"
                onClick={requestNotificationPermission}
              >
                Enable Notifications
              </button>
            </div>
          )}
        </section>

        <section className="settings-section">
          <h2>Appearance</h2>
          <p className="section-description">
            Customize how P2P Clinic looks on your device.
          </p>

          <div className="theme-toggle">
            <label className="theme-option">
              <input
                type="radio"
                name="theme"
                value="light"
                checked={theme === 'light'}
                onChange={() => setTheme('light')}
              />
              <span className="theme-icon">☀️</span>
              <span>Light</span>
            </label>
            <label className="theme-option">
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={theme === 'dark'}
                onChange={() => setTheme('dark')}
              />
              <span className="theme-icon">🌙</span>
              <span>Dark</span>
            </label>
            <label className="theme-option">
              <input
                type="radio"
                name="theme"
                value="system"
                checked={theme === 'system'}
                onChange={() => setTheme('system')}
              />
              <span className="theme-icon">💻</span>
              <span>System</span>
            </label>
          </div>
        </section>

        <section className="settings-section danger-zone">
          <h2>Danger Zone</h2>
          
          <div className="danger-item">
            <div>
              <strong>Clear All Data</strong>
              <p className="section-description">
                Delete all contacts and events. The organization itself remains.
              </p>
            </div>
            <button className="btn btn-danger" onClick={handleClearData}>
              Clear Data
            </button>
          </div>

          <div className="danger-item">
            <div>
              <strong>Leave Organization</strong>
              <p className="section-description">
                {org.roomId
                  ? 'Delete all local data and stop syncing. Other peers keep their copies.'
                  : 'Permanently delete this organization and all its data.'}
              </p>
            </div>
            <button className="btn btn-danger" onClick={handleLeaveOrg}>
              {org.roomId ? 'Leave Org' : 'Delete Org'}
            </button>
          </div>
        </section>

        <section className="settings-section">
          <h2>About</h2>
          <p className="section-description">
            P2P Clinic is a privacy-first contact and calendar app. Your data is
            stored locally and syncs peer-to-peer — no server ever sees your
            information.
          </p>
          <div className="about-info">
            <div>
              <strong>Version:</strong> 0.0.1
            </div>
            <div>
              <strong>Storage:</strong> IndexedDB (local)
            </div>
            <div>
              <strong>Sync:</strong>{' '}
              {org.roomId ? 'P2P Enabled' : 'Local Only'}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
