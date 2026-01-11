/**
 * Sync Manager
 *
 * Orchestrates P2P synchronization:
 * 1. Connects to signaling server
 * 2. Discovers peers
 * 3. Performs challenge-response authentication
 * 4. Establishes WebRTC connections
 * 5. Syncs Yjs documents
 */

import * as Y from 'yjs';
import {
  generateChallenge,
  signChallenge,
  verifyChallenge,
  deriveKeys,
} from '@/crypto';
import { signalingClient, SignalingClient } from './SignalingClient';

// Polling interval for peer discovery (seconds)
const POLL_INTERVAL = 30;
const ANNOUNCE_INTERVAL = 60;

// WebRTC configuration
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export type SyncStatus = 'disconnected' | 'connecting' | 'syncing' | 'error';

export interface SyncEvents {
  onStatusChange?: (status: SyncStatus) => void;
  onPeerConnected?: (peerId: string) => void;
  onPeerDisconnected?: (peerId: string) => void;
  onError?: (error: Error) => void;
}

export class SyncManager {
  private roomId: string;
  private password: string;
  private doc: Y.Doc;
  private peerId: string;
  private client: SignalingClient;

  private authKey: CryptoKey | null = null;
  private encryptionKey: CryptoKey | null = null;

  private ws: WebSocket | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private authenticatedPeers: Set<string> = new Set();

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private announceTimer: ReturnType<typeof setInterval> | null = null;

  private status: SyncStatus = 'disconnected';
  private events: SyncEvents;

  constructor(
    roomId: string,
    password: string,
    doc: Y.Doc,
    events: SyncEvents = {}
  ) {
    this.roomId = roomId;
    this.password = password;
    this.doc = doc;
    this.peerId = crypto.randomUUID();
    this.client = signalingClient;
    this.events = events;
  }

