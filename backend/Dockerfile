# 使用官方的 Node.js Alpine 镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 创建非 root 用户 (使用Alpine兼容的命令)
RUN addgroup -S appuser && adduser -S -G appuser appuser

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install --only=production

# 复制项目代码
COPY . .

# 设置目录权限
RUN chown -R appuser:appuser /app

# 切换到非 root 用户
USER appuser

# 暴露端口 3000
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]
