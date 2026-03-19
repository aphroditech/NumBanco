import * as Random from "../../../math.randomfunctions/randomResult.js";
export const logic1 = async (betticketsHolder, level) => {
    const user = betticketsHolder.filter(item => item.isUser === 1).flatMap(item => item.ticket);
    const bot = betticketsHolder.filter(item => item.isUser === 0).flatMap(item => item.ticket);

    const groupTickets = Random.groupTicketsByX(user);

    const mapTicket = (digits = []) => {
        const results = [];
        for (const digit of digits) {
            for (let num = digit; num < 100; num += 10) {
                if (Random.isNotInArray(num, [...firstgradNumber, ...secondgradNumber, ...thirdgradNumber])) {
                    if(num === 0) results.push(100);
                    else results.push(num);
                }
            }
        }
        return results;
    };

    // Pick winning tickets
    const firstgradNumber = Random.pickNExceptY(bot, [], 1);
    const secondgradNumber = Random.pickNExceptY(bot, firstgradNumber, 2);
    const thirdgradNumber = Random.pickNExceptY(bot, [...firstgradNumber, ...secondgradNumber], 3);
    const forthgradNumber = mapTicket([groupTickets[0].digit]);
    const fifthgradNumber = mapTicket([groupTickets[1].digit, groupTickets[2].digit]);
    const sixthgradNumber = mapTicket([groupTickets[3].digit, groupTickets[4].digit, groupTickets[5].digit]);
    const excluded = new Set([
        ...firstgradNumber,
        ...secondgradNumber,
        ...thirdgradNumber,
        ...forthgradNumber,
        ...fifthgradNumber,
        ...sixthgradNumber,
    ]);
    const seventhgradNumber = Array.from({ length: 100 }, (_, i) => i + 1).filter(num => !excluded.has(num));
    
    return {
        firstgradNumber,
        secondgradNumber,
        thirdgradNumber,
        forthgradNumber,
        fifthgradNumber,
        sixthgradNumber,
        seventhgradNumber
    }
};