  /**
   * Start syncing
   */
  async start(): Promise<void> {
    if (this.status !== 'disconnected') {
      return;
    }

    this.setStatus('connecting');

    try {
      // Derive encryption keys from password
      const keys = await deriveKeys(this.password, this.roomId);
      this.authKey = keys.authKey;
      this.encryptionKey = keys.encryptionKey;

      // Connect to WebSocket for signaling
      this.connectWebSocket();

      // Start polling for peers
      this.startPolling();

      // Announce our presence
      await this.announce();
      this.startAnnouncing();

      this.setStatus('syncing');
    } catch (error) {
      this.setStatus('error');
      this.events.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Stop syncing
   */
  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.announceTimer) {
      clearInterval(this.announceTimer);
      this.announceTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Close all peer connections
    for (const pc of this.peerConnections.values()) {
      pc.close();
    }
    this.peerConnections.clear();
    this.dataChannels.clear();
    this.authenticatedPeers.clear();

    this.setStatus('disconnected');
  }

  /**
   * Get current status
   */
  getStatus(): SyncStatus {
    return this.status;
  }

  /**
   * Get connected peer count
   */
  getPeerCount(): number {
    return this.authenticatedPeers.size;
  }

  /**
   * Check if encryption is ready
   */
  hasEncryptionKey(): boolean {
    return this.encryptionKey !== null;
  }

  private setStatus(status: SyncStatus): void {
    this.status = status;
    this.events.onStatusChange?.(status);
  }

  private connectWebSocket(): void {
    this.ws = this.client.connectWebSocket(this.roomId);

    this.ws.onopen = () => {
      console.log('[Sync] WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      this.handleSignalingMessage(JSON.parse(event.data));
    };

    this.ws.onclose = () => {
      console.log('[Sync] WebSocket disconnected');
      // Attempt reconnection after delay
      setTimeout(() => {
        if (this.status === 'syncing') {
          this.connectWebSocket();
        }
      }, 5000);
    };

    this.ws.onerror = (error) => {
      console.error('[Sync] WebSocket error:', error);
    };
  }

  private async handleSignalingMessage(
    msg: Record<string, unknown>
  ): Promise<void> {
    const type = msg.type as string;
    const from = msg.from as string | undefined;

    switch (type) {
      case 'peers': {
        // Initial list of peers
        const peers = msg.peers as string[];
        for (const peerId of peers) {
          await this.initiateConnection(peerId);
        }
        break;
      }

      case 'peer-joined': {
        // New peer joined
        const newPeerId = msg.peerId as string;
        await this.initiateConnection(newPeerId);
        break;
      }

      case 'peer-left': {
        // Peer left
        const leftPeerId = msg.peerId as string;
        this.handlePeerDisconnected(leftPeerId);
        break;
      }

      case 'offer':
        // WebRTC offer from peer
        if (from) {
          await this.handleOffer(from, msg.sdp as RTCSessionDescriptionInit);
        }
        break;

      case 'answer':
        // WebRTC answer from peer
        if (from) {
          await this.handleAnswer(from, msg.sdp as RTCSessionDescriptionInit);
        }
        break;

      case 'ice':
        // ICE candidate from peer
        if (from) {
          await this.handleIceCandidate(
            from,
            msg.candidate as RTCIceCandidateInit
          );
        }
        break;
    }
  }

  private async initiateConnection(peerId: string): Promise<void> {
    if (this.peerConnections.has(peerId)) {
      return; // Already connecting/connected
    }

    console.log(`[Sync] Initiating connection to ${peerId}`);

    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.peerConnections.set(peerId, pc);

    // Create data channel
    const dc = pc.createDataChannel('sync', { ordered: true });
    this.setupDataChannel(peerId, dc);

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignaling(peerId, {
          type: 'ice',
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.sendSignaling(peerId, {
      type: 'offer',
      sdp: pc.localDescription,
    });
  }

  private async handleOffer(
    peerId: string,
    sdp: RTCSessionDescriptionInit
  ): Promise<void> {
    console.log(`[Sync] Received offer from ${peerId}`);

    let pc = this.peerConnections.get(peerId);
    if (!pc) {
      pc = new RTCPeerConnection(RTC_CONFIG);
      this.peerConnections.set(peerId, pc);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignaling(peerId, {
            type: 'ice',
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.ondatachannel = (event) => {
        this.setupDataChannel(peerId, event.channel);
      };
    }

    await pc.setRemoteDescription(sdp);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.sendSignaling(peerId, {
      type: 'answer',
      sdp: pc.localDescription,
    });
  }

  private async handleAnswer(
    peerId: string,
    sdp: RTCSessionDescriptionInit
  ): Promise<void> {
    console.log(`[Sync] Received answer from ${peerId}`);
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      await pc.setRemoteDescription(sdp);
    }
  }

  private async handleIceCandidate(
    peerId: string,
    candidate: RTCIceCandidateInit
  ): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      await pc.addIceCandidate(candidate);
    }
  }

  private setupDataChannel(peerId: string, dc: RTCDataChannel): void {
    this.dataChannels.set(peerId, dc);

    dc.onopen = () => {
      console.log(`[Sync] Data channel open with ${peerId}`);
      // Start challenge-response authentication
      this.initiateAuth(peerId);
    };

    dc.onclose = () => {
      console.log(`[Sync] Data channel closed with ${peerId}`);
      this.handlePeerDisconnected(peerId);
    };

    dc.onmessage = (event) => {
      this.handleDataChannelMessage(peerId, JSON.parse(event.data));
    };
  }

  private async initiateAuth(peerId: string): Promise<void> {
    // Send a challenge
    const challenge = generateChallenge();
    const dc = this.dataChannels.get(peerId);
    if (dc && dc.readyState === 'open') {
      dc.send(
        JSON.stringify({
          type: 'auth-challenge',
          challenge,
        })
      );
    }
  }

  private async handleDataChannelMessage(
    peerId: string,
    msg: Record<string, unknown>
  ): Promise<void> {
    const type = msg.type as string;
    const dc = this.dataChannels.get(peerId);

    switch (type) {
      case 'auth-challenge':
        // Respond to challenge
        if (this.authKey) {
          const response = await signChallenge(
            msg.challenge as string,
            this.authKey
          );
          dc?.send(
            JSON.stringify({
              type: 'auth-response',
              challenge: msg.challenge,
              response,
            })
          );
        }
        break;

      case 'auth-response':
        // Verify response
        if (this.authKey) {
          const valid = await verifyChallenge(
            msg.challenge as string,
            msg.response as string,
            this.authKey
          );

          if (valid) {
            console.log(`[Sync] Peer ${peerId} authenticated`);
            this.authenticatedPeers.add(peerId);
            this.events.onPeerConnected?.(peerId);

            // Send confirmation
            dc?.send(JSON.stringify({ type: 'auth-success' }));

            // Start Yjs sync
            this.startYjsSync(peerId);
          } else {
            console.warn(`[Sync] Peer ${peerId} failed authentication`);
            // Close connection
            this.peerConnections.get(peerId)?.close();
          }
        }
        break;

      case 'auth-success':
        // We're authenticated
        console.log(`[Sync] We authenticated with ${peerId}`);
        this.authenticatedPeers.add(peerId);
        this.events.onPeerConnected?.(peerId);
        this.startYjsSync(peerId);
        break;

      case 'yjs-update':
        // Apply Yjs update
        if (this.authenticatedPeers.has(peerId)) {
          const update = Uint8Array.from(atob(msg.update as string), (c) =>
            c.charCodeAt(0)
          );
          Y.applyUpdate(this.doc, update);
        }
        break;

      case 'yjs-sync-request':
        // Peer is requesting full state
        if (this.authenticatedPeers.has(peerId)) {
          const state = Y.encodeStateAsUpdate(this.doc);
          dc?.send(
            JSON.stringify({
              type: 'yjs-sync-response',
              update: btoa(String.fromCharCode(...state)),
            })
          );
        }
        break;

      case 'yjs-sync-response':
        // Apply full state
        if (this.authenticatedPeers.has(peerId)) {
          const update = Uint8Array.from(atob(msg.update as string), (c) =>
            c.charCodeAt(0)
          );
          Y.applyUpdate(this.doc, update);
        }
        break;
    }
  }

  private startYjsSync(peerId: string): void {
    const dc = this.dataChannels.get(peerId);
    if (!dc) return;

    // Request full state sync
    dc.send(JSON.stringify({ type: 'yjs-sync-request' }));

    // Subscribe to document changes
    const observer = (update: Uint8Array, origin: unknown) => {
      // Don't send updates that came from this peer
      if (origin === peerId) return;

      if (this.authenticatedPeers.has(peerId) && dc.readyState === 'open') {
        dc.send(
          JSON.stringify({
            type: 'yjs-update',
            update: btoa(String.fromCharCode(...update)),
          })
        );
      }
    };

    this.doc.on('update', observer);
  }

  private handlePeerDisconnected(peerId: string): void {
    this.peerConnections.delete(peerId);
    this.dataChannels.delete(peerId);

    if (this.authenticatedPeers.has(peerId)) {
      this.authenticatedPeers.delete(peerId);
      this.events.onPeerDisconnected?.(peerId);
    }
  }

  private sendSignaling(
    to: string,
    message: Record<string, unknown>
  ): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ ...message, to }));
    }
  }

  private async announce(): Promise<void> {
    try {
      await this.client.announce(this.roomId, this.peerId);
    } catch (error) {
      console.error('[Sync] Failed to announce:', error);
    }
  }

  private startPolling(): void {
    this.pollTimer = setInterval(async () => {
      try {
        const { peers } = await this.client.getPeers(this.roomId);
        // Try to connect to any peers we're not already connected to
        for (const peer of peers) {
          if (
            peer.peerId !== this.peerId &&
            !this.peerConnections.has(peer.peerId)
          ) {
            // Could initiate connection here, but we rely on WebSocket signaling
            console.log(`[Sync] Found peer via polling: ${peer.peerId}`);
          }
        }
      } catch (error) {
        console.error('[Sync] Polling error:', error);
      }
    }, POLL_INTERVAL * 1000);
  }

  private startAnnouncing(): void {
    this.announceTimer = setInterval(() => {
      this.announce();
    }, ANNOUNCE_INTERVAL * 1000);
  }
}
