# P2P Clinic

A privacy-first, peer-to-peer contact library and calendar application. No client data ever touches the server.

## Overview

P2P Clinic allows users to manage contacts, calendar events, and reminders entirely on their own devices. Data syncs directly between peers using WebRTC, with a minimal Cloudflare Worker serving only as a signaling server to help peers discover each other.

## Core Features

- **Multi-Org** - Manage multiple organizations (personal, work, projects)
- **Contact Library** - Store and manage contacts per org
- **Calendar** - Schedule events and appointments per org
- **Reminders** - Set reminders on calendar events
- **P2P Sync** - Invite peers with one-time share codes + password
- **Offline-First** - Works completely offline, syncs when peers are available
- **End-to-End Encrypted** - Password-protected orgs, worker never sees data

## Architecture

```
┌─────────────────┐         ┌─────────────────┐
│   Browser A     │◄───────►│   Browser B     │
│  (IndexedDB)    │  WebRTC │  (IndexedDB)    │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │ Signaling only            │ Signaling only
         │ (no user data)            │ (no user data)
         ▼                           ▼
    ┌─────────────────────────────────────┐
    │     Cloudflare Worker (Signaling)   │
    │     - Peer discovery via share code │
    │     - WebSocket presence            │
    │     - No data storage               │
    └─────────────────────────────────────┘
```

### Client (Cloudflare Pages)

- **Tech Stack**: TypeScript, Vite, React
- **Local Storage**: IndexedDB per org (contacts, events, reminders)
- **Sync Engine**: Yjs (CRDT) for conflict-free P2P synchronization
- **Transport**: WebRTC for direct peer-to-peer connections
- **Encryption**: End-to-end encryption derived from org password (PBKDF2)

### Worker (Cloudflare Workers)

- **Purpose**: Signaling server only (bulletin board style)
- **Features**:
  - One-time share code generation and validation
  - Peer announcement via HTTP POST (stored in KV, 2 min TTL)
  - Peer discovery via HTTP GET (list active peers in room)
- **Architecture**: Stateless HTTP + Cloudflare KV (no Durable Objects)
- **Privacy**: Never receives, stores, or processes user data

## Data Flow

### First-Time Setup

1. **New user** opens app → Onboarding page
2. **Creates first org** (e.g., "Personal") → Local-only, no sync

### Inviting a Peer

1. **User A** creates a shared org with a password
2. **User A** generates one-time share code (valid 5 min)
3. **User A** calls/texts User B: share code + password
4. **User B** enters share code → Worker matches → WebRTC connects
5. **User B** enters password → Decrypts and syncs data
6. **Future syncs** happen automatically via room ID (no more share codes)

### Ongoing Sync

1. Any peer comes online → Worker helps find other peers via room ID
2. **WebRTC connection** established directly between peers
3. **CRDT sync** happens peer-to-peer, encrypted with org password
4. **Worker sees**: only room IDs and connection metadata
5. **Worker never sees**: passwords, contacts, events, or any user content

## Project Structure

```
p2p-clinic/
├── web/                    # Client application (Cloudflare Pages)
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── stores/         # Local state & CRDT documents
│   │   ├── sync/           # P2P sync logic (Yjs + WebRTC)
│   │   ├── db/             # IndexedDB layer
│   │   └── crypto/         # E2E encryption utilities
│   └── package.json
├── worker/                 # Signaling server (Cloudflare Workers)
│   ├── src/
│   │   ├── index.ts        # Main worker entry
│   │   └── room.ts         # Durable Object for peer presence
│   └── package.json
└── README.md
```

## Multi-Org Architecture

Each user can have multiple **Orgs** (organizations), each with isolated data:

```
Local Storage (IndexedDB)
├── Org: "Personal" (no sync - local only)
│   └── Yjs Doc → contacts, events
├── Org: "Acme Corp" (syncs with peers)
│   └── Yjs Doc → contacts, events
└── Org: "Side Project" (syncs with peers)
    └── Yjs Doc → contacts, events
```

