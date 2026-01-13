# P2P Clinic - TODO & Roadmap

## 🎯 Current Status: Core Infrastructure Complete

All 7 foundational features are implemented:

- ✅ Multi-org architecture with per-org Yjs documents
- ✅ Onboarding flow for new users
- ✅ Org switcher with colored dots
- ✅ Crypto utilities (PBKDF2, AES-GCM, HMAC)
- ✅ Worker bulletin board (HTTP + KV)
- ✅ P2P sync infrastructure (WebRTC + challenge-response)

---

## 📋 Remaining Tasks

### High Priority - Wire It All Together

- [ ] **Create Cloudflare KV namespace**

  ```bash
  wrangler kv:namespace create "KV"
  # Update wrangler.toml with returned IDs
  ```

- [x] **Add P2P settings UI** in SettingsPage ✅
  - Enable/disable P2P for current org
  - Set org password (with strength indicator)
  - Generate share code button
  - Show connection status & peer count
  - Display room ID (for debugging)

- [x] **Wire SyncManager to OrgProvider** ✅
  - Auto-start sync when org has roomId + password
  - Show sync status in nav bar (colored dot)
  - Handle reconnection gracefully

- [x] **Store org password securely** ✅
  - Hash with PBKDF2 for local verification
  - Never store plaintext
  - Prompt on app open if password needed

### Medium Priority - Polish

- [x] **Join org flow** ✅
  - Enter share code in onboarding
  - Prompt for password
  - Create local org linked to room ID
  - Start syncing (auto-prompt in Settings)

- [x] **Sync status indicator** ✅
  - Offline (gray dot)
  - Connecting (yellow, pulsing)
  - Synced (green)
  - Error (red)

- [~] **Conflict resolution UI** (Yjs handles automatically)
  - Yjs CRDTs auto-merge without conflicts
  - No manual review needed for most cases

- [x] **Invite flow from Settings** ✅
  - "Invite Someone" button
  - Generate share code
  - Show QR code option (TODO: add QR)
  - Copy to clipboard

### Lower Priority - Nice to Have

- [x] **Browser notifications for reminders** ✅
  - Request permission
  - Schedule notifications for calendar events
  - Auto-schedule reminders for upcoming events

- [x] **Dark/light theme toggle** ✅
  - Light, Dark, and System options
  - Persisted to localStorage
  - Respects system preference changes

- [x] **Data export improvements** ✅
  - Export contacts to vCard (.vcf)
  - Export calendar to iCalendar (.ics)
  - Import from backup JSON

- [x] **Search across contacts and events** ✅
  - Global search in nav bar (⌘K shortcut)
  - Quick jump to results
  - Searches contacts and calendar events

- [x] **Mobile responsive design** ✅
  - Responsive nav bar and layouts
  - Touch-friendly interactions
  - Collapsible sidebars on mobile

- [x] **Offline indicator** ✅
  - Yellow banner when network unavailable
  - Changes saved locally and sync when reconnected

- [x] **Leave/Delete organization** ✅
  - "Leave Org" for shared orgs, "Delete Org" for local
  - Stops sync, deletes all local data (Yjs + metadata)
  - Other peers keep their copies (P2P philosophy)
  - Server cleanup via TTL expiration (no explicit delete needed)
  - Redirects to another org or shows onboarding

---

## 🔐 P2P Philosophy & Data Ownership

**Peer Sovereignty**: Each peer owns their data completely.

- **No master/owner**: Any peer can leave without affecting others
- **No forced deletion**: One peer cannot delete data from another's device
- **Local-first**: All operations work offline; sync is opportunistic

**What happens when you "Leave" a shared org:**

1. Local sync is stopped
2. Local Yjs IndexedDB is deleted
3. Local org metadata is deleted
4. You're redirected to another org (or onboarding)
5. Server room announcements expire naturally via TTL
6. Other peers continue syncing among themselves

**Why no "delete for everyone":**

- Would require authentication/authorization system
- Would need owner concept (who can delete?)
- Opens abuse vectors (malicious deletion)
- Goes against P2P sovereignty principles
- Would significantly complicate the architecture

---

## 🚀 Phase 2 - Future Enhancements

### Quick Wins

- [ ] **Keyboard shortcuts modal**
  - Press `?` to show all available shortcuts
  - Include search (⌘K), navigation, etc.

- [ ] **Undo/Redo support**
  - Yjs has native `Y.UndoManager`
  - Add undo button or ⌘Z shortcut

- [ ] **PWA support**
  - Add `manifest.json` for "Install App" prompt
  - Service worker for better offline caching

### Nice to Have

- [ ] **Recurring events**
  - Weekly, monthly, yearly repeats
  - "Repeat until" or "repeat X times"

