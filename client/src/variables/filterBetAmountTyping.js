/**
 * Mines-style typing rules: digits only, one dot, max 2 decimals; clamp to `maxAmount` (silent).
 * @returns `null` = ignore change (invalid pattern); otherwise `{ value }`.
 */
export default function filterBetAmountTyping(raw, maxAmount) {
    const value = String(raw).replace(/[^0-9.]/g, '');
    if (value !== '' && !/^\d+(\.\d{0,2})?$/.test(value)) {
        return null;
    }
    if (value === '') {
        return { value: '' };
    }
    const num = parseFloat(value);
    if (!Number.isNaN(num) && num > maxAmount) {
        return { value: Number(maxAmount).toFixed(2) };
    }
    return { value };
}
