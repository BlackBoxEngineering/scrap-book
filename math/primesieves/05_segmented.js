// Step 5: Segmented sieve — process in L1-cache-sized chunks.
// MattMcP@2024

// Problem with all previous approaches: for very large ranges, the sieve array
// exceeds CPU cache. Once you spill into main RAM, performance drops off a cliff.

// Solution: process the range in segments that fit in L1 cache (~32KB).
// For each segment, use the small primes (up to sqrt(range)) to mark composites.
// This keeps the working memory fixed at 32KB regardless of the total range.

// This combines everything from the previous steps:
//   Step 2: Odd-only       — skip all evens
//   Step 3: Bit-packed     — 8 flags per byte
//   Step 5: Segmented      — fixed 32KB working memory

// The two-phase approach:
//   Phase 1: Find all primes up to sqrt(range) using a simple sieve (they fit in memory).
//   Phase 2: Sweep through the full range in 32KB segments, using phase 1 primes to mark composites.

import { performance } from 'perf_hooks';

// Segment size tuned to L1 cache (~32KB)
// 32KB * 8 bits = 262,144 odd numbers per segment
const SEGMENT_BYTES = 32 * 1024;
const SEGMENT_BITS = SEGMENT_BYTES * 8;

// Phase 1: find small primes up to sqrt(range).
// These are the "sieving primes" used to mark composites in each segment.
function findSmallPrimes(limit) {
    const oddCount = Math.ceil((limit - 3) / 2);
    const compositeFlags = new Uint8Array((oddCount >> 3) + 1);

    for (let index = 0; index < oddCount; index++) {
        if (!(compositeFlags[index >> 3] & (1 << (index & 7)))) {
            const prime = 2 * index + 3;
            const primeSquared = prime * prime;
            if (primeSquared > limit) break;
            for (let compositeIndex = (primeSquared - 3) >> 1; compositeIndex < oddCount; compositeIndex += prime) {
                compositeFlags[compositeIndex >> 3] |= (1 << (compositeIndex & 7));
            }
        }
    }

    const primes = [2];
    for (let index = 0; index < oddCount; index++) {
        if (!(compositeFlags[index >> 3] & (1 << (index & 7)))) {
            primes.push(2 * index + 3);
        }
    }
    return primes;
}

// Phase 2: segmented sieve.
// Process the range in chunks of SEGMENT_BITS odd numbers.
// Each chunk uses a fresh 32KB buffer — always fits in L1 cache.
function findPrimesSegmented(range) {
    if (range < 2) return [];
    if (range <= 3) return [2];

    const squareRootOfRange = Math.ceil(Math.sqrt(range));
    const smallPrimes = findSmallPrimes(squareRootOfRange);

    // Only odd primes are used for sieving (2 is handled separately)
    const sievingPrimes = smallPrimes.filter(prime => prime > 2);

    const primes = [2];

    // Sweep through the range in segments
    for (let segmentStart = 3; segmentStart < range; segmentStart += SEGMENT_BITS * 2) {

        // Determine segment boundaries (odd numbers only)
        let segmentEnd = segmentStart + SEGMENT_BITS * 2 - 2;
        if (segmentEnd >= range) segmentEnd = range - 1;
        if ((segmentEnd & 1) === 0) segmentEnd--;

        const segmentSize = ((segmentEnd - segmentStart) >> 1) + 1;
        const segmentFlags = new Uint8Array((segmentSize >> 3) + 1);

        // Mark composites in this segment using each sieving prime
        for (const prime of sievingPrimes) {

            // Find the first odd multiple of prime that falls within this segment
            let firstMultiple = prime * prime;
            if (firstMultiple < segmentStart) {
                const remainder = segmentStart % prime;
                firstMultiple = remainder === 0 ? segmentStart : segmentStart + (prime - remainder);
                if ((firstMultiple & 1) === 0) firstMultiple += prime; // ensure odd
            }
            if ((firstMultiple & 1) === 0) firstMultiple += prime;

            // Step by 2*prime to stay on odd multiples only
            for (let multiple = firstMultiple; multiple <= segmentEnd; multiple += 2 * prime) {
                const index = (multiple - segmentStart) >> 1;
                segmentFlags[index >> 3] |= (1 << (index & 7));
            }
        }

        // Collect unmarked numbers from this segment — they are prime
        for (let index = 0; index < segmentSize; index++) {
            if (!(segmentFlags[index >> 3] & (1 << (index & 7)))) {
                primes.push(segmentStart + index * 2);
            }
        }
    }

    return primes;
}

// Simple odd-only sieve for comparison (no segmentation)
function findPrimesOddOnly(range) {
    if (range < 2) return [];
    const oddCount = Math.ceil((range - 3) / 2);
    const isComposite = new Uint8Array(oddCount);
    for (let index = 0; index < oddCount; index++) {
        if (!isComposite[index]) {
            const prime = 2 * index + 3;
            if (prime * prime >= range) break;
            const startIndex = (prime * prime - 3) / 2;
            for (let j = startIndex; j < oddCount; j += prime) isComposite[j] = 1;
        }
    }
    const primes = [2];
    for (let index = 0; index < oddCount; index++) {
        if (!isComposite[index]) primes.push(2 * index + 3);
    }
    return primes;
}

// Verify correctness
for (const testRange of [100, 1000, 10000, 100000]) {
    const reference = findPrimesOddOnly(testRange);
    const segmented = findPrimesSegmented(testRange);
    const match = JSON.stringify(reference) === JSON.stringify(segmented);
    console.log(`Results match (${testRange.toLocaleString().padStart(7)}): ${match} — ${segmented.length} primes`);
}
console.log('');

// Memory comparison
const exampleRange = 10000000;
const oddCount = Math.ceil((exampleRange - 3) / 2);
console.log('Memory comparison for range', exampleRange.toLocaleString() + ':');
console.log('  Basic sieve:   ', (exampleRange / 1024).toFixed(1) + ' KB');
console.log('  Odd-only:      ', (oddCount / 1024).toFixed(1) + ' KB');
console.log('  Bit-packed:    ', ((oddCount >> 3) / 1024).toFixed(1) + ' KB');
console.log('  Segmented:      32 KB fixed  ← always fits in L1 cache');
console.log('');

// Benchmark
const ranges = [1000, 100000, 1000000, 10000000, 100000000];
console.log('Odd-only vs Segmented sieve:');
console.log('Segmentation keeps working memory in L1 cache — dominates at large ranges.');
console.log('---------------');
console.log('      Range  |   Odd-only  |  Segmented  |  Speedup');
console.log('-'.repeat(55));

for (const range of ranges) {
    const oddStart = performance.now();
    findPrimesOddOnly(range);
    const oddTime = performance.now() - oddStart;

    const segStart = performance.now();
    findPrimesSegmented(range);
    const segTime = performance.now() - segStart;

    const speedup = (oddTime / segTime).toFixed(1) + 'x';
    console.log(
        String(range.toLocaleString()).padStart(12),
        '|', String(oddTime.toFixed(2) + 'ms').padStart(10),
        '|', String(segTime.toFixed(2) + 'ms').padStart(10),
        '|', speedup
    );
}
