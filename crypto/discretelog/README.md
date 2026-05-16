# Discrete Logarithm

A simple example to demonstrate the discrete log problem.

- `oneway.js` — computes `g^x mod p` (the easy direction), with step-by-step logging of the squaring algorithm
- `bruteforce.js` — given the output, brute-forces `x` back (the hard direction)

## Usage

```bash
# First compute g^x mod p for a secret exponent.
# This outputs the value for f(x) = g^x mod p
node oneway.js 1234

# Call bruteforce using the value for f(x) = g^x mod p
# For example if x is 1234 then f(x) is 69158
node bruteforce.js 69158
```