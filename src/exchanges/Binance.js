import WebSocket from 'ws';
import { findProperty } from '../utils.js';

const spotUrl = 'wss://stream.binance.com:9443/stream?streams=';
const futureUrl = 'wss://fstream.binance.com/stream?streams=';

const priceNeedle = Buffer.from('"p":"');
const symbolNeedle = Buffer.from('"s":"');

function start(prices) {
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

export default { start };

//IMPORTANT: Binance doesnt give a shit if you send a non existing or delisted symbol on the stream,
//it simply ignores it and keeps sending the data to all other valid streams

/**
    How to filter NON USABLE (spot) symbols

    THE LIST IS INSIDE symbols (data.symbols)

    GET https://api.binance.com/api/v3/exchangeInfo?permissions=SPOT

    symbol.symbol = "CRYPTOUSDT"

    symbol.baseAsset = "CRYPTO"

    if the symbol is not present on the list
    OR symbol.status !== "TRADING"
    OR symbol.quoteAsset !== "USDT"
    
    ----------------------------------

    How to filter NON USABLE (future) symbols

    GET https://fapi.binance.com/fapi/v1/exchangeInfo

    symbol.symbol = "CRYPTOUSDT"

    symbol.baseAsset = "CRYPTO"

    if symbol.status !== "TRADING"
    OR symbol.contractType !== "PERPETUAL"
    OR symbol.quoteAsset !== "USDT"
    OR symbol.marginAsset !== "USDT"
 */