import redis from '../redis.js';
import { Schema, Repository, EntityId } from "redis-om";

const schema = new Schema('operations', {
    side: { type: 'string' },
    symbol: { type: 'string' },
    maxVolume: { type: 'number' },
    start: { type: 'number' },
    end: { type: 'number' }
});

const repository = new Repository(schema, redis);

const createIndex = () => repository.createIndex();

async function setOperation(data) {
    try {
        const symbol = await repository.save(data);
        return symbol;
    }
    catch (error) {
        console.error('Failed to SET operation in database', error);
        return false;
    }
}

async function getOperations() {
    try {
        const operations = await repository.search().returnAll();
        return operations;
    }
    catch (error) {
        console.error('Failed to GET operations from database', error);
        return false;
    }
}


export default { createIndex, setOperation, getOperations };