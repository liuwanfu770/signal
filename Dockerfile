FROM bbernhard/signal-cli-rest-api:latest
RUN apt-get update && apt-get install -y curl jq
ENV MODE=json-rpc
ENV CORS_ALLOW_ORIGIN=*
EXPOSE 8080
VOLUME ["/home/.local/share/signal-cli"]
CMD ["./signal-cli-rest-api"]
