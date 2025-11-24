import { createCalcMap } from './utils.js';
import calc from './calc.js';

import exchanges from './exchanges/exchanges.js';

const prices = {};

const setData = (ex, prefix) => ({
    spot: Object.fromEntries(Object.entries(prices[ex].spot).map(([s, buf]) => [`${s}${prefix}`, buf])),
    future: Object.fromEntries(Object.entries(prices[ex].future).map(([s, buf]) => [`${s}${prefix}`, buf]))
});

//This function is responsible for creating the prices array buffers that will hold the spot and future prices from the exchanges streams
//its also responsible for every second perform the necessary calculations.
export default function (markets) {
    /*  Here we create the prices object
        prices = {
            exchange: { 
                spot: { CRYPTO: [single float value] }, 
                future: { CRYPTO: [single float value] } 
            }
        }
    */
    for (const [exchange, { spot, future }] of Object.entries(markets)) {
        prices[exchange] = {
            spot: Object.fromEntries(spot.map(s => [s, new Float64Array(new SharedArrayBuffer(8))])),
            future: Object.fromEntries(future.map(s => [s, new Float64Array(new SharedArrayBuffer(8))])),
        }
    }

    // Here we give to each exchange exactly the same as the data inside prices[this exchange], but we change the crypto key names
    // to match the exchange API naming, since every crypto has just the BASE currency (e.g.: BTC and not BTC/USDT) we add the /USDT part
    // and this changes from exchange to exchange.
    exchanges.Gate.watchTickers(setData('Gate', '_USDT'));

    // Here we create an entries map to make the calculation faster ans easier, its made only once and do not have any reference to the float values
    // as the prices and the exchanges objects do, instead, it just guides on which data should be touched when making the calcuations. 
    // Check the function description for a better understanding.
    const entries = createCalcMap(markets);

    // Every second we calculate the agios and check for opportunities, we perfom the calculation every second because since we are dealing with
    // lots and lots of cryptos, the chance of any change happening in at least a considerable portion of the prices in a 1 second window is almost 100%
    setInterval(() => calc(entries, prices), 1000);
}