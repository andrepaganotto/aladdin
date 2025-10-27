import axios from 'axios';
import WebSocket from 'ws';
import { findProperty } from '../utils.js';

const spotRestUrl = 'https://api.gateio.ws/api/v4/spot/currency_pairs';
const futureRestUrl = 'https://api.gateio.ws/api/v4/futures/usdt/contracts';

async function getSymbols() {
    try {

    }
    catch (error) {

    }
}

/*

    XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
    XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
    XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

*/

const spotWsUrl = 'wss://api.gateio.ws/ws/v4/';
const futureWsUrl = 'wss://fx-ws.gateio.ws/v4/ws/usdt';

const priceNeedle = Buffer.from('"price":"');
const symbolNeedleSpot = Buffer.from('"currency_pair":"');
const symbolNeedlefuture = Buffer.from('"contract":"');

function start(prices) {
    const spotSymbols = Object.keys(prices.spot);
    const futureSymbols = Object.keys(prices.future);

    function connect(streamUrl, market = 'spot') {
        const isSpot = market === 'spot';
        const symbolNeedle = isSpot ? symbolNeedleSpot : symbolNeedlefuture;

        const ws = new WebSocket(streamUrl);

        ws.once('open', () => {
            console.log(`Connected to Gate (${market}) WS`)

            ws.send(JSON.stringify({
                time: Math.floor(Date.now() / 1000),
                channel: `${isSpot ? 'spot' : 'futures'}.trades`,
                event: 'subscribe',
                payload: isSpot ? spotSymbols : futureSymbols
            }))
        });

        ws.once('message', firstData => {
            //We check the first incoming message after subscribing so we make sure the connection was successful or not, only listening if it was
            const data = JSON.parse(firstData.toString('utf-8'));

            if (data.error)
                return console.error(`Gate (${market}) WS error when SUBSCRIBING`, data.error.message || data.error);

            if (data.result?.status !== 'success')
                return console.error(`Gate (${market}) WS FAIL when SUBSCRIBING`, data);

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
        });

        ws.on('error', err => console.error(`Gate (${market}) WS error`, err));

        ws.once('close', (code, reason) => {
            console.error(`Gate (${market}) WS closed`, code, reason);
            setTimeout(() => connect(streamUrl, market), 5000);
        });
    }

    connect(spotWsUrl);
    connect(futureWsUrl, 'future');

    // setInterval(() => {
    //     // console.log(prices)
    //     console.log('GATE');
    //     console.log('SPOT:', Object.values(prices.spot).filter(s => s[0]).length);
    //     console.log('FUTURES:', Object.values(prices.future).filter(s => s[0]).length);
    // }, 1000);
}

export default { getSymbols, start };

//IMPORTANT: When we first connect to data streams we have no data snapshot, what means we have no data at all at first, and we need it o arrive
//but the thing is, that it doenst arrive all at once, the server will only send any update when something happen (in our case, a new trade), so sometimes
//we might stay for a long time without any new incoming data, and thats not our fault, its actually the crypto that is not having any trades at the time.
//Since most of the cryptos have a decent volume and most of the time trades are hapenning on them, most of our list will have data at the first minutes
//all a few cryptos will only have something after a lot of time

//IMPORTANT: When a symbol is delisted and we try to subscribe to a list of symbols in which this delisted symbol is inside, it will drop the whole
//connection without any advise

/**
    How to filter NON USABLE (future) symbols

    GET https://api.gateio.ws/api/v4/futures/usdt/contracts

    symbol.name = "CRYPTO_USDT"

    if symbol.status !== "trading"
    OR symbol.delisting_time exists
    
    ----------------------------------

    How to filter NON USABLE (spot) symbols

    GET https://api.gateio.ws/api/v4/spot/currency_pairs

    symbol.id = "CRYPTO_USDT"

    if symbol.trade_status !== "tradable"
    OR symbol.delisting_time exists
    OR symbol.quote !== "USDT"
 */