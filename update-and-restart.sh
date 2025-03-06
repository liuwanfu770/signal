#!/bin/bash

# 进入项目目录
cd /Users/bc/signal-project/backend

# 安装依赖
npm install

# 重启 Docker 容器
docker-compose down
docker-compose up -d

echo "依赖安装完成，Docker 容器已重启。"
