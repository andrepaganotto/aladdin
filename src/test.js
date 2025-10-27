import WebSocket from 'ws';
import markets from './markets.js';

const symbols = markets.Binance.spot.map(m => `${m}USDT`);

const streams = symbols.map(symbol => `${symbol.toLowerCase()}@trade`);
const ws = new WebSocket('wss://stream.binance.com:9443/stream?streams=' + streams.join('/'));

const prices = Object.fromEntries(symbols.map(symbol => [symbol, new Float64Array(new SharedArrayBuffer(8))]))

const priceNeedle = Buffer.from('"p":"');
const symbolNeedle = Buffer.from('"s":"');

function findProperty(buffer, index, searchUntil, needle) {
    const start = index + needle.length;
    let i = start;
    while (++i < Math.min(start + searchUntil, buffer.length)) if (buffer[i] === 0x22) break;
    return buffer.subarray(start, i).toString('utf-8');
}

ws.on('message', buffer => {
    //Since we are dealing with crypto exchanges data streams, we will ALWAYS receive stringfied JSON, which means
    //we are always receiving a string, the raw data will be in bytes, but this bytes translates to a stringfied JSON object

    const priceIndex = buffer.indexOf(priceNeedle);
    if (priceIndex === -1) return; //if theres no price this data is useless, so we can return right after checking for its existance

    const symbolIndex = buffer.indexOf(symbolNeedle);
    if (symbolIndex === -1) return; //if theres no symbol data we wont know what symbol we are dealing with, so we can return also

    //we count up to 21 because its the byte length of a 10 digit number with 10 decimals places like '1234567890.1234567890' would have,
    //a price will NEVER be bigger than this number, it probably will never even get this long lol
    const symbol = findProperty(buffer, symbolIndex, buffer.length, symbolNeedle);
    prices[symbol][0] = +findProperty(buffer, priceIndex, 21, priceNeedle);
});

setInterval(() => console.log(prices), 1000);