// primeSieve.js — BlackBox Segmented Sieve
// MattMcP@Blackboxmint.com

const range = parseInt(process.argv[2]);

if (!range || range < 2) {
    console.log('Add a range, i.e primeSieve.js 1000000');
    process.exit(1);
}

const SEGMENT_BITS = 32 * 1024 * 8; // 32KB segment, L1 cache sized

function smallSieve(limit) {
    const size  = Math.ceil((limit - 3) / 2);
    const bytes = new Uint8Array((size >> 3) + 1);
    for (let i = 0; i < size; i++) {
        if (!(bytes[i >> 3] & (1 << (i & 7)))) {
            const p  = 2 * i + 3;
            const p2 = p * p;
            if (p2 > limit) break;
            for (let j = (p2 - 3) >> 1; j < size; j += p)
                bytes[j >> 3] |= (1 << (j & 7));
        }
    }
    const primes = [2];
    for (let i = 0; i < size; i++)
        if (!(bytes[i >> 3] & (1 << (i & 7)))) primes.push(2 * i + 3);
    return primes;
}

function blackboxSieve(range) {
    if (range < 2)  return [];
    if (range <= 3) return [2];

    const sievePrimes = smallSieve(Math.ceil(Math.sqrt(range))).filter(p => p > 2);
    const primes = [2];

    for (let segStart = 3; segStart < range; segStart += SEGMENT_BITS * 2) {
        let segEnd = segStart + SEGMENT_BITS * 2 - 2;
        if (segEnd >= range) segEnd = range - 1;
        if ((segEnd & 1) === 0) segEnd--;

        const segSize  = ((segEnd - segStart) >> 1) + 1;
        const segBytes = new Uint8Array((segSize >> 3) + 1);

        for (const p of sievePrimes) {
            let lo = p * p;
            if (lo < segStart) {
                const r = segStart % p;
                lo = r === 0 ? segStart : segStart + (p - r);
                if ((lo & 1) === 0) lo += p;
            }
            if ((lo & 1) === 0) lo += p;
            for (let m = lo; m <= segEnd; m += 2 * p) {
                const idx = (m - segStart) >> 1;
                segBytes[idx >> 3] |= (1 << (idx & 7));
            }
        }

        for (let i = 0; i < segSize; i++)
            if (!(segBytes[i >> 3] & (1 << (i & 7))))
                primes.push(segStart + i * 2);
    }

    return primes;
}

const start  = Date.now();
const primes = blackboxSieve(range);
const elapsed = Date.now() - start;

console.log(primes.join(', '));
console.log('');
console.log(`Primes up to ${range.toLocaleString()}: ${primes.length.toLocaleString()}`);
console.log(`Time: ${elapsed}ms`);

