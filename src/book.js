import ccxt from 'ccxt';

const exchanges = {
    Binance: {
        spot: new ccxt.pro.binance(),
        future: new ccxt.pro.binanceusdm()
    },
    Gate: {
        spot: new ccxt.pro.gate(),
        future: new ccxt.pro.gate()
    }
};

const STREAM_TIMER = 60000;

const streams = new Map(); // Exchange:market:symbol -> { alive:boolean, seen:number }
export const book = new Map(); // Exchange:market:symbol -> { asks, bids }

let stamp = 0;

async function watch(exchange, market, symbol, stream) {
    const symbolID = `${symbol}/${market === 'spot' ? 'USDT' : 'USDT:USDT'}`;

    while (stream.alive) {
        try {
            const { bids, asks } = await exchanges[exchange][market].watchOrderBook(symbolID, 100);
            if (!stream.alive) break;

            book.set(`${exchange}:${market}:${symbol}`, { bids, asks });
        }
        catch (err) {
            console.error(`${symbol} error`, err)
            break;
        }
    }

    if (stream.closing) exchanges[exchange][market].unWatchOrderBook(symbolID);
}

export function sync(exchange, market, symbol) {
    const s = ++stamp;

    const key = `${exchange}:${market}:${symbol}`;

    let stream = streams.get(key);

    if (!stream) {
        stream = { alive: true, seen: s, timer: null, closing: false };
        streams.set(key, stream);
        watch(exchange, market, symbol, stream);
    }
    else {
        stream.seen = s;
        stream.closing = false;
        if (stream.timer) {
            clearTimeout(stream.timer);
            stream.timer = null;
        }
    }

    for (const [key, stream] of streams) {
        if (stream.seen !== s && !stream.timer) {
            stream.timer = setTimeout(() => {
                stream.closing = true;
                stream.alive = false;
                streams.delete(key);
                book.delete(key);
            }, STREAM_TIMER);
        }
    }
}