- [ ] **Contact birthday field**
  - Add birthday to contact form
  - Auto-create calendar reminders

- [ ] **Calendar week/day views**
  - Currently only month view
  - Toggle between views

- [ ] **Contact groups/tags**
  - Organize contacts into categories
  - Filter by group

- [ ] **Activity log**
  - Show recent sync changes
  - Helpful for P2P debugging

### Power User Features

- [ ] **Quick add from search**
  - Type in search, press Enter to create
  - Smart parsing: "John Doe <john@email.com>"

- [ ] **Import wizard**
  - Import from Google Contacts CSV
  - Import from Outlook vCard
  - Field mapping UI

- [ ] **Print-friendly views**
  - Print contact list
  - Print calendar (week/month)

- [ ] **Event attachments**
  - Attach files to events
  - Store in IndexedDB

- [ ] **Contact photos**
  - Upload profile pictures
  - Store as base64 or blob

---

## 🧪 Testing Checklist

- [ ] Create org, verify persists after refresh
- [ ] Add contacts, switch orgs, verify isolation
- [ ] Export/import backup
- [ ] Generate share code, join from second browser
- [ ] Verify challenge-response rejects wrong password
- [ ] Sync contacts between two peers
- [ ] Disconnect peer, verify graceful handling
- [ ] Rate limiting on worker (100 requests/min)

---

## 🚀 Deployment Setup Guide

This guide walks you through setting up Cloudflare Workers from scratch, including local development and GitHub Actions deployment.

### Prerequisites

- Node.js 18+ installed
- A Cloudflare account (free tier works fine)
- A GitHub repository for this project

---

### Step 1: Install Dependencies

