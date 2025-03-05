#!/bin/bash

# 监控容器状态
while true; do
    docker ps --filter "status=exited" --format "{{.Names}}" | while read container; do
        echo "重启容器: $container"
        docker restart $container
    done

    for port in $(seq 8080 8090); do
        status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/v1/health)
        if [ "$status" != "200" ]; then
            echo "Instance on port $port is down" | mail -s "Instance Failure" admin@example.com
        fi
    done

    sleep 60
done
