const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

function toBase64url(buf: ArrayBuffer) {
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}
function fromBase64url(b64url: string): ArrayBuffer {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64url.length + 3) % 4)
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

async function deriveKey(passcode: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey("raw", textEncoder.encode(passcode), "PBKDF2", false, ["deriveKey"])
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )
}

export type Sealed = {
  v: number
  salt: string // base64url
  iv: string // base64url
  data: string // base64url ciphertext
}

export async function encryptPayload(passcode: string, payload: unknown): Promise<Sealed> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passcode, salt)
  const plaintext = textEncoder.encode(JSON.stringify(payload))
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext)
  return {
    v: 1,
    salt: toBase64url(salt.buffer),
    iv: toBase64url(iv.buffer),
    data: toBase64url(ciphertext),
  }
}

export async function decryptPayload<T = unknown>(passcode: string, sealed: Sealed): Promise<T> {
  const salt = new Uint8Array(fromBase64url(sealed.salt))
  const iv = new Uint8Array(fromBase64url(sealed.iv))
  const key = await deriveKey(passcode, salt)
  const ct = fromBase64url(sealed.data)
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct)
  const json = textDecoder.decode(pt)
  return JSON.parse(json) as T
}

export function sealedToHash(sealed: Sealed): string {
  const params = new URLSearchParams()
  params.set("v", String(sealed.v))
  params.set("salt", sealed.salt)
  params.set("iv", sealed.iv)
  params.set("data", sealed.data)
  return params.toString()
}

export function hashToSealed(hash: string): Sealed | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash
  const qs = new URLSearchParams(raw)
  const v = Number(qs.get("v") || "0")
  const salt = qs.get("salt") || ""
  const iv = qs.get("iv") || ""
  const data = qs.get("data") || ""
  if (!v || !salt || !iv || !data) return null
  return { v, salt, iv, data }
}
