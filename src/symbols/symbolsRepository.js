import redis from '../redis.js';
import { Schema, Repository, EntityId } from "redis-om";

import exchanges from '../exchanges/exchanges.js';

const schemaTemplate = Object.fromEntries(Object.keys(exchanges).map(ex => [ex, { type: 'string' }]));
const symbolSchema = new Schema('symbol', schemaTemplate);

const repository = new Repository(symbolSchema, redis);

const createIndex = () => repository.createIndex();

async function setSymbol(id, data) {
    try {
        const symbol = await repository.save(id, data);

        return symbol;
    }
    catch (error) {
        console.error('Failed to SET symbol in database', error);
        return false;
    }
}

async function getSymbol(symbol) {
    try {
        symbol = await repository.fetch(symbol);

        if (!Object.keys(symbol).length) return false;

        return symbol;
    }
    catch (error) {
        console.error('Failed to GET symbol from database', error);
        return false;
    }
}

async function getSymbols(exchangeToFilter = false) {
    try {
        const symbols = await repository.search().returnAll();

        if (exchangeToFilter) return symbols.filter(s => s[exchangeToFilter]);

        return symbols;
    }
    catch (error) {
        console.error('Failed to GET symbols from database', error);
        return false;
    }
}

async function deleteSymbol(symbol) {
    try {
        symbol = await getSymbol(symbol);

        if (!symbol) return false;

        await repository.remove(symbol[EntityId]);

        return true;
    }
    catch (error) {
        console.error('Failed to DELETE symbol from database', error);
        return false;
    }
}

export default { createIndex, setSymbol, getSymbol, getSymbols, deleteSymbol };