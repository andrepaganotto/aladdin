export function debounce(callback, delay = 15000) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(function () {
            callback.apply(context, args);
        }, delay);
    }
}

export function find(buffer, start, stop, parse = false) {
    // find buffer subarray (slice of the buffer array) at `start` (usually `index + needle.length`) until `stop`
    stop = buffer.indexOf(stop, start);
    return parse ? buffer.subarray(start, stop).toString('utf-8') : buffer.subarray(start, stop);
}

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
 * Calculates the average price of a trade based on cash volume (price * volume) given a order book side (bids or asks).
 * This function is used to know what price you will pay when executing a market order.
 * @param {Array<[number, number]>} arr - Array of [price, volume] pairs, ordered best to worst.
 * @param {number} vol - Total cash amount to be spent.
 * @returns {[number, number, number]|undefined} - [avgPrice, lastPriceUsed, totalCashVol] or undefined if theres no enough cash volume on the provided book to fulfill the trade.
 */
export const avgPrice = (arr, sort = 'asc', vol) => {
    if (sort === 'asc') arr = [...arr.entries()].sort(([a], [b]) => a - b);
    if (sort === 'desc') arr = [...arr.entries()].sort(([a], [b]) => b - a);

    let initVol = vol
    let sum = 0;
    let cashVol = 0;

    for (const [price, volume] of arr) {
        cashVol += price * volume
        const diff = Math.min(price * volume, vol);
        sum += diff / price;
        if (!(vol -= diff)) return [initVol / sum, price, cashVol];
    }

    return undefined;
};

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
