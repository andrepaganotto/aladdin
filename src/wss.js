import WebSocket, { WebSocketServer } from 'ws';

function onMessage(data) {
    try {
        const msg = JSON.parse(data);
        if (!msg || !msg.type) throw new Error('Invalid or no msg');
        console.log(msg);
        // if (msg.type === 'load') {
        //     this.send(JSON.stringify({
        //         type: 'load',
        //         lastErrors,
        //         automations,
        //         dolar: dolar.value
        //     }));
        // }
    }
    catch (error) {
        console.log('Error on ws server onMessage', error);
    }
}

function onError(err) {
    console.error(`onError: ${err.message}`);
}

function onConnection(ws, req) {
    ws.on('message', onMessage);
    ws.on('error', onError);
    console.log('onConnection');
}

function broadcast(message) {
    if (!this.clients) return;
    this.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

export default (server) => {
    const wss = new WebSocketServer({ server });

    wss.on('connection', onConnection);
    wss.broadcast = broadcast;
    console.log('Running WebSocket server');

    return wss;
}