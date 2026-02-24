const DEFAULT_PORT = 18792

function clampPort(value) {
  const n = Number.parseInt(String(value || ''), 10)
  if (!Number.isFinite(n)) return DEFAULT_PORT
  if (n <= 0 || n > 65535) return DEFAULT_PORT
  return n
}

function updateRelayUrl(port) {
  const el = document.getElementById('relay-url')
  if (!el) return
  el.textContent = `http://127.0.0.1:${port}/`
}

function setStatus(kind, message) {
  const status = document.getElementById('status')
  if (!status) return
  status.dataset.kind = kind || ''
  status.textContent = message || ''
}

async function checkRelayReachable(port) {
  const url = `http://127.0.0.1:${port}/`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 900)
  try {
    const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
<<<<<<< HEAD
    setStatus('ok', `Relay reachable at ${url}`)
  } catch {
    setStatus(
      'error',
      `Relay not reachable at ${url}. Start Moltbot’s browser relay on this machine, then click the toolbar button again.`,
    )
  } finally {
    clearTimeout(t)
=======

    // Validate that this is a CDP relay /json/version payload, not gateway HTML.
    const contentType = String(res.contentType || '')
    const data = res.json
    if (!contentType.includes('application/json')) {
      setStatus(
        'error',
        'Wrong port: this is likely the gateway, not the relay. Use gateway port + 3 (for gateway 18789, relay is 18792).',
      )
      return
    }
    if (!data || typeof data !== 'object' || !('Browser' in data) || !('Protocol-Version' in data)) {
      setStatus(
        'error',
        'Wrong port: expected relay /json/version response. Use gateway port + 3 (for gateway 18789, relay is 18792).',
      )
      return
    }

    setStatus('ok', `Relay reachable and authenticated at http://127.0.0.1:${port}/`)
  } catch (err) {
    const message = String(err || '').toLowerCase()
    if (message.includes('json') || message.includes('syntax')) {
      setStatus(
        'error',
        'Wrong port: this is not a relay endpoint. Use gateway port + 3 (for gateway 18789, relay is 18792).',
      )
    } else {
      setStatus(
        'error',
        `Relay not reachable/authenticated at http://127.0.0.1:${port}/. Start OpenClaw browser relay and verify token.`,
      )
    }
>>>>>>> 1237516ae (fix(chrome-extension): finalize relay endpoint validation flow (#22252) (thanks @krizpoon))
  }
}

async function load() {
  const stored = await chrome.storage.local.get(['relayPort'])
  const port = clampPort(stored.relayPort)
  document.getElementById('port').value = String(port)
  updateRelayUrl(port)
  await checkRelayReachable(port)
}

async function save() {
  const input = document.getElementById('port')
  const port = clampPort(input.value)
  await chrome.storage.local.set({ relayPort: port })
  input.value = String(port)
  updateRelayUrl(port)
  await checkRelayReachable(port)
}

document.getElementById('save').addEventListener('click', () => void save())
void load()
