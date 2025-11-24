import exchanges from "./exchanges/exchanges.js";

const markets = { Gate: { spot: [], future: [] } };

// fs.writeFileSync('./output.json', JSON.stringify((await operationRepository.getOperations()).map(({ side, symbol, maxVolume, start, end }) => ({ side, symbol, maxVolume, start, end })), null, 4));

export default async function () {
    // This returns all SPOT and FUTURE symbols
    const gateMarkets = await exchanges.Gate.fetchSymbols();

    // Only symbols that appears both on spot and futures
    const intersected = Object.keys(gateMarkets.spot).filter(s => Object.keys(gateMarkets.future).includes(s));

    markets.Gate.spot = intersected;
    markets.Gate.future = intersected;

    return markets;
}