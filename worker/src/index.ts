/**
 * P2P Clinic Signaling Server (Bulletin Board Style)
 *
 * This worker handles:
 * 1. Share code creation and redemption
 * 2. Peer presence announcements (HTTP polling)
 * 3. Optional WebSocket signaling for ICE exchange
 *
 * It NEVER receives, stores, or processes user data.
 *
 * Endpoints:
 * - POST /invite         Create a one-time share code
 * - POST /join/:code     Redeem a share code (returns room ID)
 * - POST /room/:id/announce   Announce presence
 * - GET  /room/:id/peers      Get active peers
 * - WS   /room/:id/signal     WebSocket for ICE/SDP exchange
 */

export interface Env {
  KV: KVNamespace
  ROOM: DurableObjectNamespace
}

// TTLs in seconds
const SHARE_CODE_TTL = 300 // 5 minutes
const PEER_TTL = 120 // 2 minutes

// Rate limiting
const MAX_REQUESTS_PER_IP = 100
const RATE_LIMIT_WINDOW = 60 // 1 minute

interface ShareCodeData {
  roomId: string
  createdAt: number
  createdBy: string // IP address for auditing
}

interface PeerAnnouncement {
  peerId: string
  sdpOffer?: string
  iceCandidates?: string[]
  lastSeen: number
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCors()
    }

    // Rate limiting
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown'
    const rateLimited = await checkRateLimit(env.KV, clientIP)
    if (rateLimited) {
      return json({ error: 'Rate limited' }, 429)
    }

    try {
      // Health check
      if (url.pathname === '/health') {
        return json({ status: 'ok' })
      }

      // POST /invite - Create a one-time share code
      if (url.pathname === '/invite' && request.method === 'POST') {
        return handleCreateInvite(request, env)
      }

      // POST /join/:code - Redeem a share code
      const joinMatch = url.pathname.match(/^\/join\/([A-Z0-9-]+)$/i)
      if (joinMatch && request.method === 'POST') {
        return handleJoinInvite(joinMatch[1].toUpperCase(), env)
      }

      // POST /room/:roomId/announce - Announce presence
      const announceMatch = url.pathname.match(
        /^\/room\/([a-f0-9-]+)\/announce$/i
      )
      if (announceMatch && request.method === 'POST') {
        return handleAnnounce(announceMatch[1], request, env)
      }

      // GET /room/:roomId/peers - Get active peers
      const peersMatch = url.pathname.match(/^\/room\/([a-f0-9-]+)\/peers$/i)
      if (peersMatch && request.method === 'GET') {
        return handleGetPeers(peersMatch[1], env)
      }

      // WebSocket /room/:roomId/signal - WebSocket signaling
      const signalMatch = url.pathname.match(/^\/room\/([a-f0-9-]+)\/signal$/i)
      if (signalMatch) {
        const roomId = signalMatch[1]
        const doId = env.ROOM.idFromName(roomId)
        const room = env.ROOM.get(doId)
        return room.fetch(request)
      }

      return json({ error: 'Not found' }, 404)
    } catch (error) {
      console.error('Worker error:', error)
      return json({ error: 'Internal server error' }, 500)
    }
  },
}

/**
 * Create a one-time share code
 */
async function handleCreateInvite(
  request: Request,
  env: Env
): Promise<Response> {
  const body = (await request.json()) as { roomId: string }

  if (!body.roomId || !isValidUUID(body.roomId)) {
    return json({ error: 'Invalid room ID' }, 400)
  }

  // Generate a share code
  const code = generateShareCode()
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown'

  const data: ShareCodeData = {
    roomId: body.roomId,
    createdAt: Date.now(),
    createdBy: clientIP,
  }

  // Store with TTL
  await env.KV.put(`invite:${code}`, JSON.stringify(data), {
    expirationTtl: SHARE_CODE_TTL,
  })

  return json({
    code,
    expiresIn: SHARE_CODE_TTL,
  })
}

/**
 * Redeem a share code
 */
async function handleJoinInvite(code: string, env: Env): Promise<Response> {
  const data = await env.KV.get(`invite:${code}`)

  if (!data) {
    return json({ error: 'Invalid or expired share code' }, 404)
  }

  const invite = JSON.parse(data) as ShareCodeData

  // Delete the code (one-time use)
  await env.KV.delete(`invite:${code}`)

  return json({
    roomId: invite.roomId,
    message: 'Share code redeemed successfully',
  })
}

/**
 * Announce peer presence
 */
