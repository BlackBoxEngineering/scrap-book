// Step 1: Why use a sieve? Trial division vs Sieve of Eratosthenes.
// MattMcP@2024

// The naive way to find primes is trial division:
// For each number n, test if any integer from 2 to sqrt(n) divides it.
// This works, but it's slow — each number is tested independently.

// The Sieve of Eratosthenes flips the approach:
// Instead of asking "is this number prime?", it says
// "mark all multiples of known primes as composite."
// What's left unmarked is prime.

// This script benchmarks both approaches to show the difference.

import { performance } from 'perf_hooks';

// Trial division: test each number individually.
// For each candidate, check divisibility up to sqrt(n).
// Time complexity: O(n * sqrt(n)) for all numbers up to n.
function findPrimesByTrialDivision(range) {
    const primes = [];
    for (let candidate = 2; candidate < range; candidate++) {
        if (isPrimeByTrialDivision(candidate)) primes.push(candidate);
    }
    return primes;
}

function isPrimeByTrialDivision(candidate) {
    if (candidate < 2) return false;
    if (candidate === 2 || candidate === 3) return true;
    if (candidate % 2 === 0 || candidate % 3 === 0) return false;
    // Only need to check up to sqrt(candidate), stepping by 6 (6k±1 pattern)
    for (let divisor = 5; divisor * divisor <= candidate; divisor += 6) {
        if (candidate % divisor === 0 || candidate % (divisor + 2) === 0) return false;
    }
    return true;
}

// Basic Sieve of Eratosthenes: mark composites, collect what's left.
// Time complexity: O(n log log n) — dramatically better.
function findPrimesBySieve(range) {
    const isComposite = new Uint8Array(range);
    isComposite[0] = isComposite[1] = 1;

    // For each prime p, mark p², p²+p, p²+2p, ... as composite
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

// Run both and compare timing
const ranges = [1000, 100000, 1000000, 10000000];

console.log("Trial division vs Sieve of Eratosthenes");
console.log("The sieve eliminates composites in bulk — no per-number sqrt check needed.");
console.log("---------------");

for (const range of ranges) {
    const trialStart = performance.now();
    findPrimesByTrialDivision(range);
    const trialTime = (performance.now() - trialStart).toFixed(2);

    const sieveStart = performance.now();
    findPrimesBySieve(range);
    const sieveTime = (performance.now() - sieveStart).toFixed(2);

    const timeSaved = (parseFloat(trialTime) - parseFloat(sieveTime)).toFixed(2);
    console.log(
        'Range:', String(range).padStart(10),
        '| Trial division:', String(trialTime).padStart(8) + 'ms',
        '| Sieve:', String(sieveTime).padStart(8) + 'ms',
        '| Saved:', timeSaved + 'ms'
    );
}
