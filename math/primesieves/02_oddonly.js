// Step 2: Odd-only sieve — skip all even numbers.
// MattMcP@2024

// Insight: 2 is the only even prime. Every other even number is composite.
// So why waste memory and time on them?

// Instead of storing every number from 0 to range, we only store odd numbers >= 3.
// This halves the memory and halves the inner loop iterations.

// Index mapping:
//   odd number n → index (n - 3) / 2
//   index i      → odd number 2i + 3
//
// Example: number 7 → index (7-3)/2 = 2
//          index 2  → number 2*2+3  = 7

import { performance } from 'perf_hooks';

// Basic sieve (from step 1) for comparison
function findPrimesBySieve(range) {
    const isComposite = new Uint8Array(range);
    isComposite[0] = isComposite[1] = 1;
    for (let prime = 2; prime * prime < range; prime++) {
        if (!isComposite[prime]) {
            for (let multiple = prime * prime; multiple < range; multiple += prime) {
                isComposite[multiple] = 1;
            }
        }
    }
    const primes = [];
    for (let number = 2; number < range; number++) {
        if (!isComposite[number]) primes.push(number);
    }
    return primes;
}

// Odd-only sieve: only store and process odd numbers.
function findPrimesOddOnly(range) {
    if (range < 2) return [];

    // How many odd numbers are there in [3, range)?
    const oddCount = Math.ceil((range - 3) / 2);
    const isComposite = new Uint8Array(oddCount);

    // For each unmarked index, the corresponding odd number is prime.
    // Mark its odd multiples starting from p².
    for (let index = 0; index < oddCount; index++) {
        if (!isComposite[index]) {
            const prime = 2 * index + 3;
            const primeSquared = prime * prime;
            if (primeSquared >= range) break; // all remaining are prime

            // Starting index for p² in our odd-only array
            const startIndex = (primeSquared - 3) / 2;

            // Step by prime (in index space) = step by 2*prime in number space
            // but since we only store odds, stepping by prime in index space
            // skips exactly 2*prime numbers, landing on the next odd multiple.
            for (let compositeIndex = startIndex; compositeIndex < oddCount; compositeIndex += prime) {
                isComposite[compositeIndex] = 1;
            }
        }
    }

    // Collect: 2 is the only even prime, then all unmarked odd numbers
    const primes = [2];
    for (let index = 0; index < oddCount; index++) {
        if (!isComposite[index]) primes.push(2 * index + 3);
    }
    return primes;
}

// Verify correctness
const basicResult = findPrimesBySieve(1000);
const oddOnlyResult = findPrimesOddOnly(1000);
console.log('Results match:', JSON.stringify(basicResult) === JSON.stringify(oddOnlyResult));
console.log('Primes up to 1000:', oddOnlyResult.length);
console.log('');

// Benchmark
const ranges = [1000, 100000, 1000000, 10000000];
console.log('Basic sieve vs Odd-only sieve:');
console.log('Odd-only uses half the memory and skips all even multiples.');
console.log('---------------');

for (const range of ranges) {
    const basicStart = performance.now();
    findPrimesBySieve(range);
    const basicTime = (performance.now() - basicStart).toFixed(2);

    const oddStart = performance.now();
    findPrimesOddOnly(range);
    const oddTime = (performance.now() - oddStart).toFixed(2);

    const timeSaved = (parseFloat(basicTime) - parseFloat(oddTime)).toFixed(2);
    console.log(
        'Range:', String(range).padStart(10),
        '| Basic:', String(basicTime).padStart(8) + 'ms',
        '| Odd-only:', String(oddTime).padStart(8) + 'ms',
        '| Saved:', timeSaved + 'ms'
    );
}
