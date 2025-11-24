import app from './app.js';
import redis from './redis.js';
import wsServer from './wss.js';

import symbolsRepository from './symbols/symbolsRepository.js';
import operationRepository from './operations/operationsRepository.js';

import getMarkets from './markets.js';
import data from './data.js';

const port = parseInt(process.env.PORT);
const server = app.listen(port, () => console.log(`Server running on port: ${port}`));

export const wss = wsServer(server);

async function start() {
    try {
        await redis.connect();
        await operationRepository.createIndex();

        await operationRepository.getOperations();

        const markets = await getMarkets();

        data(markets);
    }
    catch (error) {
        console.error('Fail on server startup', error);
    }
}

start();