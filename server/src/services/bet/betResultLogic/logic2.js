export const logic2 = async (betticketsHolder, level) => {
    const data = betticketsHolder.map(({ isUser, ticket }) => ({ isUser, ticket }));
    const count = data.reduce((acc, item) => {
        if (item.isUser === 1) {
            acc += item.ticket.length;
        }
        return acc;
    }, 0);
    const ranked = rankTicketsByUser(data, count, level);

    return ranked;
};
function rankTicketsByUser(data, count, level) {
    // 1️⃣ Build weighted ticket pool (KEEP isUser)
    const pool = [];

    for (const item of data) {
        const ticketFactor = (200 + count) / (400 + count);
        const levelFactor  = (level + 4) / (level + 1) / 4;

        // const weight = item.isUser === 1 ? ticketFactor*levelFactor : 1;
        for (const num of item.ticket) {
            pool.push({
                number: num,
                weight: 1
            });
        }
    }

    // 2️⃣ Weighted shuffle
    pool.sort((a, b) => {
        const r1 = Math.random() ** (1 / a.weight);
        const r2 = Math.random() ** (1 / b.weight);
        return r2 - r1;
    });

    // 3️⃣ Extract unique numbers (KEEP isUser)
    const unique = [];
    const used = new Set();

    for (const item of pool) {
        if (!used.has(item.number)) {
            used.add(item.number);
            unique.push(item.number);
        }
    }

    // 4️⃣ Assign ranks
    return {
        firstgradNumber:  unique.slice(0, 1),
        secondgradNumber: unique.slice(1, 3),
        thirdgradNumber:  unique.slice(3, 6),
        forthgradNumber:  unique.slice(6, 16),
        fifthgradNumber:  unique.slice(16, 36),
        sixthgradNumber:  unique.slice(36, 66),
        seventhgradNumber:  unique.slice(66, 100)
    };
}