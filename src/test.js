import axios from 'axios';
import Gate from './exchanges/Gate.js';
import Binance from './exchanges/Binance.js';

(async () => {
    const symbols = await Gate.fetchSymbols();
    console.log(symbols);
})();

