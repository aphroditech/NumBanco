/**
 * Hash Dice payout: digits + dot, max 2 decimals (matches blur); silent clamp to `maxVal` (default 100).
 * @returns `null` to ignore invalid input; otherwise `{ value }`.
 */
export default function filterPayoutTyping(raw, maxVal = 100) {
    const value = String(raw).replace(/[^0-9.]/g, '');
    if (value !== '' && !/^\d+(\.\d{0,2})?$/.test(value)) {
        return null;
    }
    if (value === '') {
        return { value: '' };
    }
    const num = parseFloat(value);
    if (!Number.isNaN(num) && num > maxVal) {
        return { value: maxVal.toFixed(2) };
    }
    return { value };
}
