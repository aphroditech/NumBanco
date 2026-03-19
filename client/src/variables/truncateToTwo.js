function truncateToTwo(num) {
    if (num === null || num === undefined) return "";
    if (num.toString().split(".")[1]?.length < 5) return num;

    const [intPart, decPart = ""] = num.toString().split(".");
    const truncatedDec = decPart.slice(0, 3).replace(/0+$/, "");

    return truncatedDec ? `${intPart}.${truncatedDec}` : intPart;
}

export default truncateToTwo;
