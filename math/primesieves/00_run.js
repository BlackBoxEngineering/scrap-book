// Segmented Prime Sieve — the runnable tool.
// MattMcP@Blackboxmint.com
//
// Usage: node 00_run.js <range>
// Example: node 00_run.js 1000000
//
// This is the production version of the segmented sieve explained in steps 01–05.
// Odd-only, bit-packed, L1-cache-segmented.

const range = parseInt(process.argv[2]);

if (!range || range < 2) {
    console.log('Usage: node 00_run.js <range>');
    console.log('Example: node 00_run.js 1000000');
    process.exit(1);
}

// 32KB segment fits in L1 cache — 262,144 odd numbers per segment
const SEGMENT_BITS = 32 * 1024 * 8;

// Phase 1: find all primes up to sqrt(range)
function findSmallPrimes(limit) {
    const oddCount = Math.ceil((limit - 3) / 2);
    const compositeFlags = new Uint8Array((oddCount >> 3) + 1);
    for (let index = 0; index < oddCount; index++) {
        if (!(compositeFlags[index >> 3] & (1 << (index & 7)))) {
            const prime = 2 * index + 3;
            const primeSquared = prime * prime;
            if (primeSquared > limit) break;
            for (let j = (primeSquared - 3) >> 1; j < oddCount; j += prime)
                compositeFlags[j >> 3] |= (1 << (j & 7));
        }
    }
    const primes = [2];
    for (let index = 0; index < oddCount; index++)
        if (!(compositeFlags[index >> 3] & (1 << (index & 7)))) primes.push(2 * index + 3);
    return primes;
}

// Phase 2: sweep range in 32KB segments
function findPrimesSegmented(range) {
    if (range < 2) return [];
    if (range <= 3) return [2];

    const sievingPrimes = findSmallPrimes(Math.ceil(Math.sqrt(range))).filter(prime => prime > 2);
    const primes = [2];

    for (let segmentStart = 3; segmentStart < range; segmentStart += SEGMENT_BITS * 2) {
        let segmentEnd = segmentStart + SEGMENT_BITS * 2 - 2;
        if (segmentEnd >= range) segmentEnd = range - 1;
        if ((segmentEnd & 1) === 0) segmentEnd--;

        const segmentSize = ((segmentEnd - segmentStart) >> 1) + 1;
        const segmentFlags = new Uint8Array((segmentSize >> 3) + 1);

        for (const prime of sievingPrimes) {
            let firstMultiple = prime * prime;
            if (firstMultiple < segmentStart) {
                const remainder = segmentStart % prime;
                firstMultiple = remainder === 0 ? segmentStart : segmentStart + (prime - remainder);
                if ((firstMultiple & 1) === 0) firstMultiple += prime;
            }
            if ((firstMultiple & 1) === 0) firstMultiple += prime;
            for (let multiple = firstMultiple; multiple <= segmentEnd; multiple += 2 * prime) {
                const index = (multiple - segmentStart) >> 1;
                segmentFlags[index >> 3] |= (1 << (index & 7));
            }
        }

        for (let index = 0; index < segmentSize; index++)
            if (!(segmentFlags[index >> 3] & (1 << (index & 7))))
                primes.push(segmentStart + index * 2);
    }

    return primes;
}

const startTime = Date.now();
const primes = findPrimesSegmented(range);
const elapsed = Date.now() - startTime;

console.log(primes.join(', '));
console.log('');
console.log(`Primes up to ${range.toLocaleString()}: ${primes.length.toLocaleString()}`);
console.log(`Time: ${elapsed}ms`);