### Org Data Model

```typescript
interface Org {
  id: string;
  name: string;
  color: string;          // Random color for UI identification
  roomId?: string;        // Permanent room ID for P2P sync
  isDefault?: boolean;    // First org created, usually "Personal"
  createdAt: string;
}
```

### First-Run Experience

New users see an onboarding page:

1. **"Create your first org"** → Personal local-only org
2. **"Join an existing org"** → Enter share code + password

### Org Switcher

- Click the colored status dot in the nav bar
- Dropdown shows all orgs with their assigned colors
- Switch instantly between orgs

### Leaving an Org (P2P Sovereignty)

Each peer has **full sovereignty** over their local data. When you "Leave" an org:

1. **Sync stops** - No more WebRTC connections for that room
2. **Local data deleted** - Yjs document removed from IndexedDB
3. **Org metadata deleted** - Removed from your org list
4. **Server unaffected** - Room announcements expire via TTL naturally
5. **Other peers unaffected** - They keep their copies and continue syncing

**Why no "delete for everyone":**

- Goes against P2P philosophy of peer sovereignty
- Would require owner/admin concept and authentication
- Opens abuse vectors (malicious deletion by bad actors)
- Adds significant complexity for minimal benefit
- In P2P, each peer chooses what to keep

## Share Code Design

- **One-time use**: Share codes expire after first use or 5-minute timeout
- **Format**: `XXXX-XXXX` (8 alphanumeric, easy to type)
- **Purpose**: Initial peer discovery ONLY
- **After connection**: Peers remember each other via room ID

### Invite Flow

1. User A generates a one-time share code → Worker stores temporarily
2. User A shares via **call/text** to User B:
   - Share code: `ABCD-1234`
   - Password: `secretphrase`
3. User B enters share code → Worker matches → WebRTC connects
4. User B enters password → Can decrypt the synced data
5. Share code **expires** (one-time use)
6. Future syncs use permanent room ID (no share code needed)

## Security Model

### Bulletin Board Signaling (Low Worker Load)

Instead of persistent WebSocket connections, we use lightweight HTTP polling:

```
┌─────────────────────────────────────────────────────────────────┐
│                    BULLETIN BOARD APPROACH                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Worker = Simple HTTP endpoints + Cloudflare KV (cheap!)        │
│                                                                 │
│  POST /room/:roomId/announce                                    │
│    → "I'm peer X, here's my WebRTC offer, expires in 2 min"     │
│                                                                 │
│  GET /room/:roomId/peers                                        │
│    → Returns list of active peers + their offers                │
│                                                                 │
│  No persistent connections! Stateless! Scales infinitely!       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Invite Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        INVITE FLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. User A creates org with encryption password             │
│  2. User A generates ONE-TIME share code → Worker stores    │
│  3. User A shares via CALL/TEXT to User B:                  │
│     - Share code: "ABCD-1234" (one-time use)                │
│     - Password: "secretphrase" (for encryption)             │
│                                                             │
│  4. User B enters share code → Worker matches → WebRTC      │
│  5. User B enters password → Decrypts synced Yjs data       │
│  6. Share code EXPIRES after use                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### What Each Party Knows

| Info | Worker | Attacker (room ID only) | Authorized Peer |
|------|--------|-------------------------|-----------------|
| Share code | ✅ (temp) | Maybe | ✅ |
| Room ID | ✅ | ✅ | ✅ |
| Org password | ❌ NEVER | ❌ | ✅ |
| Auth challenge | ❌ | ❌ Fails it | ✅ Passes |
| Encrypted data | ❌ | ❌ (never sent) | ✅ |
| Decrypted data | ❌ | ❌ | ✅ |

### Challenge-Response Authentication (Zero-Knowledge)

**Critical**: Before ANY data is exchanged, peers prove they know the password.
This prevents attackers with only the room ID from receiving data to crack offline.

```
┌─────────────────────────────────────────────────────────────────┐
│              MUTUAL AUTHENTICATION HANDSHAKE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Peer A                              Peer B                     │
│    │                                   │                        │
│    │──── WebRTC DataChannel opens ────►│                        │
│    │                                   │                        │
│    │──── challenge: [32 random bytes] ►│                        │
│    │                                   │                        │
│    │◄─── response: HMAC-SHA256(        │                        │
│    │       challenge, authKey)  ───────│                        │
│    │                                   │                        │
│    │  Verify response locally          │                        │
│    │  ✅ Match → Proceed with sync     │                        │
│    │  ❌ Fail  → Disconnect immediately │                       │
│    │            (NO data sent!)        │                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Derivation (Single Password → Multiple Keys)

