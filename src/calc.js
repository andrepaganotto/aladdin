const a = {
    Binance: {
        BTC: ['Gate'],
        ETH: ['Kucoin'],
        XRP: ['Gate', 'Binance'],
        BNB: ['Binance', 'Gate']
    }
};

const green = '\x1b[32m';
const red = '\x1b[31m';
const reset = '\x1b[0m';

const target = 1.1;

export default function (entries, data) {
    console.clear();
    console.log('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
    console.log('XXXXXXXXXXXXXXXXXXXXXXXXXX      L U C R O      XXXXXXXXXXXXXXXXXXXXXXXXXX');
    console.log('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');

    const COMPRA = {};
    const VENDA = {};

    for (const [exchangeA, symbols] of entries) {

        for (const [symbol, exchanges] of symbols) {
            if (symbol === 'TST') continue;

            for (const exchangeB of exchanges) {
                const r = data[exchangeA].spot[symbol] / data[exchangeB].future[symbol];

                if (r !== Infinity && r !== 0) {
                    const spread = +Math.abs((r - 1) * 100).toFixed(2);

                    if (spread >= target)
                        if (r < 1)
                            if (COMPRA[symbol])
                                COMPRA[symbol].push(`( ${exchangeA} > ${exchangeB} ): ${spread}%`)
                            else
                                COMPRA[symbol] = [`( ${exchangeA} > ${exchangeB} ): ${spread}%`]
                        else
                            if (VENDA[symbol])
                                VENDA[symbol].push(`( ${exchangeA} > ${exchangeB} ): ${spread}%`)
                            else
                                VENDA[symbol] = [`( ${exchangeA} > ${exchangeB} ): ${spread}%`]
                }
            }
        }
    }

    console.log(`${green}COMPRA${reset}`, COMPRA)
    console.log(`${red}VENDA ${reset}`, VENDA);
}