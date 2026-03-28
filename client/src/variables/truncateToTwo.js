function truncateToTwo(num) {
    if (num === null || num === undefined) return "";
    if (num.toString().split(".")[1]?.length < 5) return num;

    const [intPart, decPart = ""] = num.toString().split(".");
    const truncatedDec = decPart.slice(0, 3).replace(/0+$/, "");

    return truncatedDec ? `${intPart}.${truncatedDec}` : intPart;
}

/** USD label: negatives as `-$0.50`, not `$-0.50`. */
export function formatUsdDisplay(num) {
    if (num === null || num === undefined || num === "") return "";
    const n = Number(num);
    if (!Number.isFinite(n)) return "";
    const absTrunc = truncateToTwo(Math.abs(n));
    const amountStr = typeof absTrunc === "number" ? String(absTrunc) : absTrunc;
    if (n < 0) return `-$${amountStr}`;
    return `$${amountStr}`;
}

export default truncateToTwo;
