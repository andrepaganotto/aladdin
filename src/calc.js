import { keepAlive, book } from './book.js';
import { avgPrice } from './utils.js';

const avoidSymbols = ['TST'];

const targetSpread = 1;
const targetVolume = 500;

/**
 * This function basically do 2 things:
 * - Uses the last price of the symbols to see if theres some opportunity happening, checking if the spread hits the target
 * - If the spread does hit our target, it then subscribe to that symbol's orderbook, keeping a connection to its data stream alive every minute
 * - If theres book data for that symbol on its spot and future exchange, the same loop calculates the available volume for that symbol
 * - If theres enough volume for that symbol and it does hit our target spread, we add it to the list of profit and stream it to the user frontend
 * 
 * In other words:
 * - Hey last price, tell me if there have been any probably profitable trade in the last moments
 * - If there was any trade that opens a spread, start listening to the book data to see if theres volume so we can profit
 * - If there is any enough volume to profit, tell the user so it can realize the profit
 * 
 * @param {*} entries 
 * @param {*} data 
 */
export default function (entries, data) {
    // console.clear();
    console.log('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');

    const buy = {};
    const sell = {};

    // [Binance, { CRYPTO: [Gate, Kucoin, Binance, ...] }]
    // exchangeA (spot data) with an object of cryptos each containing a list of exchanges which will be used to get futures data
    for (const [exchangeA, symbols] of entries) {

        // [CRYPTO, [Gate, Kucoin, Binance, ...]]
        for (const [symbol, exchanges] of symbols) {
            //Some symbols have the same name across exchanges but are completely different tokens, or we just want to ignore them lol
            if (avoidSymbols.includes(symbol)) continue;

            for (const exchangeB of exchanges) {
                const agio = data[exchangeA].spot[symbol] / data[exchangeB].future[symbol];
                //We make this check because we dont wait until all data is loaded (it would take an eternity since some symbols have almost no volume in a whole day)
                //and because of that, sometimes we will divide by 0, divide 0 by something and other invalid operations like that
                if (agio && agio !== Infinity) {
                    const spread = +Math.abs((agio - 1) * 100).toFixed(2);

                    if (spread >= targetSpread) {
                        keepAlive(exchangeA, 'spot', symbol);
                        keepAlive(exchangeB, 'future', symbol);
                    }
                }

                //We perform this calculation here so we dont have to perform the triple nested for loop again       
                const bookA = book.get(`${exchangeA}:spot:${symbol}`);
                const bookB = book.get(`${exchangeB}:future:${symbol}`);

                if (bookA?.bids?.size && bookA?.asks?.size && bookB?.bids?.size && bookB?.asks?.size) {
                    const { bids: spotBids, asks: spotAsks } = bookA;
                    const { bids: futureBids, asks: futureAsks } = bookB;

                    {
                        const avgAskData = avgPrice(spotAsks, 'asc', targetVolume);
                        const avgBidData = avgPrice(futureBids, 'desc', targetVolume);

                        if (avgAskData && avgBidData) {
                            const [avgAsk, finalAskPrice, totalAskVolume] = avgAskData;
                            const [avgBid, finalBidPrice, totalBidVolume] = avgBidData;

                            const spread = +((1 - finalAskPrice / finalBidPrice) * 100).toFixed(2);

                            if (spread >= targetSpread)
                                (buy[symbol] ??= []).push({
                                    buy_spot_on: exchangeA,
                                    spotAsk: finalAskPrice,
                                    sell_future_on: exchangeB,
                                    futureBid: finalBidPrice,
                                    spread: `${spread}%`,
                                    volume: Math.min(totalBidVolume, totalAskVolume),
                                    profit: `$ ${(targetVolume / avgAsk * avgBid - targetVolume).toFixed(2)}`
                                });
                        }
                    }

                    {
                        const avgBidData = avgPrice(spotBids, 'desc', targetVolume);
                        const avgAskData = avgPrice(futureAsks, 'asc', targetVolume);

                        if (avgAskData && avgBidData) {
                            const [avgAsk, finalAskPrice, totalAskVolume] = avgAskData;
                            const [avgBid, finalBidPrice, totalBidVolume] = avgBidData;

                            const spread = +((1 - finalAskPrice / finalBidPrice) * 100).toFixed(2);

                            if (spread >= targetSpread)
                                (sell[symbol] ??= []).push({
                                    sell_spot_on: exchangeA,
                                    spotBid: finalBidPrice,
                                    buy_future_on: exchangeB,
                                    futureAsk: finalAskPrice,
                                    spread: `${spread}%`,
                                    volume: Math.min(totalBidVolume, totalAskVolume),
                                    profit: `$ ${(targetVolume / avgAsk * avgBid - targetVolume).toFixed(2)}`
                                });
                        }
                    }
                }
            }
        }
    }

    console.log(`${'\x1b[32m'}COMPRA${'\x1b[0m'}`, buy)
    console.log(`${'\x1b[31m'}VENDA ${'\x1b[0m'}`, sell);
}

//when buy: exchangeA.asks & exchangeB.bids
//when sell: exchangeA.bids & exchangeB.asks