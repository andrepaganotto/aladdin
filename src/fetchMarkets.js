import ccxt from "ccxt";
import fs from 'fs';

const exchanges = {
    Binance: {
        spotClass: 'binance',
        futureClass: 'binanceusdm'
    },
    Gate: {
        spotClass: 'gate'
    },
    // Kucoin: {
    //     spotClass: 'kucoin',
    //     futureClass: 'kucoinfutures',
    //     instanceLimit: 400
    // },
    // Mex: {
    //     spotClass: 'mexc'
    // },
    // ByBit: {
    //     spotClass: 'bybit'
    // }
};

const filterMarkets = (markets, marketType, quoteCurrency = 'USDT') => Object.values(markets)
    .filter(symbol => symbol[marketType.replace('future', 'swap')] && symbol.active && symbol.quote === quoteCurrency)
    .map(symbol => symbol.base)
    .sort();

function isNetworkError(e) {
    if (e instanceof ccxt.DDoSProtection || e?.message?.includes('ECONNRESET'))
        return true;
    else if (e instanceof ccxt.RequestTimeout)
        return true;
    else if (e instanceof ccxt.NetworkError)
        return true;
    else
        return false;
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function loadMarkets(exchange) {
    let retries = 0;
    const maxRetries = 3;

    async function tryFetching() {
        try {
            const markets = await exchange.loadMarkets();
            if (!markets) throw new ccxt.NetworkError(`[${exchange.id}] Received invalid data from loadMarkets()`)
            return markets;
        }
        catch (error) {
            if (isNetworkError(error))
                if (retries < maxRetries) {
                    retries++;
                    await delay(1000 * retries);
                    return false;
                }
                else throw error;
            else throw error;
        }
    }

    while (true) {
        try {
            const markets = await tryFetching();
            if (markets !== false) return markets;
            else console.log(`(${exchange.id}) is retrying to load markets, attempt: ${retries}/${maxRetries}`);
        }
        catch (error) {
            throw new Error(`Failed to load ${exchange.id} markets, error: ${error}`);
        }
    }
}

async function getMarkets(spotClass, futureClass = false) {
    const spotMarkets = await loadMarkets(new ccxt.pro[spotClass]());
    const futureMarkets = futureClass && await loadMarkets(new ccxt.pro[futureClass]());

    return {
        spot: filterMarkets(spotMarkets, 'spot'),
        future: filterMarkets(futureMarkets || spotMarkets, 'future')
    }
}

(async () => {
    const markets = {};

    for (const [exchange, { spotClass, futureClass }] of Object.entries(exchanges)) {
        try {
            const { spot, future } = await getMarkets(spotClass, futureClass);

            markets[exchange] = { spot, future };

            console.log(`[markets] Loaded (${exchange}) successfully! With ${spot.length}/${future.length} spot/future markets`);
        }
        catch (error) {
            console.error(`[markets] Error loading (${exchange}): ${error}`);
            return false;
        }
    }

    console.log('--------------------------- FILTERING ---------------------------');

    const exchangeMarkets = Object.values(markets);

    const spot = new Set(exchangeMarkets.flatMap(ex => ex.spot));
    const future = new Set(exchangeMarkets.flatMap(ex => ex.future));

    const intersection = spot.intersection(future);

    for (const [exchangeName, exchange] of Object.entries(markets)) {
        exchange.spot = exchange.spot.filter(s => intersection.has(s));
        exchange.future = exchange.future.filter(f => intersection.has(f));

        console.log(`[markets] Filtered (${exchangeName}) successfully! With ${exchange.spot.length}/${exchange.future.length} spot/future markets`);
    }

    console.log('Successfully loaded and filtered all exchanges and markets!');

    fs.writeFileSync('markets.json', JSON.stringify(markets, null, 4));
})();