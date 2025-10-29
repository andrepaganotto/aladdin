import { sync, book } from './book.js';
import { avgPrice } from './utils.js';

const avoidSymbols = ['TST'];

const targetSpread = 2;
const targetVolume = 500;

export default function (entries, data) {
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
                        sync(exchangeA, 'spot', symbol);
                        sync(exchangeB, 'future', symbol);
                    }
                }

                //We perform this calculation here so we dont have to perform the triple nested for loop again        
                const bookA = book.get(`${exchangeA}:spot:${symbol}`);
                const bookB = book.get(`${exchangeB}:future:${symbol}`);

                const pushTo = (map, val) => {
                    (map[symbol] ??= []).push(val);
                };

                if (bookA && bookB) {
                    const { bids: spotBids, asks: spotAsks } = bookA;
                    const { bids: futureBids, asks: futureAsks } = bookB;

                    {
                        const avgAskData = avgPrice(spotAsks, targetVolume);
                        const avgBidData = avgPrice(futureBids, targetVolume);

                        if (avgAskData && avgBidData) {
                            const [avgAsk, finalAskPrice, totalAskVolume] = avgAskData;
                            const [avgBid, finalBidPrice, totalBidVolume] = avgBidData;

                            const spread = +((1 - finalAskPrice / finalBidPrice) * 100).toFixed(2);

                            if (spread >= targetSpread)
                                pushTo(buy, {
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
                        const avgAskData = avgPrice(spotBids, targetVolume);
                        const avgBidData = avgPrice(futureAsks, targetVolume);

                        if (avgAskData && avgBidData) {
                            const [avgAsk, finalAskPrice, totalAskVolume] = avgAskData;
                            const [avgBid, finalBidPrice, totalBidVolume] = avgBidData;

                            const spread = +((1 - finalAskPrice / finalBidPrice) * 100).toFixed(2);

                            if (spread >= targetSpread)
                                pushTo(sell, {
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