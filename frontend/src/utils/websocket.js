class WebSocketClient {
    constructor(url) {
        this.url = url;
        this.connect();
    }

    connect() {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log('WebSocket 已连接');
            this.startHeartbeat();
        };

        this.ws.onmessage = (event) => {
            console.log('收到 WebSocket 消息:', event.data);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket 发生错误:', error);
        };

        this.ws.onclose = () => {
            console.warn('WebSocket 断开连接，尝试重连...');
            this.reconnect();
        };
    }

    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 10000);
    }

    reconnect() {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
            console.log('正在重连 WebSocket...');
            this.connect();
        }, 5000);
    }

    sendMessage(message) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket 未连接，无法发送消息');
        }
    }
}

const wsClient = new WebSocketClient('ws://localhost:3000');

export default wsClient;
