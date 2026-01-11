import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOrgContext } from '@/store/useOrgStore';
import {
  clearAllData,
  exportBackup,
  getDataStats,
  importBackup,
} from '@/utils/backup';
import './pages.css';

export function SettingsPage() {
  const { org, store, isLoading } = useOrgContext();
  const [stats, setStats] = useState({ contacts: 0, events: 0 });
  const [importResult, setImportResult] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

        <section className="settings-section danger-zone">
          <h2>Danger Zone</h2>
          <p className="section-description">
            Permanently delete all local data for this organization. This cannot
            be undone!
          </p>
          <button className="btn btn-danger" onClick={handleClearData}>
            Clear All Data
          </button>
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
