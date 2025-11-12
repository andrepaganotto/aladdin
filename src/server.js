import redis from './redis.js';
import symbolsRepository from './symbols/symbolsRepository.js';
import operationRepository from './operations/operationRepository.js';

// import markets from './markets.js';
import data from './data.js';
import Gate from './exchanges/Gate.js';

const markets = { Gate: { spot: [], future: [] } };

async function start() {
    await redis.connect();
    await operationRepository.createIndex();

    const gateMarkets = await Gate.fetchSymbols();
    // console.log(gateMarkets);

    const intersected = Object.keys(gateMarkets.spot).filter(s => Object.keys(gateMarkets.future).includes(s));
    // console.log(intersected);

    markets.Gate.spot = intersected;
    markets.Gate.future = intersected;

    // console.log('SPOT', Object.keys(gateMarkets.spot).length, Object.keys(gateMarkets.spotDelisting).length);
    // console.log('FUTURE', Object.keys(gateMarkets.future).length, Object.keys(gateMarkets.futureDelisting).length);

    data(markets);
}

start();