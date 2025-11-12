import operationRepository from './operationRepository.js';

export default async (side, symbol, volume, startTime) => {
    console.log(
        side === 'COMPRA' ? `${'\x1b[32m'}COMPRA${'\x1b[0m'}` : `${'\x1b[31m'}VENDA ${'\x1b[0m'}`,
        symbol,
        parseInt(volume),
        `> Durou: ${new Date(Date.now() - startTime).toISOString().slice(11, 19)}`
    );

    await operationRepository.setOperation({
        side,
        symbol,
        maxVolume: volume,
        duration: new Date(Date.now() - startTime).getSeconds()
    });
}