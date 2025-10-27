//This worker is responsible for starting all the exchanges streams, the exchange streams will set the shared array buffer values directly

import { parentPort, workerData } from 'worker_threads';

import Binance from './exchanges/Binance.js';
import Gate from './exchanges/Gate.js';

const setData = (ex, prefix) => ({
    spot: Object.fromEntries(Object.entries(workerData[ex].spot).map(([s, buf]) => [`${s}${prefix}`, buf])),
    future: Object.fromEntries(Object.entries(workerData[ex].future).map(([s, buf]) => [`${s}${prefix}`, buf]))
});

Binance.start(setData('Binance', 'USDT'));

Gate.start(setData('Gate', '_USDT'));

//TODO > start the other exchanges