// This is a simple demonstration of a one-way function using modular exponentiation.
// MattMcP@2024-06-01

// I am going to demonstrate f(x) = g^x mod p, [f(x)=g**x % p]
// Where g is the generator, P is the Prime, and x is the secret exponent.

const arg = process.argv[2];
if (!arg || !/^\d+$/.test(arg)) {
    console.log("Usage: node oneway.js <positive-integer>");
    process.exit(1);
}

const secretExponent = BigInt(arg);
//const prime = 115792089210356248762697446949407573530086143415290314195533631308867097853951n; 
//const prime = 104729n; 
const prime = 11n; 
// A small prime for demonstration. 
// Real cryptographic systems use primes hundreds of digits long,
// defined in standards (RFC 3526, RFC 7919, NIST curves, etc).

const generator = 2n; 
// A simple generator candidate for this small prime.
// In real systems, the generator is not arbitrary — it is chosen
// as part of a well‑defined mathematical group to ensure security.


// Fast modular exponentiation: computes (generator^secretExponent) % prime
function modularExponentiation(g, x, prime) {

    let result = 1n;
    let base = g % prime;
    let exp = x;

    while (exp) {
        console.log("---------------");

        const lastExp = exp;
        const bit = exp & 1n;
        console.log(`exponent = ${lastExp} (binary ${lastExp.toString(2)})`);
        console.log(`lowest bit = ${bit}`);

        // Multiplication step if the lowest bit of the exponent is 1
        if (bit === 1n) {
            const lastResult = result;
            const newResult = (result * base) % prime;
            console.log(`→ multiply because bit = 1`);
            console.log(`  (${lastResult} * ${base}) % ${prime} = ${newResult}`);
            result = newResult;
        } else {
            console.log("→ bit = 0, skip multiplication");
        }

        // Square the base for the next bit
        const lastBase = base;
        base = (base * base) % prime;
        console.log(`square base: (${lastBase}^2) % ${prime} = ${base}`);

        // Shift exponent right (divide by 2)
        exp >>= 1n;
        console.log(
            `binary right shift (divide exponent by 2): ${lastExp} → ${exp} ` +
            `(binary ${lastExp.toString(2)} → ${exp.toString(2)})`
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
