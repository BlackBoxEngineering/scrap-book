// This is a simple demonstration of a one-way function using modular exponentiation.
// MattMcP@2024-06-01

// I am going to demonstrate f(x) = g^x mod p, [f(x)=g**x % p]
// Where G is the generator, P is the Prime, and x is the secret exponent.

const arg = process.argv[2];
if (!arg) {process.exit(1);}

const secretExponent = BigInt(arg);

const prime = 104729n; 
// A small prime for demonstration. 
// Real cryptographic systems use primes hundreds of digits long,
// defined in standards (RFC 3526, RFC 7919, NIST curves, etc).

const generator = 5n; 
// A simple generator candidate for this small prime.
// In real systems, the generator is not arbitrary — it is chosen
// as part of a well‑defined mathematical group to ensure security.


// Fast modular exponentiation: computes (generator^secretExponent) % prime
function modularExponentiation(generator, secretExponent, prime) {

    let result = 1n;
    generator = generator % prime;

    while (secretExponent) {
        console.log("---------------");

        const lastSecretExponent = secretExponent;
        const bit = secretExponent & 1n;
        console.log(`exponent = ${lastSecretExponent} (binary ${lastSecretExponent.toString(2)})`);
        console.log(`lowest bit = ${bit}`);

        // Multiplication step if the lowest bit of the exponent is 1
        if (bit === 1n) {
            const lastResult = result;
            const newResult = (result * generator) % prime;
            console.log(`→ multiply because bit = 1`);
            console.log(`  (${lastResult} * ${generator}) % ${prime} = ${newResult}`);
            result = newResult;
        } else {
            console.log("→ bit = 0, skip multiplication");
        }

        // Square the base for the next bit
        const lastBase = generator;
        generator = (generator * generator) % prime;
        console.log(`square base: (${lastBase}^2) % ${prime} = ${generator}`);

        // Shift exponent right (divide by 2)
        secretExponent >>= 1n;
        console.log(
            `binary right shift (divide exponent by 2): ${lastSecretExponent} → ${secretExponent} ` +
            `(binary ${lastSecretExponent.toString(2)} → ${secretExponent.toString(2)})`
        );
    }

    console.log("---------------");
    return result;
}

// f(x) = g^x mod p
const fx = modularExponentiation(generator, secretExponent, prime);

console.log(`prime = ${prime}`);
console.log(`generator = ${generator}`);
console.log(`secretExponent = ${secretExponent}`);
console.log(`f(x) = g^x mod p = ${fx}`);