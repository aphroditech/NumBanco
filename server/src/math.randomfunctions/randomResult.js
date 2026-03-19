// betResult service
export const groupTicketsByX = (numbers = []) => {
    // Always create all digits 0–9
    const groups = Array.from({ length: 10 }, (_, digit) => ({
        digit,
        tickets: []
    }));

    // Fill tickets
    for (const num of numbers) {
        if (Number.isInteger(num)) {
            const digit = Math.abs(num) % 10;
            groups[digit].tickets.push(num);
        }
    }

    // Sort by ticket count (DESC) but KEEP empty digits
    return groups.sort(
        (a, b) => a.tickets.length - b.tickets.length
    );
};

export const pickNExceptY = (X = [], Y = [], n = 1) => {
    // Normalize Y → always array
    const excludeArray = Array.isArray(Y) ? Y : [Y];
    const exclude = new Set(excludeArray);

    // Step 1: filter X
    let available = X.filter(num => !exclude.has(num));

    // Step 2: shuffle available (Fisher–Yates)
    for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
    }

    // Step 3: take what we can
    const result = available.slice(0, n);

    // Step 4: if not enough → fill from 1–100
    if (result.length < n) {
        const used = new Set([...excludeArray, ...result]);

        const pool = [];
        for (let i = 1; i <= 100; i++) {
            if (!used.has(i)) pool.push(i);
        }

        // shuffle pool
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        result.push(...pool.slice(0, n - result.length));
    }

    return result;
};

export const sumArrays = (a = [], b = []) => [...a, ...b];

export const getUserIdByTicket = (X = [], ticketNumber) => {
    if (!Array.isArray(X) || ticketNumber == null) return null;

    const holder = X.find(item =>
        Array.isArray(item.ticket) && item.ticket.includes(ticketNumber)
    );

    return holder ? holder.userId : null;
};
export const getIsUserByTicket = (X = [], ticketNumber) => {
    if (!Array.isArray(X) || ticketNumber == null) return null;

    const holder = X.find(item =>
        Array.isArray(item.ticket) && item.ticket.includes(ticketNumber)
    );

    return holder ? holder.isUser : null;
};
export const getAltasFromArray = (users = [], userId) => {
    if (!Array.isArray(users) || !userId) return null;

    const user = users.find(u => u.userId === userId);
    return user ? user.altas : null;
};

export const isNotInArray = (n, X = []) => {
    return !X.includes(n);
};