```typescript
const password = "user's org password";
const salt = orgId; // Unique per org

// For peer authentication (challenge-response)
const authKey = PBKDF2(password, salt + ":auth", 100000, 256);

// For data encryption (Yjs updates)  
const encryptionKey = PBKDF2(password, salt + ":encrypt", 100000, 256);

// Same password → different derived keys → defense in depth
```

### What Attackers Cannot Do

| Scenario | Result |
|----------|--------|
| Attacker has room ID only | Connects → Fails challenge → Gets NOTHING |
| Attacker intercepts share code | Code already expired (one-time use) |
| Attacker brute-forces room IDs | Rate limited by Worker |
| Worker is compromised | Only sees encrypted blobs, can't decrypt |

### Security Properties

- **Zero-knowledge auth**: Peers prove password knowledge without revealing it
- **No data without auth**: Failed challenge = disconnected, nothing sent
- **Share codes**: One-time use, 5-minute TTL, cryptographically random
- **PBKDF2 key derivation**: 100,000 iterations, resistant to brute-force
- **WebRTC encryption**: DTLS-SRTP provides additional transport security
- **Worker sees**: Only room IDs, share codes, and connection metadata
- **Worker never sees**: Passwords, auth keys, encrypted data, or content

### Security Checklist

- [x] Share codes: one-time use, expire after 5 minutes
- [x] Room IDs: random UUIDs (not guessable)
- [x] Challenge-response: HMAC-SHA256, 32-byte random challenges
- [x] Key derivation: PBKDF2 with 100,000 iterations
- [ ] Rate limiting: Worker limits requests per IP
- [ ] Secure signaling: HTTPS only to Worker
- [ ] Password guidance: Recommend 12+ chars in UI

## Technology Choices

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | TypeScript | Type safety, better DX |
| Build | Vite | Fast, modern |
| UI | React | Familiar, best Yjs ecosystem |
| CRDT | Yjs | Mature, great WebRTC support, IndexedDB persistence |
| P2P | y-webrtc | Yjs native WebRTC provider |
| Persistence | y-indexeddb | Yjs native IndexedDB adapter |
| Signaling | Cloudflare Workers + KV | Stateless HTTP, cheap, scales infinitely |
| Encryption | Web Crypto API | PBKDF2 + AES-GCM, browser native |

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
# Install all dependencies
make install

# Or install individually
make install-web
make install-worker
```

### Environment Variables

Create a `.env` file in the project root:

```bash
# Local Development
VITE_WORKER_URL=http://localhost:8787

# Cloudflare (for deployment - also set in GitHub Secrets)
# CLOUDFLARE_API_TOKEN=your_api_token
# CLOUDFLARE_ACCOUNT_ID=your_account_id
# WORKER_URL=https://p2p-clinic-signaling.your-subdomain.workers.dev
```

### Running Locally

```bash
# Run both web and worker servers
make run

# Or run individually
make dev-web      # http://localhost:5173
make dev-worker   # http://localhost:8787
```

### Available Commands

```bash
make help         # Show all available commands

# Code Quality
make lint         # Lint all code
make lint-fix     # Auto-fix lint issues
make type-check   # TypeScript type checking
make test         # Run all checks

# Building
make build        # Build for production
make clean        # Remove node_modules and build artifacts
```

## License

MIT
