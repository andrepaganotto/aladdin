import axios from 'axios';
import WebSocket from 'ws';
import { findProperty } from '../utils.js';

//This is a read-only api key that is used for the purpose of getting spot symbol delisting info only.
const apiKey = process.env.BINANCE_API_KEY;
const spotDelistUrl = 'https://api.binance.com/sapi/v1/spot/delist-schedule';

const spotRestUrl = 'https://api.binance.com/api/v3';
const futureRestUrl = 'https://fapi.binance.com/fapi/v1';

const symbols = {};

async function fetchSymbols(refresh = false) {
    if (!refresh && Object.keys(symbols).length) return symbols;

    try {
        const req = await axios.get(spotRestUrl + '/exchangeInfo?permissions=SPOT');
        const list = req.data?.symbols;
        if (!list || !list.length) throw new Error(`No data from request: ${list}`);

        symbols.spot = Object.fromEntries(list.filter(s => s.quoteAsset === 'USDT' && s.status === 'TRADING').map(s => [s.baseAsset, s.symbol]));
        //TODO -> symbols.spotDelisting = get from the api (needs api key)
    }
    catch (error) {
        console.error('(Binance) Error trying to fetchSymbols (spot)', error);
    }

    try {
        const req = await axios.get(spotDelistUrl, { params: { timestamp: Date.now() }, headers: { "X-MBX-APIKEY": apiKey } });
        const list = req.data;
        if (!list) throw new Error(`No data from request: ${list}`);

        symbols.spotDelisting = Object.fromEntries(list.flatMap(({ delistTime, symbols }) => symbols.filter(s => s.includes('USDT')).map(s => [s.replace('USDT', ''), new Date(delistTime).toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })])));
    }
    catch (error) {
        console.error('(Binance) Error trying to fetchSymbols (spot delisting)', error);
    }

    try {
        const req = await axios.get(futureRestUrl + '/exchangeInfo');
        const list = req.data?.symbols;
        if (!list || !list.length) throw new Error(`No data from request: ${list}`);

        const futureFilter = s => s.quoteAsset === 'USDT' && s.marginAsset === 'USDT' && s.status === 'TRADING' && s.contractType === 'PERPETUAL';
        //This filters only symbols which have delivery date set for the next 7 days from now (basically symbols that will be delisted in the next 7 days)
        const futureDelistFilter = s => (s.deliveryDate >= Date.now() && s.deliveryDate - Date.now() <= 6.048e8) && s.quoteAsset === 'USDT' && s.marginAsset === 'USDT' && s.contractType === 'PERPETUAL';

        symbols.future = Object.fromEntries(list.filter(futureFilter).map(s => [s.baseAsset, s.symbol]));
        symbols.futureDelisting = Object.fromEntries(list.filter(futureDelistFilter).map(s => [s.baseAsset, new Date(s.deliveryDate).toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })]));
    }
    catch (error) {
        console.error('(Binance) Error trying to fetchSymbols (futures)', error);
    }

    return symbols;
}

/*

    XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
    XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
    XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

*/

const spotUrl = 'wss://stream.binance.com:9443/stream?streams=';
const futureUrl = 'wss://fstream.binance.com/stream?streams=';

const priceNeedle = Buffer.from('"p":"');
const symbolNeedle = Buffer.from('"s":"');

function watchTickers(prices) {
    const spotSymbols = Object.keys(prices.spot);
    const futureSymbols = Object.keys(prices.future);

    const spotStreams = spotSymbols.map(s => `${s.toLowerCase()}@trade`).join('/');
    const futureStreams = futureSymbols.map(s => `${s.toLowerCase()}@aggTrade`).join('/');

    function connect(streamUrl, market = 'spot') {
        const ws = new WebSocket(streamUrl);

        ws.once('open', () => console.log(`Connected to Binance (${market}) WS`));

        ws.on('message', buffer => {
            //Since we are dealing with crypto exchanges data streams, we will ALWAYS receive stringfied JSON, which means
            //we are always receiving a string, the raw data will be in bytes, but this bytes translates to a stringfied JSON object
            const priceIndex = buffer.indexOf(priceNeedle);
            if (priceIndex === -1) return; //if theres no price this data is useless, so we can return right after checking for its existance

            const symbolIndex = buffer.indexOf(symbolNeedle);
            if (symbolIndex === -1) return; //if theres no symbol data we wont know what symbol we are dealing with, so we can return also

            const symbol = findProperty(buffer, symbolIndex, symbolNeedle);
            prices[market][symbol][0] = +findProperty(buffer, priceIndex, priceNeedle);
        });

        ws.on('error', err => console.error('Binance WS error', err));

        ws.once('close', (code, reason) => {
            console.error('Binance WS closed', code, reason);
            setTimeout(() => connect(streamUrl, market), 5000);
        });
    }

    connect(spotUrl + spotStreams);
    connect(futureUrl + futureStreams, 'future');

    // setInterval(() => {
    //     // console.log(prices);
    //     console.log('BINANCE');
    //     console.log('SPOT:', Object.values(prices.spot).filter(s => s[0]).length);
    //     console.log('FUTURES:', Object.values(prices.future).filter(s => s[0]).length);
    // }, 1000);
}


