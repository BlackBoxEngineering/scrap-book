# Prime Sieves

A step-by-step optimisation of the Sieve of Eratosthenes, from naive to L1-cache-segmented.

## Usage

```bash
node 00_run.js 1000000
```

## The Progression

Each step builds on the last. Run them individually to see benchmarks and explanations.

| File | Optimisation | Key Insight |
|------|-------------|-------------|
| `01_trialvssieve.js` | Sieve vs trial division | Eliminate composites in bulk instead of testing each number |
| `02_oddonly.js` | Skip all even numbers | 2 is the only even prime — halves memory and work |
| `03_bitpacked.js` | 1 bit per number | 8x memory reduction, better cache utilisation |
| `04_wheel30.js` | Wheel-30 factorisation | Only 8 of every 30 positions can be prime (26.7%) |
| `05_segmented.js` | L1-cache segmentation | Fixed 32KB working memory regardless of range |

## Memory at 10,000,000

```
Basic sieve:    9,765 KB
Odd-only:       4,882 KB
Bit-packed:       610 KB
Segmented:         32 KB
```
