import { BATTERY_PRICES } from '../src/constants/battery_prices';

console.log("Verifying Battery Prices Data...");

const testCases = [
    { model: "iPhone 7", expectedHC: true, expectedPD: false },
    { model: "iPhone 12 Pro", expectedHC: true, expectedPD: true },
    { model: "iPhone 16 Pro Max", expectedHC: true, expectedPD: false },
];

let failed = false;

testCases.forEach(test => {
    const data = BATTERY_PRICES[test.model];
    if (!data) {
        console.error(`[FAIL] Model ${test.model} not found in BATTERY_PRICES`);
        failed = true;
        return;
    }

    const hasHC = !!data.HC;
    const hasPD = !!data.PD;

    if (hasHC !== test.expectedHC) {
        console.error(`[FAIL] Model ${test.model}: Expected HC=${test.expectedHC}, got ${hasHC}`);
        failed = true;
    }

    if (hasPD !== test.expectedPD) {
        console.error(`[FAIL] Model ${test.model}: Expected PD=${test.expectedPD}, got ${hasPD}`);
        failed = true;
    }

    if (!failed) {
        console.log(`[PASS] Model ${test.model} verified.`);
    }
});

if (failed) {
    console.error("Verification FAILED");
    process.exit(1);
} else {
    console.log("Verification PASSED");
}
