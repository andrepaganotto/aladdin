import { debounce } from "./utils.js";

import Gate from "./exchanges/Gate.js";
import Binance from "./exchanges/Binance.js";

const exchanges = { Gate, Binance };

const STREAM_TIMER = 60000;
const streams = new Map(); // Exchange:market:symbol -> debounce();
export const book = new Map(); // Exchange:market:symbol -> { asks, bids }

export function keepAlive(exchange, market, symbol) {
    const streamID = `${exchange}:${market}:${symbol}`;

    let stream = streams.get(streamID);

    if (stream) if (!stream.closing) return stream.keepAlive();

    book.set(streamID, {
        bids: new Map(),
        asks: new Map()
    });

    exchanges[exchange].watchOrderBook(symbol, market, book.get(streamID));

    stream = {
        closing: false,
        keepAlive: debounce(() => {
            stream.closing = true;
            exchanges[exchange].unWatchOrderBook(streamID);
            book.delete(streamID);
            streams.delete(streamID);
        }, STREAM_TIMER)
    };

    stream.keepAlive();

    streams.set(streamID, stream);
}
