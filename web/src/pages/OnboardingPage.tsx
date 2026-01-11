/**
 * Onboarding Page
 *
 * Shown on first run when no orgs exist.
 * Allows user to create their first org or join an existing one.
 */

import { useState } from 'react';
import type { Org } from '@/types';
import './pages.css';

interface OnboardingPageProps {
  onCreateOrg: (name: string, isShared: boolean) => Promise<Org>;
  onJoinOrg: (shareCode: string, password: string) => Promise<void>;
}

type Step = 'choice' | 'create' | 'join';

export function OnboardingPage({
  onCreateOrg,
  onJoinOrg,
}: OnboardingPageProps) {
  const [step, setStep] = useState<Step>('choice');
  const [orgName, setOrgName] = useState('Personal');
  const [isShared, setIsShared] = useState(false);
  const [shareCode, setShareCode] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      setError('Please enter an organization name');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onCreateOrg(orgName.trim(), isShared);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create org');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareCode.trim()) {
      setError('Please enter a share code');
      return;
    }
    if (!password.trim()) {
      setError('Please enter the organization password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onJoinOrg(shareCode.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join org');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-container">
        <div className="onboarding-header">
          <h1>Welcome to P2P Clinic</h1>
          <p>
            Your privacy-first contact and calendar app.
            <br />
            All data stays on your devices.
          </p>
        </div>

        {step === 'choice' && (
          <div className="onboarding-choices">
            <button
              className="onboarding-choice"
              onClick={() => setStep('create')}
            >
              <div className="choice-icon">🏠</div>
              <div className="choice-title">Create New Org</div>
              <div className="choice-description">
                Start fresh with a new organization
              </div>
            </button>

            <button
              className="onboarding-choice"
              onClick={() => setStep('join')}
            >
              <div className="choice-icon">🔗</div>
              <div className="choice-title">Join Existing Org</div>
              <div className="choice-description">
                Connect with someone who shared a code
              </div>
            </button>
          </div>
        )}

        {step === 'create' && (
          <form className="onboarding-form" onSubmit={handleCreate}>
            <div className="form-group">
              <label htmlFor="orgName">Organization Name</label>
              <input
                id="orgName"
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g., Personal, Work, Family"
                autoFocus
              />
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                />
                <span>Enable P2P sync (share with others)</span>
              </label>
              {isShared && (
                <p className="form-hint">
                  You&apos;ll set a password after creating the org.
                </p>
              )}
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setStep('choice');
                  setError(null);
                }}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Organization'}
              </button>
            </div>
          </form>
        )}

        {step === 'join' && (
          <form className="onboarding-form" onSubmit={handleJoin}>
            <div className="form-group">
              <label htmlFor="shareCode">Share Code</label>
              <input
                id="shareCode"
                type="text"
                value={shareCode}
                onChange={(e) => setShareCode(e.target.value.toUpperCase())}
                placeholder="e.g., ABCD-1234"
                autoFocus
              />
              <p className="form-hint">
                Get this from the person inviting you
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="password">Organization Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter the shared password"
              />
              <p className="form-hint">
                This was shared separately (via call/text)
              </p>
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setStep('choice');
                  setError(null);
                }}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
              >
                {isLoading ? 'Joining...' : 'Join Organization'}
              </button>
            </div>
          </form>
        )}

        <div className="onboarding-footer">
          <p>
            🔒 Your data is encrypted and never touches our servers.
          </p>
        </div>
      </div>
    </div>
  );
}