async function handleAnnounce(
  roomId: string,
  request: Request,
  env: Env
): Promise<Response> {
  if (!isValidUUID(roomId)) {
    return json({ error: 'Invalid room ID' }, 400)
  }

  const body = (await request.json()) as {
    peerId: string
    sdpOffer?: string
    iceCandidates?: string[]
  }

  if (!body.peerId) {
    return json({ error: 'Missing peer ID' }, 400)
  }

  const announcement: PeerAnnouncement = {
    peerId: body.peerId,
    sdpOffer: body.sdpOffer,
    iceCandidates: body.iceCandidates,
    lastSeen: Date.now(),
  }

  // Store peer announcement with TTL
  await env.KV.put(
    `room:${roomId}:peer:${body.peerId}`,
    JSON.stringify(announcement),
    { expirationTtl: PEER_TTL }
  )

  return json({
    success: true,
    expiresIn: PEER_TTL,
  })
}

/**
 * Get active peers in a room
 */
async function handleGetPeers(roomId: string, env: Env): Promise<Response> {
  if (!isValidUUID(roomId)) {
    return json({ error: 'Invalid room ID' }, 400)
  }

  // List all peers in this room
  const prefix = `room:${roomId}:peer:`
  const list = await env.KV.list({ prefix })

  const peers: PeerAnnouncement[] = []
  const now = Date.now()

  for (const key of list.keys) {
    const data = await env.KV.get(key.name)
    if (data) {
      const peer = JSON.parse(data) as PeerAnnouncement
      // Only include peers seen in the last 2 minutes
      if (now - peer.lastSeen < PEER_TTL * 1000) {
        peers.push(peer)
      }
    }
  }

  return json({
    roomId,
    peers,
    count: peers.length,
  })
}

/**
 * Check rate limit for an IP
 */
async function checkRateLimit(kv: KVNamespace, ip: string): Promise<boolean> {
  const key = `ratelimit:${ip}`
  const current = await kv.get(key)
  const count = current ? parseInt(current, 10) : 0

  if (count >= MAX_REQUESTS_PER_IP) {
    return true
  }

  await kv.put(key, String(count + 1), {
    expirationTtl: RATE_LIMIT_WINDOW,
  })

  return false
}

/**
 * Generate a share code
 */
function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No I, O, 0, 1
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length]
    if (i === 3) code += '-'
  }
  return code
}

/**
 * Validate UUID format
 */
function isValidUUID(str: string): boolean {
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
    str
  )
}

// Durable Object for WebSocket signaling (optional)
export class Room {
  private sessions: Map<string, WebSocket> = new Map()
  private state: DurableObjectState

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade')
    if (upgradeHeader !== 'websocket') {
      return json({ error: 'Expected WebSocket' }, 426)
    }

    const pair = new WebSocketPair()
    const [client, server] = [pair[0], pair[1]]

    const peerId = crypto.randomUUID()

    this.state.acceptWebSocket(server)
    this.sessions.set(peerId, server)

    // Notify this peer of existing peers
    const existingPeers = Array.from(this.sessions.keys()).filter(
      (id) => id !== peerId
    )
    server.send(
      JSON.stringify({
        type: 'peers',
        peers: existingPeers,
        you: peerId,
      })
    )

    // Notify existing peers of new peer
    this.broadcast(
      {
        type: 'peer-joined',
        peerId,
      },
      peerId
    )

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const data = JSON.parse(message as string)

      if (data.to && this.sessions.has(data.to)) {
        const fromId = this.getPeerId(ws)
        const targetWs = this.sessions.get(data.to)

        if (targetWs && fromId) {
          targetWs.send(
            JSON.stringify({
              ...data,
              from: fromId,
            })
          )
        }
      }
    } catch {
      // Ignore malformed messages
    }
  }

  async webSocketClose(ws: WebSocket) {
    const peerId = this.getPeerId(ws)
    if (peerId) {
      this.sessions.delete(peerId)
      this.broadcast({
        type: 'peer-left',
        peerId,
      })
    }
  }

  async webSocketError(ws: WebSocket) {
    await this.webSocketClose(ws)
  }

  private getPeerId(ws: WebSocket): string | undefined {
    for (const [id, socket] of this.sessions) {
      if (socket === ws) return id
    }
    return undefined
  }

  private broadcast(message: object, excludePeerId?: string) {
    const data = JSON.stringify(message)
    for (const [id, ws] of this.sessions) {
      if (id !== excludePeerId) {
        try {
          ws.send(data)
        } catch {
          // Socket closed
        }
      }
    }
  }
}

function json(data: object, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

function handleCors(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Upgrade',
      'Access-Control-Max-Age': '86400',
    },
  })
}
