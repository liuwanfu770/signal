#!/bin/bash

# 初始化 Signal 账号
curl -X POST http://localhost:3000/v1/register -H "Content-Type: application/json" -d '{"phone_number": "+1234567890"}'
