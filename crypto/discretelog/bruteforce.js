// Brute-force discrete logarithm solver.
// Given a target value, finds x such that g^x mod p === target.
// MattMcP@2024-06-01

// Very simple demo to explain WHY the discrete log problem is hard:
// Using a a small prime and a pretend generator, we can easily compute g^x mod p for any x.

// In a real cryptographic system, the prime would be hundreds of digits long,
// making this brute-force search infeasible. Here, we use a small prime and a pretend generator.

//const prime = 115792089210356248762697446949407573530086143415290314195533631308867097853951n;
const prime = 11n;
//const prime = 104729n; 
const generator = 2n;

const arg = process.argv[2];
if (!arg) {
    console.log("Usage: node bruteforce.js <target>");
    console.log("Provide the output of g^x mod p to find x.");
    process.exit(1);
}
const target = BigInt(arg);

console.log(`prime = ${prime}`);
console.log(`generator = ${generator}`);
console.log(`target = ${target}`);
console.log(`Searching for x where ${generator}^x mod ${prime} === ${target} ...`);
console.log("---------------");

// Computing g^x mod p can be done efficiently using modular exponentiation (exponentiation by squaring).
function modularExponentiation(base, exponent, modulus) {
    let result = 1n;
    base = base % modulus;
    while (exponent > 0n) {
        if (exponent & 1n) result = (result * base) % modulus;
        base = (base * base) % modulus;
        exponent >>= 1n;
    }
    return result;
}

// Brute-force search for x such that generator^x mod prime === target
const startTime = Date.now();


// Looping through possible secret exponents starting from 1 up to prime-1 (since g^0 mod p = 1)
for (let secretExponent = 1n; secretExponent < prime; secretExponent++) {
    const result = modularExponentiation(generator, secretExponent, prime);

    // if the result matches the target, we found our secret exponent
    if (result === target) {
        const elapsed = Date.now() - startTime;
        console.log(`Found secret exponent: x = ${secretExponent}`);
        console.log(`Verified: ${generator}^${secretExponent} mod ${prime} = ${result}`);
        console.log(`Attempts: ${secretExponent.toString()}`);
        console.log(`Time: ${elapsed}ms`);
        break;
    }
}