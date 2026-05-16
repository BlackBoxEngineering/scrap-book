# Discrete Logarithm

A set of examples demonstrating the discrete log problem and cyclic groups.

- `oneway.js` — computes `g^x mod p` (the easy direction), with step-by-step logging of the squaring algorithm
- `bruteforce.js` — given the output, brute-forces `x` back (the hard direction)
- `cyclicgroup.js` — simple g over G cycle example, shows which bases are generators

## Usage

```bash
# Forward: compute g^x mod p for a secret exponent
node oneway.js 1234

# Reverse: given the result, find x by brute force
node bruteforce.js <output_from_oneway>

# Explore cyclic group: see the cycle for a specific base
node cyclicgroup.js 11 2

# Explore all bases mod p to find generators
node cyclicgroup.js 11 0
```