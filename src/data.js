//This file is responsible for creating the prices array buffers that will hold the spot and future prices from the exchanges streams
//its also responsible for every second perform the necessary calculations.

import { Worker } from 'worker_threads';
import { createCalcMap } from './utils.js';
import calc from './calc.js';

import start from './worker.js';

const prices = {};

export default function (markets) {
    const exchanges = Object.keys(markets);

    for (const [exchange, { spot, future }] of Object.entries(markets)) {
        prices[exchange] = {
            spot: Object.fromEntries(spot.map(s => [s, new Float64Array(new SharedArrayBuffer(8))])),
            future: Object.fromEntries(future.map(s => [s, new Float64Array(new SharedArrayBuffer(8))])),
        }
    }
    start(prices);
    // const worker = new Worker('./src/worker.js', { workerData: prices });

    // setInterval(() => {
    //     for (const ex of ['Binance', 'Gate']) {
    //         console.log(prices[ex]);
    //     }
    // }, 10000);

    const entries = createCalcMap(markets);
    setInterval(() => calc(entries, prices), 1000);
}