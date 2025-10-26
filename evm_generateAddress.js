import { pbkdf2, createHmac } from "crypto";
import { keccak_256 } from "@noble/hashes/sha3";
import * as secp from "@noble/secp256k1";

async function evm_generatePrivateKeys() {

    // Wordlist, there is a standard list of 2048 words:
    // https://github.com/bitcoin/bips/blob/master/bip-0039/english.txt
    // Select 12 words from the BIP39 wordlist (link above) to form a mnemonic

    // You don't need to use the standard wordlist to generate a seed
    // Though it recommended to use 12 words that start with different letters
    // Prefeably the first 4 letters of each word should be different.
    // However it is not strictly necessary to use the standard wordlist.
    const mnemonicPhrase = "one two three four five six seven eight nine ten eleven twelve";
    
    // The 25th word is used as a salt in PBKDF2
    // You can choose any word you like as the 25th word
    // The benefit is an extra security layer, one word you can keep in your head.
    // without the 25th word, the salt is just "mnemonic" the address returned
    // const twentyfifth = ""; -> 0x27ea1eaf09453181d946b1171adde62c0c31ca0e
    // with the 25th word, the salt is "mnemonic{word}" the address returns
    // const twentyfifth = "one"; -> 0x46ee16f948e2c252d323e5fef3f1dae9c2aad28a
    // const twentyfifth = "two"; -> 0x8eaa2b1e659be0c1e4adbdf482e078e1bddf1636
    const twentyfifth = "";

    const salt = "mnemonic" + twentyfifth;
    const seed = await new Promise((resolve, reject) => {
        pbkdf2(Buffer.from(mnemonicPhrase, "utf8"), Buffer.from(salt, "utf8"), 2048, 64, "sha512", (err, derived) => {
            if (err) reject(err);
            else resolve(Buffer.from(derived));
        });
    });
    const seedMaster = createHmac("sha512", "Bitcoin seed").update(await seed).digest();
    const seedMasterKey = Buffer.from(new Uint8Array(seedMaster).slice(0, 32));
    const seedChainCode = Buffer.from(new Uint8Array(seedMaster).slice(32));

    // Parse derivation path "m/44'/60'/0'/0/0";
    const indexes = [0x8000002C, 0x8000003C, 0x80000000, 0, 0];
    let key = seedMasterKey;let chainCode = seedChainCode; let data
    for (let i = 0; i < indexes.length; i++) {
        const index = indexes[i];
        if (index & 0x80000000) {
            data = Buffer.concat([Buffer.from([0x00]), key, Buffer.alloc(4)]);
        } else {
            const pub = Buffer.from(secp.getPublicKey(key, false));
            data = Buffer.concat([pub, Buffer.alloc(4)]);
        }
        data.writeUInt32BE(index, data.length - 4);
        const childSeedMaster = createHmac("sha512", chainCode).update(data).digest();
        const childSeedMasterKey = Buffer.from(new Uint8Array(childSeedMaster).slice(0, 32));
        const childSeedChainCode = Buffer.from(new Uint8Array(childSeedMaster).slice(32));
        const n = BigInt("0x" + secp.CURVE.n.toString(16));
        const ilNum = BigInt("0x" + childSeedMasterKey.toString("hex"));
        const kparNum = BigInt("0x" + key.toString("hex"));
        const childNum = (ilNum + kparNum) % n;
        key = Buffer.from(childNum.toString(16).padStart(64, "0"), "hex");
        chainCode = childSeedChainCode;
    }
    const uncompressPublicKey = secp.getPublicKey(key, false);
    const raw = Buffer.from(uncompressPublicKey.slice(1));
    const hash = keccak_256(raw);
    const addr = hash.slice(-20);
    const address = "0x" + Buffer.from(addr).toString("hex");
    console.log('Mnemonic:', mnemonicPhrase);
    console.log('25th Word:', twentyfifth);
    console.log('Private Key:', '0x' + key.toString('hex'));
    console.log('Address:', address);
}

evm_generatePrivateKeys();