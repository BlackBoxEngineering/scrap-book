// cyclicgroup.js
// Shows how repeated multiplication mod p generates a cycle.
// MattMcP@2024

const arg1 = process.argv[2];
const arg2 = process.argv[3];

if (!arg1 || !arg2) {
    console.log("Usage: node cyclicgroup.js <prime> <base>");
    console.log("  node cyclicgroup.js 11 5   — show cycle for base=5 mod 11");
    console.log("  node cyclicgroup.js 11 0   — explore all bases mod 11");
    process.exit(1);
}

const prime = BigInt(arg1);
const base = BigInt(arg2);

function cycleForBase(prime, base) {
    const seen = new Set();
    const cycle = [];

    let previousValue = 1n;

    for (let exponent = 0n; ; exponent++) {
        let value;
        if (exponent === 0n) {
            value = 1n;
        } else {
            value = (previousValue * base) % prime;
        }

        const key = value.toString();
        if (seen.has(key)) break;
        seen.add(key);
        cycle.push({ exponent, value, previousValue });
        previousValue = value;
    }

    return cycle;
}

function printCycle(prime, base, cycle) {
    const groupOrder = Number(prime - 1n);
    const isGenerator = cycle.length === groupOrder;

    console.log(`\n${base}^x mod ${prime}:`);
    console.log("---------------");

    for (const step of cycle) {
        if (step.exponent === 0n) {
            console.log(`  ${base}^0 mod ${prime} = 1`);
        } else if (step.exponent === 1n) {
            console.log(`  ${base}^1 mod ${prime} = ${step.value}`);
        } else {
            console.log(`  ${base}^${step.exponent} mod ${prime} = ${step.value}    ← (${step.previousValue} * ${base}) % ${prime}`);
        }
    }
    console.log("---------------");
    console.log(`Cycle length: ${cycle.length} / ${groupOrder} (p-1)${isGenerator ? '  ← GENERATOR' : ''}`);
}

const groupOrder = Number(prime - 1n);
console.log(`Group: {1, 2, ..., ${prime - 1n}} under multiplication mod ${prime}`);
console.log(`Group order: ${groupOrder} — a generator must cycle through all ${groupOrder} elements`);

if (base === 0n) {
    const generators = [];
    for (let b = 1n; b < prime; b++) {
        const cycle = cycleForBase(prime, b);
        printCycle(prime, b, cycle);
        if (cycle.length === groupOrder) generators.push(b);
    }
    console.log(`\nGenerators of the group: {${generators.join(', ')}}`);
    console.log(`${generators.length} generators out of ${groupOrder} elements`);
} else {
    const cycle = cycleForBase(prime, base);
    printCycle(prime, base, cycle);
}