//IMPORTANT: Binance doesnt give a shit if you send a non existing or delisted symbol on the stream,
//it simply ignores it and keeps sending the data to all other valid streams



// Private close code reserved for manual stops
const force = 4000;

const streams = new Map();

function watchOrderBook(symbol, market, book) {
    const streamID = `Binance:${market}:${symbol}`;
    const isSpot = market === 'spot';

    if (streams.get(streamID)) return streamID;

    function connect() {
        const events = [];
        const EVENTS_MAX = 1000; // cap the pre-snapshot buffer

        book.ready = false;
        book.asks.clear();
        book.bids.clear();
        book.depthID = 0;

        const ws = new WebSocket((isSpot ? spotUrl : futureUrl) + `${symbol.toLowerCase()}usdt@depth`);

        streams.set(streamID, ws);

        // ws.on('open', () => console.log('Open'));

        ws.once('message', async buffer => {
            const data = JSON.parse(buffer).data;

            if (data?.U && !book.depthID) book.depthID = data.U;

            let snapshot;
            let retryDelay = 200; // ms
            const RETRY_MAX = 5000; // ms
            while (true) {
                try {
                    const req = await axios.get((isSpot ? spotRestUrl : futureRestUrl) + `/depth?symbol=${symbol}USDT&limit=100`);
                    snapshot = req.data;
                }
                catch (err) {
                    const networkCodes = ['ECONNABORTED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN', 'ECONNREFUSED', 'ENETUNREACH', 'EHOSTUNREACH'];
                    const isNetworkIssue = (
                        (err && typeof err === 'object' && (
                            (err.code && networkCodes.includes(err.code)) ||
                            (err.isAxiosError && !err.response)
                        )) ||
                        (err && typeof err.message === 'string' && /timeout|network|ENET|EAI_AGAIN|ECONN/i.test(err.message))
                    );
                    if (!isNetworkIssue) console.error(symbol, 'Snapshot fetch error:', err);
                    const jitter = Math.floor(Math.random() * (retryDelay / 2));
                    await new Promise(r => setTimeout(r, retryDelay + jitter));
                    retryDelay = Math.min(retryDelay * 2, RETRY_MAX);
                    continue;
                }
                if (snapshot.lastUpdateId < book.depthID) {
                    const jitter = Math.floor(Math.random() * (retryDelay / 2));
                    await new Promise(r => setTimeout(r, retryDelay + jitter));
                    retryDelay = Math.min(retryDelay * 2, RETRY_MAX);
                    continue;
                }
                break;
            }

            for (const [price, volume] of snapshot.asks) book.asks.set(+price, +volume);
            for (const [price, volume] of snapshot.bids) book.bids.set(+price, +volume);
            book.depthID = snapshot.lastUpdateId;

            for (let i = 0; i < events.length; i++) {
                const event = events[i];

                // console.log('Event ' + i, 'u: ' + event.u, 'U ' + event.U);

                if (event.u <= book.depthID) continue;
                if (event.U > (book.depthID + 1)) return ws.close(1001, 'OUT OF SYNC');

                if (event.a?.length)
                    for (const [price, volume] of event.a)
                        if (!+volume) book.asks.delete(+price);
                        else book.asks.set(+price, +volume);

                if (event.b?.length)
                    for (const [price, volume] of event.b)
                        if (!+volume) book.bids.delete(+price);
                        else book.bids.set(+price, +volume);

                book.depthID = event.u;
            }

            book.ready = true;
        });

        ws.on('message', buffer => {
            const data = JSON.parse(buffer).data;

            if (!book.ready) {
                if (events.length >= EVENTS_MAX) {
                    console.warn(streamID, 'buffer overflow, reconnecting');
                    return ws.close(1001, 'BUFFER_OVERFLOW');
                }
                return events.push(data);
            }

            if (data.u <= book.depthID) return;
            if (data.U > (book.depthID + 1)) return ws.close(1001, 'OUT OF SYNC');

            if (data.a?.length)
                for (const [price, volume] of data.a)
                    if (!+volume) book.asks.delete(+price);
                    else book.asks.set(+price, +volume);

            if (data.b?.length)
                for (const [price, volume] of data.b)
                    if (!+volume) book.bids.delete(+price);
                    else book.bids.set(+price, +volume);

            book.depthID = data.u;
        });

        ws.on('close', (code, reason) => {
            if (code === force) return; // manual stop
            const ignore = [1001]
            if (!ignore.includes(code)) console.error(streamID, 'CLOSED', code, reason);
            setTimeout(connect, 5000);
        });

        ws.on('error', err => console.error(streamID, 'ERROR', err));
    }

    connect();

    return streamID;
}

function unWatchOrderBook(streamID) {
    const stream = streams.get(streamID);

    if (!stream) return;

    stream.close(force);
    streams.delete(streamID);
}

export default { fetchSymbols, watchTickers, watchOrderBook, unWatchOrderBook };