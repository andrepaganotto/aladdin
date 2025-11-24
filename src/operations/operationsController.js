import { wss } from '../server.js';
import operationsRepository from './operationsRepository.js';

const testing = Boolean(process.env.TESTING);

async function reportOperation(side, symbol, volume, startTime) {
    console.log(
        side === 'COMPRA' ? `${'\x1b[32m'}COMPRA${'\x1b[0m'}` : `${'\x1b[31m'}VENDA ${'\x1b[0m'}`,
        symbol,
        parseInt(volume),
        `> Durou: ${new Date(Date.now() - startTime).toISOString().slice(11, 19)}`
    );

    const operation = {
        side,
        symbol,
        maxVolume: volume,
        start: startTime,
        end: Date.now()
    };

    wss.broadcast({ operation });

    if (!testing) await operationsRepository.setOperation(operation);
}

async function getOperations(req, res) {
    const since = req.query.since;

    const operations = await operationsRepository.getOperations(since);

    if (!operations) return res.status(500).json({ message: 'Failed to obtain operations from DB, check server console for details.' });

    res.json(operations);
}

export default { reportOperation, getOperations };