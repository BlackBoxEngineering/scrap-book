const zlib = require('zlib');
const crypto = require('crypto');

const enDeCompression = async (event) => {
    const dataOut = { code: 400, status: "error", message: "failed" };
    const { message, password } = event;
    
    if (!message || !password) {
        dataOut.status = "failed";
        dataOut.message = "Message and password are required";
        return dataOut;
    }
    
    try {
        // DECRYPTION: V2 FORMAT (Argon2 + AES-256-GCM + HMAC)
        if (message.startsWith('V2:')) {
            const data = Buffer.from(message.slice(3), 'base64');
            
            // Extract HMAC (last 32 bytes)
            const hmac = data.slice(-32);
            const payload = data.slice(0, -32);
            
            // Verify version
            if (payload[0] !== 2) {
                throw new Error('Unsupported cipher version');
            }
            
            // Extract salt (bytes 1-33)
            const salt = payload.slice(1, 33);
            
            // Derive keys using Handshake's Argon2-like PBKDF2 implementation
            const masterKey = await argon2Like(password, salt);
            
            const encKey = masterKey.slice(0, 32);
            const hmacKey = await hkdfExpand(masterKey, Buffer.from('HMAC'), 32);
            
            // Verify HMAC
            const expectedHmac = crypto.createHmac('sha256', hmacKey).update(payload).digest();
            if (!constantTimeEqual(hmac, expectedHmac)) {
                throw new Error('Authentication failed - incorrect password');
            }
            
            // Extract ciphertext (after version + salt)
            const ciphertext = payload.slice(33);
            
            // Decrypt using AES-GCM
            const decrypted = await decryptAESGCM(ciphertext, encKey);
            
            dataOut.status = "decrypted";
            dataOut.message = decrypted;
        }
        // DECRYPTION: v1 FORMAT (PBKDF2 + AES-256-GCM) - Legacy support only
        else if (message.startsWith('v1:')) {
            const payload = Buffer.from(message.slice(3), 'base64');
            const salt = payload.slice(0, 16);
            const iv = payload.slice(16, 28);
            const authTag = payload.slice(28, 44);
            const ciphertext = payload.slice(44);
            const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha512');
            const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
            decipher.setAuthTag(authTag);
            let decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
            let decompressedData = zlib.gunzipSync(decrypted);
            dataOut.status = "decrypted";
            dataOut.message = decompressedData.toString();
        }
        // DECRYPTION: Legacy format (SHA256 + AES-256-CBC) - Legacy support only
        else if (isBase64(message)) {
            const key = crypto.createHash('sha256').update(password).digest();
            const encryptedBuffer = Buffer.from(message, 'base64');
            const iv = new Uint8Array(encryptedBuffer).slice(0, 16);
            const encryptedText = new Uint8Array(encryptedBuffer).slice(16);
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
            let decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
            let decompressedData = zlib.gunzipSync(decrypted);
            dataOut.status = "decrypted";
            dataOut.message = decompressedData.toString();
        }
        // ENCRYPTION: ONLY V2 format for all new encryptions
        else {
            const encrypted = await encryptV2(message, password);
            dataOut.status = "encrypted";
            dataOut.message = 'V2:' + encrypted;
        }
        
        dataOut.code = 200;
    } catch (error) {
        dataOut.status = "error";
        dataOut.message = `An error occurred: ${error.message}`;
        console.error(error);
    }
    
    return dataOut;
};

// Helper: Encrypt V2 format
async function encryptV2(message, password) {
    const salt = crypto.randomBytes(32);
    
    // Derive keys using Handshake's Argon2-like PBKDF2 implementation
    const masterKey = await argon2Like(password, salt);
    
    const encKey = masterKey.slice(0, 32);
    const hmacKey = await hkdfExpand(masterKey, Buffer.from('HMAC'), 32);
    
    // Encrypt with AES-GCM
    const ciphertext = await encryptAESGCM(message, encKey);
    
    // Build payload: Version (1) + Salt (32) + Ciphertext
    const payload = Buffer.concat([
        Buffer.from([2]), // Version 2
        salt,
        ciphertext
    ]);
    
    // Compute HMAC
    const hmac = crypto.createHmac('sha256', hmacKey).update(payload).digest();
    
    // Final result: Payload + HMAC
    const result = Buffer.concat([payload, hmac]);
    return result.toString('base64');
}

// Helper: Encrypt AES-GCM
async function encryptAESGCM(plaintext, key) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    // Format: IV (12) + encrypted data + auth tag (16)
    return Buffer.concat([iv, encrypted, authTag]);
}

// Helper: Decrypt AES-GCM
async function decryptAESGCM(ciphertext, key) {
    // Ciphertext format: IV (12 bytes) + encrypted data + auth tag (16 bytes)
    const iv = ciphertext.slice(0, 12);
    const authTag = ciphertext.slice(-16);
    const encrypted = ciphertext.slice(12, -16);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
    ]);
    
    return decrypted.toString('utf8');
}

// Helper: HKDF Expand
async function hkdfExpand(key, info, length) {
    return new Promise((resolve, reject) => {
        crypto.hkdf('sha256', key, Buffer.alloc(32), info, length, (err, derivedKey) => {
            if (err) reject(err);
            else resolve(Buffer.from(derivedKey));
        });
    });
}

// Helper: Constant time comparison
function constantTimeEqual(a, b) {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a[i] ^ b[i];
    }
    return result === 0;
}

// Helper: Handshake's Argon2-like implementation (PBKDF2-based)
async function argon2Like(password, salt) {
    // First round: 50000 iterations
    let key = await pbkdf2Async(password, salt, 50000, 32);
    
    // 3 additional rounds with extended salt
    for (let i = 0; i < 3; i++) {
        const newSalt = Buffer.concat([salt, key.slice(0, 16)]);
        key = await pbkdf2Async(password, newSalt, 25000, 32);
    }
    
    // Return 32-byte master key (not 64)
    return key;
}

// Helper: Promisified PBKDF2
function pbkdf2Async(password, salt, iterations, keylen) {
    return new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, iterations, keylen, 'sha256', (err, derivedKey) => {
            if (err) reject(err);
            else resolve(derivedKey);
        });
    });
}

// Helper: Check if string is base64
function isBase64(str) {
    return (str.length % 4 === 0) && /^[A-Za-z0-9+/]+={0,2}$/.test(str);
}

module.exports = { enDeCompression };
