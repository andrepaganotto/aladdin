export function findProperty(buffer, index, needle) {
    //This function basically searchs for a json property ("property":"value) in a array of bytes (buffer)
    //It gets starting point of the buffer array (the equivalents bytes for the >"property":"< exactly this) and starting counting from there
    //until it finds the next ", this way we know we found the data we want, which is inside "our data is here", right after the : that comes after the property name
    const start = index + needle.length;
    let i = start;
    while (++i < buffer.length) if (buffer[i] === 0x22) break;
    return buffer.subarray(start, i).toString('utf-8');
}

/**
 * Author: ChatGPT (GPT-5 Thinking)
 * 
 * Purpose:
 *  Builds, per exchange, a mapping from each of its SPOT symbols to the list of exchanges
 *  that list the same symbol in FUTURES. It includes the originating exchange when applicable.
 * 
 * Rules implemented:
 *  - For every exchange E and each symbol S in E.spot, check all exchanges' future lists.
 *  - If an exchange F (including E itself) lists S in futures, include "F" in the array for S.
 * 
 * Complexity:
 *  - Time: O(totalFutures + totalSpots)
 *  - Space: O(uniqueSymbols + outputSize)
 * 
 * Inputs:
 *  data: {
 *    [exchange: string]: {
 *      spot?: string[],
 *      future?: string[]
 *    }
 *  }
 * 
 * Output:
 *  {
 *    [exchange: string]: {
 *      [symbol: string]: string[]  // exchanges that have this symbol in FUTURES
 *    }
 *  }
 * 
 * @param {Record<string, {spot?: string[], future?: string[]}>} data
 * @returns {Record<string, Record<string, string[]>>}
 */
export function createCalcMap(data) {
    const symbolToFutures = new Map();
    const exchanges = Object.keys(data);

    for (let i = 0; i < exchanges.length; i++) {
        const ex = exchanges[i];
        const fut = (data[ex] && data[ex].future) || [];
        for (let j = 0; j < fut.length; j++) {
            const s = fut[j];
            if (!symbolToFutures.has(s)) symbolToFutures.set(s, []);
            symbolToFutures.get(s).push(ex);
        }
    }

    const out = {};
    for (let i = 0; i < exchanges.length; i++) {
        const ex = exchanges[i];
        const spot = (data[ex] && data[ex].spot) || [];
        const bucket = {};
        for (let j = 0; j < spot.length; j++) {
            const s = spot[j];
            const list = symbolToFutures.get(s);
            if (list && list.length) bucket[s] = list;
        }
        out[ex] = Object.entries(bucket);
    }

    return Object.entries(out);
}
