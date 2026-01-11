/**
 * Signaling Client
 *
 * Handles communication with the Worker for peer discovery.
 */

const DEFAULT_WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';

interface InviteResponse {
  code: string;
  expiresIn: number;
}

interface JoinResponse {
  roomId: string;
  message: string;
}

interface PeerAnnouncement {
  peerId: string;
  sdpOffer?: string;
  iceCandidates?: string[];
  lastSeen: number;
}

interface PeersResponse {
  roomId: string;
  peers: PeerAnnouncement[];
  count: number;
}

export class SignalingClient {
  private baseUrl: string;

  constructor(workerUrl: string = DEFAULT_WORKER_URL) {
    this.baseUrl = workerUrl;
  }

  /**
   * Create a one-time share code for a room
   */
  async createInvite(roomId: string): Promise<InviteResponse> {
    const response = await fetch(`${this.baseUrl}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create invite');
    }

    return response.json();
  }

  /**
   * Join a room using a share code
   */
  async joinWithCode(code: string): Promise<JoinResponse> {
    const response = await fetch(`${this.baseUrl}/join/${code}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Invalid or expired share code');
    }

    return response.json();
  }

  /**
   * Announce our presence in a room
   */
  async announce(
    roomId: string,
    peerId: string,
    sdpOffer?: string,
    iceCandidates?: string[]
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/room/${roomId}/announce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerId, sdpOffer, iceCandidates }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to announce');
    }
  }

  /**
   * Get active peers in a room
   */
  async getPeers(roomId: string): Promise<PeersResponse> {
    const response = await fetch(`${this.baseUrl}/room/${roomId}/peers`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get peers');
    }

    return response.json();
  }

  /**
   * Connect to WebSocket for real-time signaling
   */
  connectWebSocket(roomId: string): WebSocket {
    const wsUrl = this.baseUrl.replace('http', 'ws');
    return new WebSocket(`${wsUrl}/room/${roomId}/signal`);
  }
}

// Singleton instance
export const signalingClient = new SignalingClient();
