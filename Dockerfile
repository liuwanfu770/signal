FROM bbernhard/signal-cli-rest-api:latest

# 确保使用正确的包管理工具
RUN apk add --no-cache shadow curl jq

# 创建非 root 用户
RUN groupadd -r appuser && useradd -r -g appuser appuser

# 设置环境变量
ENV MODE=json-rpc
ENV CORS_ALLOW_ORIGIN=*

# 暴露端口
EXPOSE 8080

# 挂载 Signal 数据目录
VOLUME ["/home/.local/share/signal-cli"]

# 启动服务
CMD ["./signal-cli-rest-api"]