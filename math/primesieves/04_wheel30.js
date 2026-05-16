// Step 4: Wheel-30 factorisation — skip multiples of 2, 3, AND 5.
// MattMcP@2024

// Pattern recognition:
//   All primes > 3 are of the form 6k±1  (wheel-6, eliminates multiples of 2 and 3)
//   All primes > 5 are of the form 30k+r (wheel-30, eliminates multiples of 2, 3, and 5)
//   where r ∈ {1, 7, 11, 13, 17, 19, 23, 29} — only 8 positions out of every 30.

// Odd-only stores 50% of numbers (skips multiples of 2).
// Wheel-30 stores only 26.7% of numbers (skips multiples of 2, 3, and 5).
// That's almost half again.

// The "spokes" are the 8 residues coprime to 30.
// Every prime > 5 MUST land on one of these spokes.
// Everything else is pre-eliminated by the wheel itself.

// We store 8 spokes per cycle of 30 numbers.
// 8 spokes = 8 bits = 1 byte per cycle. Perfectly packed.

import { performance } from 'perf_hooks';

// Wheel-30 configuration
const wheelSpokes = [1, 7, 11, 13, 17, 19, 23, 29];

// Lookup: for a given residue mod 30, which spoke index is it? (-1 = not on wheel)
const spokeIndexLookup = new Int8Array(30).fill(-1);
for (let i = 0; i < wheelSpokes.length; i++) {
    spokeIndexLookup[wheelSpokes[i]] = i;
}

// Bit-packed sieve (from step 3) for comparison
function findPrimesBitPacked(range) {
    if (range < 2) return [];
    const oddCount = Math.ceil((range - 3) / 2);
    const compositeFlags = new Uint8Array((oddCount >> 3) + 1);
    const markComposite = (i) => { compositeFlags[i >> 3] |= (1 << (i & 7)); };
    const isComposite = (i) => compositeFlags[i >> 3] & (1 << (i & 7));
    for (let index = 0; index < oddCount; index++) {
        if (!isComposite(index)) {
            const prime = 2 * index + 3;
            const primeSquared = prime * prime;
            if (primeSquared >= range) break;
            const startIndex = (primeSquared - 3) / 2;
            for (let j = startIndex; j < oddCount; j += prime) markComposite(j);
        }
    }
    const primes = [2];
    for (let index = 0; index < oddCount; index++) {
        if (!isComposite(index)) primes.push(2 * index + 3);
    }
    return primes;
}

// Wheel-30 sieve
function findPrimesWheel30(range) {
    if (range < 2) return [];

    // How many cycles of 30 do we need?
    const cycleCount = Math.ceil(range / 30) + 1;

    // 1 byte per cycle — each bit represents one spoke
    const compositeFlags = new Uint8Array(cycleCount);

    const markComposite = (number) => {
        const spokeIndex = spokeIndexLookup[number % 30];
        if (spokeIndex < 0) return; // not on wheel, already eliminated
        const cycle = Math.floor(number / 30);
        compositeFlags[cycle] |= (1 << spokeIndex);
    };

    const isComposite = (number) => {
        const spokeIndex = spokeIndexLookup[number % 30];
        if (spokeIndex < 0) return true; // not on wheel = composite by definition
        const cycle = Math.floor(number / 30);
        return compositeFlags[cycle] & (1 << spokeIndex);
    };

    // Sieve: only iterate over numbers that land on wheel spokes
    for (let cycle = 0; cycle < cycleCount; cycle++) {
        for (let spokeIndex = 0; spokeIndex < wheelSpokes.length; spokeIndex++) {
            const prime = cycle * 30 + wheelSpokes[spokeIndex];
            if (prime < 7 || prime >= range) continue;
            if (isComposite(prime)) continue;

            const primeSquared = prime * prime;
            if (primeSquared >= range) break;

            // Mark multiples of this prime that land on wheel spokes
            for (let multiplierCycle = 0; multiplierCycle < cycleCount; multiplierCycle++) {
                for (let multiplierSpoke = 0; multiplierSpoke < wheelSpokes.length; multiplierSpoke++) {
                    const multiple = prime * (multiplierCycle * 30 + wheelSpokes[multiplierSpoke]);
                    if (multiple < primeSquared) continue;
                    if (multiple >= range) break;
                    markComposite(multiple);
                }
            }
        }
    }

    // Collect primes: small primes first, then wheel results
    const primes = [];
    if (range > 2) primes.push(2);
    if (range > 3) primes.push(3);
    if (range > 5) primes.push(5);

    for (let cycle = 0; cycle < cycleCount; cycle++) {
        for (let spokeIndex = 0; spokeIndex < wheelSpokes.length; spokeIndex++) {
            const number = cycle * 30 + wheelSpokes[spokeIndex];
            if (number < 7 || number >= range) continue;
            if (!isComposite(number)) primes.push(number);
        }
    }

    return primes;
}

// Verify correctness
const bitPackedResult = findPrimesBitPacked(1000);
const wheel30Result = findPrimesWheel30(1000);
console.log('Results match:', JSON.stringify(bitPackedResult) === JSON.stringify(wheel30Result));
console.log('Primes up to 1000:', wheel30Result.length);
console.log('');

// Show the wheel pattern
console.log('Wheel-30 spokes (residues coprime to 30):');
console.log(' ', wheelSpokes.join(', '));
console.log('Only', wheelSpokes.length, 'of 30 positions need checking —', ((wheelSpokes.length / 30) * 100).toFixed(1) + '% of numbers');
console.log('vs odd-only: 50% of numbers');
console.log('vs basic:    100% of numbers');
console.log('');

// Memory comparison
const exampleRange = 10000000;
const cycleCount = Math.ceil(exampleRange / 30) + 1;
const oddCount = Math.ceil((exampleRange - 3) / 2);
console.log('Memory comparison for range', exampleRange.toLocaleString() + ':');
console.log('  Basic sieve:   ', (exampleRange / 1024).toFixed(1) + ' KB');
console.log('  Odd-only:      ', (oddCount / 1024).toFixed(1) + ' KB');
console.log('  Bit-packed:    ', ((oddCount >> 3) / 1024).toFixed(1) + ' KB');
console.log('  Wheel-30:      ', (cycleCount / 1024).toFixed(1) + ' KB  ← 1 byte per cycle of 30');
console.log('');

// Benchmark
const ranges = [1000, 100000, 1000000, 10000000];
console.log('Bit-packed vs Wheel-30:');
console.log('Wheel-30 checks fewer positions — 26.7% vs 50% of all numbers.');
console.log('---------------');

for (const range of ranges) {
    const bitStart = performance.now();
    findPrimesBitPacked(range);
    const bitTime = (performance.now() - bitStart).toFixed(2);

    const wheelStart = performance.now();
    findPrimesWheel30(range);
    const wheelTime = (performance.now() - wheelStart).toFixed(2);

    const timeSaved = (parseFloat(bitTime) - parseFloat(wheelTime)).toFixed(2);
    console.log(
        'Range:', String(range).padStart(10),
        '| Bit-packed:', String(bitTime).padStart(8) + 'ms',
        '| Wheel-30:', String(wheelTime).padStart(8) + 'ms',
        '| Saved:', timeSaved + 'ms'
    );
}
