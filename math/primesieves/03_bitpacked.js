// Step 3: Bit-packed sieve — 8 flags per byte instead of 1.
// MattMcP@2024

// In step 2 we used 1 byte per odd number. But we only need a single bit
// (prime or not prime). Packing 8 flags into each byte gives 8x memory reduction.

// Why does this matter beyond saving RAM?
// Smaller memory footprint = more of the sieve fits in CPU cache.
// Cache hits are ~100x faster than cache misses.
// For large ranges, this is the dominant performance factor.

// Bit layout:
//   index i lives in byte:  i >> 3       (i / 8, integer division)
//   index i lives in bit:   i & 7        (i % 8, the remainder)
//
//   Set composite:  bytes[i >> 3] |=  (1 << (i & 7))
//   Test composite: bytes[i >> 3]  &  (1 << (i & 7))

import { performance } from 'perf_hooks';

// Odd-only sieve (from step 2) for comparison
function findPrimesOddOnly(range) {
    if (range < 2) return [];
    const oddCount = Math.ceil((range - 3) / 2);
    const isComposite = new Uint8Array(oddCount);
    for (let index = 0; index < oddCount; index++) {
        if (!isComposite[index]) {
            const prime = 2 * index + 3;
            const primeSquared = prime * prime;
            if (primeSquared >= range) break;
            const startIndex = (primeSquared - 3) / 2;
            for (let compositeIndex = startIndex; compositeIndex < oddCount; compositeIndex += prime) {
                isComposite[compositeIndex] = 1;
            }
        }
    }
    const primes = [2];
    for (let index = 0; index < oddCount; index++) {
        if (!isComposite[index]) primes.push(2 * index + 3);
    }
    return primes;
}

// Bit-packed odd-only sieve: same logic, but 8 numbers per byte.
function findPrimesBitPacked(range) {
    if (range < 2) return [];

    const oddCount = Math.ceil((range - 3) / 2);

    // One bit per odd number — ceil(oddCount / 8) bytes total
    const compositeFlags = new Uint8Array((oddCount >> 3) + 1);

    // Mark composite: set the bit at position index
    const markComposite = (index) => {
        compositeFlags[index >> 3] |= (1 << (index & 7));
    };

    // Test if composite: check the bit at position index
    const isComposite = (index) => {
        return compositeFlags[index >> 3] & (1 << (index & 7));
    };

    for (let index = 0; index < oddCount; index++) {
        if (!isComposite(index)) {
            const prime = 2 * index + 3;
            const primeSquared = prime * prime;
            if (primeSquared >= range) break;
            const startIndex = (primeSquared - 3) / 2;
            for (let compositeIndex = startIndex; compositeIndex < oddCount; compositeIndex += prime) {
                markComposite(compositeIndex);
            }
        }
    }

    const primes = [2];
    for (let index = 0; index < oddCount; index++) {
        if (!isComposite(index)) primes.push(2 * index + 3);
    }
    return primes;
}

// Verify correctness
const oddOnlyResult = findPrimesOddOnly(1000);
const bitPackedResult = findPrimesBitPacked(1000);
console.log('Results match:', JSON.stringify(oddOnlyResult) === JSON.stringify(bitPackedResult));
console.log('Primes up to 1000:', bitPackedResult.length);
console.log('');

// Show the memory savings
const exampleRange = 10000000;
const oddCount = Math.ceil((exampleRange - 3) / 2);
console.log('Memory comparison for range', exampleRange.toLocaleString() + ':');
console.log('  Basic sieve:    ', (exampleRange / 1024).toFixed(1) + ' KB  (1 byte per number)');
console.log('  Odd-only:       ', (oddCount / 1024).toFixed(1) + ' KB  (1 byte per odd number)');
console.log('  Bit-packed:     ', ((oddCount >> 3) / 1024).toFixed(1) + ' KB  (1 bit per odd number)');
console.log('');

// Benchmark
const ranges = [1000, 100000, 1000000, 10000000];
console.log('Odd-only vs Bit-packed:');
console.log('Bit-packing improves cache utilisation — the sieve fits in L1/L2 for longer.');
console.log('---------------');

for (const range of ranges) {
    const oddStart = performance.now();
    findPrimesOddOnly(range);
    const oddTime = (performance.now() - oddStart).toFixed(2);

    const bitStart = performance.now();
    findPrimesBitPacked(range);
    const bitTime = (performance.now() - bitStart).toFixed(2);

    const timeSaved = (parseFloat(oddTime) - parseFloat(bitTime)).toFixed(2);
    console.log(
        'Range:', String(range).padStart(10),
        '| Odd-only:', String(oddTime).padStart(8) + 'ms',
        '| Bit-packed:', String(bitTime).padStart(8) + 'ms',
        '| Saved:', timeSaved + 'ms'
    );
}
