import WebSocket, { WebSocketServer } from 'ws';

function onMessage(data) {
    try {
        const msg = JSON.parse(data);
        if (!msg || !msg.type) throw new Error('Invalid or no msg');
        console.log(msg);
    }
    catch (error) {
        console.log('Error on ws server onMessage', error);
    }
}

function onError(err) {
    console.error(`onError: ${err.message}`);
}

// mark connection alive whenever we get a pong
function heartbeat() {
    this.isAlive = true;
}

function onConnection(ws, req) {
    ws.isAlive = true;
    ws.on('pong', heartbeat);          // <-- listen for pong

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

    // simple ping loop
    const interval = setInterval(() => {
        wss.clients.forEach(ws => {
            if (!ws.isAlive) return ws.terminate(); // dead connection
            ws.isAlive = false;
            ws.ping();                              // triggers browser pong
        });
    }, 30000); // 30s

    wss.on('close', () => clearInterval(interval));

    return wss;
}
