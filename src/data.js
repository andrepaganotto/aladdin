//This file is responsible for creating the data array buffers that will hold the spot and future prices from the exchanges streams
//its also responsible for every second perform the necessary calculations.

import { Worker } from 'worker_threads';
import { createCalcMap } from './utils.js';
import calc from './calc.js';

const data = {};

export default function (markets) {
    const exchanges = Object.keys(markets);

    for (const [exchange, { spot, future }] of Object.entries(markets)) {
        data[exchange] = {
            spot: Object.fromEntries(spot.map(s => [s, new Float64Array(new SharedArrayBuffer(8))])),
            future: Object.fromEntries(future.map(s => [s, new Float64Array(new SharedArrayBuffer(8))])),
        }
    }

    const worker = new Worker('./src/worker.js', { workerData: data });

    // setInterval(() => {
    //     for (const ex of ['Binance', 'Gate']) {
    //         console.log(data[ex]);
    //     }
    // }, 10000);
    delete markets.Kucoin;
    const entries = createCalcMap(markets);
    setInterval(() => calc(entries, data), 1000);
}