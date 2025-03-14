const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const logger = require('./utils/logger');
const { checkWsLimit } = require('./middleware/rateLimit');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Map();

wss.on('connection', (ws, req) => {
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (checkWsLimit(clientIP)) {
        logger.warn(`WebSocket 连接过多，拒绝: ${clientIP}`);
        ws.close(1008, '连接频率过高，请稍后再试');
        return;
    }

    logger.info(`WebSocket 客户端连接: ${clientIP}`);
    ws.isAlive = true;
    clients.set(ws, { ip: clientIP });

    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on('message', (message) => {
        logger.info(`收到消息: ${message}`);
    });

    ws.on('close', () => {
        logger.warn(`WebSocket 断开: ${clientIP}`);
        clients.delete(ws);
    });

    ws.on('error', (error) => {
        logger.error(`WebSocket 错误: ${error.message}`);
    });
});

// 定期检查 WebSocket 连接状态
setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
            logger.warn(`WebSocket 连接断开，终止连接`);
            ws.terminate();
        } else {
            ws.isAlive = false;
            ws.ping();
        }
    });
}, 30000);

server.listen(3000, () => {
    logger.info('服务器运行在端口 3000');
});