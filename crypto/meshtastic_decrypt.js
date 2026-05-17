#!/usr/bin/env node
/**
 * Meshtastic default-PSK decryption attempt.
 * Tries both well-known default PSKs against captured BN MTRX hex frames.
 *
 * Meshtastic packet layout (what we capture off-air):
 *   bytes 0-3:   to node ID (LE uint32)
 *   bytes 4-7:   from node ID (LE uint32)
 *   bytes 8-11:  packet ID (LE uint32)
 *   byte  12:    flags
 *   byte  13:    channel hash
 *   bytes 14-15: reserved
 *   bytes 16+:   encrypted Data protobuf
 *
 * Nonce (16 bytes):
 *   bytes 0-3:   packet ID (LE uint32)
 *   bytes 4-7:   0x00 * 4
 *   bytes 8-11:  from node ID (LE uint32)
 *   bytes 12-15: 0x00 * 4
 *
 * Cipher: AES-256-CTR
 *
 * Paste full hex strings (click hex cell in sniffer to copy) into FRAMES below.
 */

'use strict';
const crypto = require('crypto');

const DEFAULT_PSKS = [
  { name: 'LongFast default', b64: '1PG7OiApB1nwvP+rz05pAQ==' },
  { name: 'Legacy default',   b64: 'AQ==' },
];

// ---- Paste full hex frames here -------------------------------------------
const FRAMES = [
  { label: '18:53:17 0x04C6723C 103B', hex: 'FFFFFFFF3C72C604A68E8B6E6308003C53BFFA7BAE921FBF542712DB608EE9B38ED5444A80C74DE250AA984CF5F4C3F664E59612F496016660C42BB549B7D9DDD03BB7FF7C0318F284F3345995D80FCAFBCD1201C0B86EB8512CCA29CFDBA445887BD26A79D6FC' },
];
// ---------------------------------------------------------------------------

function expandKey(b64) {
  const raw = Buffer.from(b64, 'base64');
  if (raw.length === 32) return raw;
  const key = Buffer.alloc(32, 0);
  raw.copy(key);
  return key;
}

function buildNonce(packetId, fromId) {
  const nonce = Buffer.alloc(16, 0);
  nonce.writeUInt32LE(packetId, 0);
  nonce.writeUInt32LE(fromId, 8);
  return nonce;
}

function tryDecrypt(ciphertext, key, nonce) {
  try {
    const decipher = crypto.createDecipheriv('aes-256-ctr', key, nonce);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    return null;
  }
}

function looksLikeProtobuf(buf) {
  if (buf.length < 2) return false;
  const wireType = buf[0] & 0x07;
  const fieldNum = buf[0] >> 3;
  return fieldNum >= 1 && fieldNum <= 15 && [0, 1, 2, 5].includes(wireType);
}

function printableAsciiRatio(buf) {
  let count = 0;
  for (const b of buf) if (b >= 0x20 && b < 0x7f) count++;
  return count / buf.length;
}

function parseProtobufFields(buf) {
  const fields = [];
  let i = 0;
  try {
    while (i < buf.length) {
      const tag = buf[i++];
      const wireType = tag & 0x07;
      const fieldNum = tag >> 3;
      if (fieldNum === 0) break;

      if (wireType === 0) {
        let val = 0, shift = 0;
        while (i < buf.length) {
          const b = buf[i++];
          val |= (b & 0x7f) << shift;
          shift += 7;
          if (!(b & 0x80)) break;
        }
        fields.push({ field: fieldNum, type: 'varint', value: val });
      } else if (wireType === 2) {
        let len = 0, shift = 0;
        while (i < buf.length) {
          const b = buf[i++];
          len |= (b & 0x7f) << shift;
          shift += 7;
          if (!(b & 0x80)) break;
        }
        if (i + len > buf.length) break;
        const bytes = buf.slice(i, i + len);
        i += len;
        let strVal = null;
        try {
          const s = bytes.toString('utf8');
          if (s.length > 0 && [...s].every(c => c.charCodeAt(0) >= 0x20 || '\n\r\t'.includes(c))) strVal = s;
        } catch {}
        fields.push({
          field: fieldNum,
          type: 'bytes',
          length: len,
          string: strVal,
          hex: bytes.toString('hex').toUpperCase(),
        });
      } else if (wireType === 1) {
        fields.push({ field: fieldNum, type: 'fixed64', hex: buf.slice(i, i + 8).toString('hex').toUpperCase() });
        i += 8;
      } else if (wireType === 5) {
        fields.push({ field: fieldNum, type: 'fixed32', hex: buf.slice(i, i + 4).toString('hex').toUpperCase() });
        i += 4;
      } else {
        break;
      }
    }
  } catch {}
  return fields;
}

console.log('Meshtastic default PSK decryption attempt\n');

for (const frame of FRAMES) {
  const raw = Buffer.from(frame.hex.replace(/\s/g, ''), 'hex');
  if (raw.length < 17) {
    console.log(`[${frame.label}] frame too short (${raw.length}B), skipping\n`);
    continue;
  }

  const fromId   = raw.readUInt32LE(4);
  const packetId = raw.readUInt32LE(8);
  const ciphertext = raw.slice(16);

  console.log(`[${frame.label}]`);
  console.log(`  from=0x${fromId.toString(16).toUpperCase().padStart(8, '0')} packetId=0x${packetId.toString(16).toUpperCase().padStart(8, '0')} payload=${ciphertext.length}B`);

  for (const psk of DEFAULT_PSKS) {
    const key   = expandKey(psk.b64);
    const nonce = buildNonce(packetId, fromId);
    const plain = tryDecrypt(ciphertext, key, nonce);
    if (!plain) { console.log(`  [${psk.name}] decrypt error`); continue; }

    const isProto    = looksLikeProtobuf(plain);
    const asciiRatio = printableAsciiRatio(plain);
    const fullHex    = plain.toString('hex').toUpperCase();

    console.log(`  [${psk.name}] proto=${isProto} ascii=${(asciiRatio * 100).toFixed(0)}%`);
    console.log(`    full hex: ${fullHex}`);

    if (isProto) {
      console.log(`  *** POSSIBLE MATCH ***`);
      const fields = parseProtobufFields(plain);
      for (const f of fields) {
        if (f.string) {
          console.log(`    field ${f.field} (bytes/${f.length}B): "${f.string}"`);
        } else if (f.type === 'varint') {
          console.log(`    field ${f.field} (varint): ${f.value}`);
        } else {
          console.log(`    field ${f.field} (${f.type}): ${f.hex}`);
        }
      }
    }
  }
  console.log();
}
