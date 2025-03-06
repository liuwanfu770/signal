# 使用官方的 Nginx 镜像作为基础镜像
FROM nginx:alpine

# 将当前目录的内容复制到 Nginx 的默认静态文件目录
COPY . /usr/share/nginx/html

# 暴露端口 80
EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
