import redis from '../redis.js';
import { Schema, Repository, EntityId } from "redis-om";

export const operations_cache = [];

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
        const operation = await repository.save(data);
        operations_cache.push(operation);
        return operation;
    }
    catch (error) {
        console.error('Failed to SET operation in database', error);
        return false;
    }
}

async function getOperations(since) {
    try {
        if (!operations_cache.length) {
            const operations = await repository.search().returnAll();
            operations_cache.push(...operations);
        }

        const newOperations = await repository
            .search()
            .where('end')
            .is.greaterThan(operations_cache[operations_cache.length - 1].end)
            .returnAll();

        operations_cache.push(...newOperations);

        return since ? operations_cache.filter(op => op.end > since) : operations_cache;
    }
    catch (error) {
        console.error('Failed to GET operations from database', error);
        return false;
    }
}


export default { createIndex, setOperation, getOperations };