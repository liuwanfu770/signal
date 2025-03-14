FROM bbernhard/signal-cli-rest-api:latest

# 改为 apt-get（该镜像基于 Debian/Ubuntu）
RUN apt-get update \
    && apt-get install -y curl jq \
    && rm -rf /var/lib/apt/lists/*

# 创建非 root 用户（Debian/Ubuntu）
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Signal 数据目录
VOLUME ["/home/.local/share/signal-cli"]

EXPOSE 8080

CMD ["./signal-cli-rest-api"]