Wrangler (Cloudflare's CLI) is already in the worker's `devDependencies`. Install it:

```bash
# From project root
make install-worker
# OR manually:
cd worker && npm install
```

This installs wrangler locally. You'll run it via `npx wrangler` or `npm run dev`/`npm run deploy`.

---

### Step 2: Get Your Cloudflare Account ID

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Sign in or create an account
3. On the main dashboard, look at the right sidebar → **Account ID**
4. Copy this ID - you'll need it for both local dev and GitHub

**Save it somewhere safe:**

```
Account ID: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### Step 3: Create a Cloudflare API Token

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Use the **"Edit Cloudflare Workers"** template (recommended), OR create a custom token with:
   - **Account** → **Workers KV Storage** → **Edit**
   - **Account** → **Workers Scripts** → **Edit**
   - **Zone** → **Workers Routes** → **Edit** (if using custom domains)
4. Click **Continue to Summary** → **Create Token**
5. **COPY THE TOKEN NOW** - you won't see it again!

**Save it somewhere safe:**

```
API Token: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### Step 4: Login Wrangler to Cloudflare

You have two options:

**Option A: Interactive Login (easiest for local dev)**

```bash
cd worker
npx wrangler login
```

This opens a browser window. Authorize the CLI and you're done. Credentials are stored in `~/.wrangler/config/default.toml`.

**Option B: Environment Variables (for CI/CD and local)**

Create a `.env` file in the project root (already gitignored):

```bash
# .env (in project root - DO NOT COMMIT)
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
```

Wrangler automatically reads these. Verify it works:

```bash
cd worker
npx wrangler whoami
```

You should see your email and account info.

---

### Step 5: Create KV Namespace

KV (Key-Value) storage is used for share codes and peer announcements.

**Create the production namespace:**

```bash
cd worker
npx wrangler kv:namespace create "KV"
```

Output will look like:

```
🌀 Creating namespace with title "p2p-clinic-signaling-KV"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
[[kv_namespaces]]
binding = "KV"
id = "abc123def456..."
```

**Create the preview namespace (for local dev):**

```bash
npx wrangler kv:namespace create "KV" --preview
```

Output:

```
[[kv_namespaces]]
binding = "KV"
preview_id = "xyz789..."
```

---

### Step 6: Update wrangler.toml

Open `worker/wrangler.toml` and update the KV IDs with your actual values:

```toml
name = "p2p-clinic-signaling"
main = "src/index.ts"
compatibility_date = "2024-11-01"

# Update these with your ACTUAL IDs from Step 5:
[[kv_namespaces]]
binding = "KV"
id = "YOUR_PRODUCTION_KV_ID"        # ← from first command
preview_id = "YOUR_PREVIEW_KV_ID"   # ← from second command (--preview)

# Durable Objects for WebSocket signaling
[[durable_objects.bindings]]
name = "ROOM"
class_name = "Room"

[[migrations]]
tag = "v1"
new_classes = ["Room"]
```

---

### Step 7: Test Local Development

Start the worker locally:

```bash
cd worker
npm run dev
# OR from project root:
make dev-worker
```

You should see:

```
⎔ Starting local server...
Ready on http://localhost:8787
```

Test it:

```bash
curl http://localhost:8787/health
```

Should return a response (or 404 if no /health route - that's ok, it means wrangler is running).

---

### Step 8: Deploy to Cloudflare (Manual)

Once everything is configured:

```bash
cd worker
npm run deploy
# OR:
npx wrangler deploy
```

On success, you'll get a URL like:

```
Published p2p-clinic-signaling (1.23 sec)
  https://p2p-clinic-signaling.YOUR_SUBDOMAIN.workers.dev
```

**Save this URL** - you'll need it for the web app's `VITE_WORKER_URL`.

---

### Step 9: Configure GitHub Secrets (for CI/CD)

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** and add:

| Secret Name | Value |
|-------------|-------|
| `CLOUDFLARE_API_TOKEN` | Your API token from Step 3 |
| `CLOUDFLARE_ACCOUNT_ID` | Your Account ID from Step 2 |

---

### Step 10: Create GitHub Actions Workflow (Optional)

If you want automatic deployments on push, create `.github/workflows/deploy-worker.yml`:

```yaml
name: Deploy Worker

on:
  push:
    branches: [main]
    paths:
      - 'worker/**'
      - '.github/workflows/deploy-worker.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: worker/package-lock.json
      
      - name: Install dependencies
        run: npm ci
        working-directory: worker
      
      - name: Deploy to Cloudflare Workers
        run: npx wrangler deploy
        working-directory: worker
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

---

### Step 11: Update Web App for Production

Once your worker is deployed, update the web app to use the production URL.

Create `web/.env.production`:

```bash
VITE_WORKER_URL=https://p2p-clinic-signaling.YOUR_SUBDOMAIN.workers.dev
```

For local development, create `web/.env.local`:

```bash
VITE_WORKER_URL=http://localhost:8787
```

---

### Quick Reference Commands

All common Wrangler operations are available via `make`. Run `make help` to see all commands.

```bash
# Login to Cloudflare (opens browser)
make cf-login

# Check current auth status
make cf-whoami

# Create KV namespaces (one-time setup)
make cf-kv-create

# List existing KV namespaces
make cf-kv-list

# Local development
make dev-worker

# Deploy to Cloudflare
make cf-deploy

# Stream live logs from deployed worker
make cf-tail

# Run both web + worker together
make run
```

---

### Troubleshooting

**"Authentication error"**

- Run `npx wrangler login` again
- Or check your `CLOUDFLARE_API_TOKEN` env var

**"KV namespace not found"**

- Make sure you updated `wrangler.toml` with the correct IDs
- IDs from `kv:namespace create` must match exactly

**"Account ID required"**

- Set `CLOUDFLARE_ACCOUNT_ID` environment variable
- Or add `account_id = "..."` to `wrangler.toml` (not recommended - use env vars)

**Local dev not connecting to KV**

- The preview namespace is used for `wrangler dev`
- Production namespace is used for `wrangler deploy`
- Make sure both IDs are set in `wrangler.toml`

---

### Deployment Checklist

- [ ] Create Cloudflare account
- [ ] Get Account ID from dashboard
- [ ] Create API Token with Workers permissions
- [ ] Run `npx wrangler login` OR set env vars
- [ ] Create KV namespace: `npx wrangler kv:namespace create "KV"`
- [ ] Create preview KV: `npx wrangler kv:namespace create "KV" --preview`
- [ ] Update `worker/wrangler.toml` with KV IDs
- [ ] Test locally: `make dev-worker`
- [ ] Deploy: `cd worker && npm run deploy`
- [ ] Set GitHub secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- [ ] Create GitHub Actions workflow (optional)
- [ ] Update `VITE_WORKER_URL` in web app
- [ ] Test full flow in production

---

## 💭 Naming Ideas

**Current: P2P Clinic**

- Pros: Memorable, quirky, implies "treatment" with care
- Cons: Could confuse - is it software or an actual clinic?

**Alternatives to consider:**

| Name | Vibe | Notes |
|------|------|-------|
| **SyncCircle** | Friendly, clear | Sync + community |
| **PeerVault** | Secure, techy | Emphasizes privacy |
| **Huddle** | Warm, casual | Like a team huddle |
| **LocalFirst** | Descriptive | Says what it does |
| **Meshbook** | Techy | Mesh network + address book |
| **Nexus** | Professional | Connection point |
| **Cohort** | Team-focused | Group working together |
| **Campfire** | Cozy | Gathering place |
| **Grove** | Natural | Organic growth |
| **Haven** | Safe | Emphasizes privacy |
| **Relay** | Technical | Passing between peers |
| **Lattice** | Elegant | Network structure |
| **Koinonia** | Unique | Greek for fellowship |

**My favorites:**

1. **P2P Clinic** - Growing on me too! It's unique.
2. **Huddle** - Simple, friendly, implies collaboration
3. **PeerVault** - Clear about privacy + P2P

---

## 🏗️ Architecture Notes

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Org 1     │  │   Org 2     │  │   Org 3     │         │
│  │  Yjs Doc    │  │  Yjs Doc    │  │  Yjs Doc    │         │
│  │  IndexedDB  │  │  IndexedDB  │  │  IndexedDB  │         │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘         │
│         │                │              (local only)        │
│         │ WebRTC         │ WebRTC                           │
│         ▼                ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              SyncManager (per org)                   │   │
│  │  - Challenge-response auth                          │   │
│  │  - PBKDF2 key derivation                            │   │
│  │  - AES-GCM encryption (TODO: encrypt updates)       │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │ Signaling
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                WORKER (Cloudflare)                          │
├─────────────────────────────────────────────────────────────┤
│  POST /invite        → Create one-time share code           │
│  POST /join/:code    → Redeem code, get room ID             │
│  POST /room/:id/announce → Announce presence                │
│  GET  /room/:id/peers    → Get active peers                 │
│  WS   /room/:id/signal   → ICE/SDP exchange                 │
├─────────────────────────────────────────────────────────────┤
│  KV Store: share codes (5 min TTL), presence (2 min TTL)    │
│  Rate limiting: 100 req/min per IP                          │
│  NEVER sees: passwords, decrypted data, user content        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Session Notes

**2026-01-10 Session (latest):**

- Added QR codes for share codes (react-qr-code)
- Browser notifications for calendar reminders
- Dark/light/system theme toggle
- Join org flow with name prompt
- Global search (⌘K) across contacts and events
- Mobile responsive design
- Offline indicator banner

**New files created:**

- `web/src/hooks/useNotifications.ts` - Schedule browser reminders
- `web/src/hooks/useTheme.ts` - Theme management with useSyncExternalStore
- `web/src/hooks/useOnlineStatus.ts` - Track online/offline status
- `web/src/utils/notifications.ts` - Notification utilities
- `web/src/components/layout/GlobalSearch.tsx` - Search UI
- `web/src/components/layout/OfflineIndicator.tsx` - Offline banner
- Settings page now has: Notifications, Appearance, QR codes

**Added Phase 2 roadmap with:**

- Quick wins (keyboard shortcuts, undo/redo, PWA)
- Nice to have (recurring events, birthdays, calendar views)
- Power user (import wizard, print views, attachments)

**2026-01-10 Session (earlier):**

- Added P2P settings UI to SettingsPage
- Wired SyncManager to OrgProvider with full lifecycle
- Added password strength indicator
- Added sync status indicator in OrgSwitcher (colored dot)
- Secure password storage with PBKDF2 hashing
- Generate share code + copy to clipboard

**Files modified:**

- `web/src/types/index.ts` - Added passwordHash to Org
- `web/src/store/OrgContext.tsx` - Full sync management
- `web/src/store/OrgContextTypes.ts` - Added SyncState type
- `web/src/pages/SettingsPage.tsx` - P2P settings UI
- `web/src/pages/pages.css` - P2P settings styles
- `web/src/components/layout/OrgSwitcher.tsx` - Sync indicator
- `web/src/components/layout/layout.css` - Indicator styles
- `web/src/hooks/useOrgs.ts` - Added updateCurrentOrg
- `web/src/App.tsx` - Pass onOrgUpdate to OrgProvider

**2026-01-10 Session (earlier):**

- Started from scratch with multi-org architecture
- Implemented all 7 core features
- Tests passing (type-check + lint)
- App running on <http://localhost:5174>

**Key decisions made:**

- Bulletin board (HTTP polling) over persistent WebSockets
- One-time share codes (5 min TTL)
- Challenge-response before any data exchange
- PBKDF2 with 100,000 iterations
- Separate Yjs doc per org

**Original files created:**

- `web/src/types/index.ts` - Added Org interface
- `web/src/store/orgs.ts` - Org IndexedDB store
- `web/src/store/OrgContext.tsx` - Org provider
- `web/src/store/useOrgStore.ts` - Context hooks
- `web/src/hooks/useOrgs.ts` - Org management hook
- `web/src/pages/OnboardingPage.tsx` - First-run flow
- `web/src/components/layout/OrgSwitcher.tsx` - Nav dropdown
- `web/src/crypto/index.ts` - All crypto utilities
- `web/src/sync/SignalingClient.ts` - Worker client
- `web/src/sync/SyncManager.ts` - P2P orchestration
- `worker/src/index.ts` - Full bulletin board + signaling

---

Have a safe flight! ✈️
