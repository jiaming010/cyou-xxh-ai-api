# 部署指南

## 快速开始

```bash
# 构建镜像
docker build -t cyou-new-api:latest .

# 使用 SQLite 一键启动
docker compose -f docker-compose.sqlite.yml up -d
```

启动后访问 `http://localhost:3000`，使用默认管理员账号登录：

| 项目 | 值 |
|------|------|
| 用户名 | `root` |
| 密码 | `123456` |

> **重要**：首次登录后请立即修改默认密码。

---

## 本地开发部署（SQLite 模式）

适用于本地开发调试、功能验证、演示等场景。无需安装 MySQL、Redis 等外部依赖。

### 前提条件

- [Docker](https://docs.docker.com/get-docker/) >= 20.10
- [Docker Compose](https://docs.docker.com/compose/install/) V2（`docker compose` 命令）

### 步骤

#### 1. 构建镜像

```bash
docker build -t cyou-new-api:latest .
```

> 首次构建需要下载依赖，耗时较长（约 5-10 分钟），后续构建有缓存会快很多。

#### 2. 启动服务

```bash
docker compose -f docker-compose.sqlite.yml up -d
```

#### 3. 验证服务

```bash
# 检查容器状态
docker ps -f name=cyou-new-api-dev

# 查看健康检查
docker inspect --format='{{.State.Health.Status}}' cyou-new-api-dev

# 手动验证 API
curl http://localhost:3000/api/status
```

### 数据持久化

| 目录 | 用途 |
|------|------|
| `./data/new-api.db` | SQLite 数据库文件（所有业务数据） |
| `./logs/` | 应用运行日志 |

数据会持久化到宿主机的 `./data` 和 `./logs` 目录，删除容器不会丢失数据。

### 常用操作

```bash
# 查看实时日志
docker logs -f cyou-new-api-dev

# 重启服务
docker compose -f docker-compose.sqlite.yml restart

# 停止服务
docker compose -f docker-compose.sqlite.yml down

# 停止并删除数据卷（谨慎！会清除数据）
docker compose -f docker-compose.sqlite.yml down -v

# 备份数据库
cp ./data/new-api.db ./data/new-api.db.bak.$(date +%Y%m%d%H%M%S)
```

### 自定义配置

如需修改端口或其他配置，直接编辑 `docker-compose.sqlite.yml` 中的 `environment` 和 `ports` 部分，或创建一个 `.env.local` 文件：

```yaml
# docker-compose.sqlite.yml 示例：修改端口为 8080
ports:
  - "8080:3000"
```

---

## 生产服务器部署（MySQL + Redis 模式）

适用于生产环境，推荐使用 MySQL/PostgreSQL 作为主数据库、Redis 作为缓存。

### 推荐架构

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Nginx      │────▶│   new-api    │────▶│    MySQL     │
│  (反向代理)   │     │  :3000       │     │   :3306      │
│  HTTPS:443   │     │              │────▶│    Redis     │
└──────────────┘     └──────────────┘     │   :6379      │
                                          └──────────────┘
```

### 步骤

#### 1. 准备配置文件

复制并编辑环境变量文件：

```bash
cp .env.example .env
```

编辑 `.env`，填入实际的数据库和 Redis 连接信息：

```env
# 主数据库
DB_HOST=your-mysql-host
DB_PORT=3306
DB_USER=new_api
DB_PASSWORD=your-strong-password
DB_NAME=new_api
SQL_DSN=${DB_USER}:${DB_PASSWORD}@tcp(${DB_HOST}:${DB_PORT})/${DB_NAME}?charset=utf8mb4&parseTime=True&loc=Local

# 日志数据库（可与主库相同，也可独立）
LOG_DB_HOST=your-mysql-host
LOG_DB_PORT=3306
LOG_DB_USER=new_api_log
LOG_DB_PASSWORD=your-strong-password
LOG_DB_NAME=new_api_log
LOG_SQL_DSN=${LOG_DB_USER}:${LOG_DB_PASSWORD}@tcp(${LOG_DB_HOST}:${LOG_DB_PORT})/${LOG_DB_NAME}?charset=utf8mb4&parseTime=True&loc=Local

# Redis
REDIS_CONN_STRING=redis://:your-redis-password@your-redis-host:6379/0

# 安全配置（务必修改）
SESSION_SECRET=your-random-secret-string-at-least-32-chars
```

#### 2. 构建并启动

```bash
# 构建镜像
docker build -t cyou-new-api:latest .

# 使用生产配置启动
docker compose up -d
```

#### 3. 配置反向代理（Nginx 示例）

```nginx
server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE / 流式响应支持
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }
}

server {
    listen 80;
    server_name api.example.com;
    return 301 https://$server_name$request_uri;
}
```

### 安全建议

1. **修改默认密码** — 首次登录后立即修改 `root` 用户密码
2. **设置 SESSION_SECRET** — 在 `.env` 中设置一个随机的长字符串
3. **启用 HTTPS** — 通过 Nginx 等反向代理配置 SSL 证书
4. **限制数据库访问** — MySQL 和 Redis 仅允许内网访问
5. **定期备份** — 设置自动备份策略

### 数据备份与恢复

#### MySQL 备份

```bash
# 备份
mysqldump -h your-mysql-host -u new_api -p new_api > backup_$(date +%Y%m%d).sql
mysqldump -h your-mysql-host -u new_api_log -p new_api_log > backup_log_$(date +%Y%m%d).sql

# 恢复
mysql -h your-mysql-host -u new_api -p new_api < backup_20250101.sql
```

#### 定时备份（crontab）

```bash
# 每天凌晨 3 点自动备份
0 3 * * * mysqldump -h your-mysql-host -u new_api -p'password' new_api | gzip > /backup/new_api_$(date +\%Y\%m\%d).sql.gz
```

---

## 离线部署（导出镜像 tar 包传送到服务器）

适用于目标服务器无法访问外网 / Docker Hub，或需要将本地构建好的镜像迁移到内网服务器的场景。

### 流程概览

```
本地构建镜像 → 导出为 .tar 文件 → 传输到服务器 → 服务器导入镜像 → 启动服务
```

---

### 第一步：本地构建镜像

```bash
docker build -t cyou-new-api:latest .
```

构建完成后确认镜像存在：

```bash
docker images cyou-new-api
```

---

### 第二步：导出镜像为 tar 文件

```bash
# 导出单个镜像（推荐，文件名含版本号方便管理）
docker save -o cyou-new-api-latest.tar cyou-new-api:latest

# 或使用 gzip 压缩以减小体积（约可压缩 40-60%）
docker save cyou-new-api:latest | gzip > cyou-new-api-latest.tar.gz
```

> 导出完成后可用 `ls -lh cyou-new-api-latest.tar` 查看文件大小。

---

### 第三步：将 tar 文件传输到服务器

#### 方式一：使用 `scp`（推荐）

```bash
# 基本用法
scp cyou-new-api-latest.tar user@192.168.1.100:/home/user/

# 压缩包同理
scp cyou-new-api-latest.tar.gz user@192.168.1.100:/home/user/

# 指定 SSH 端口（如非默认 22）
scp -P 2222 cyou-new-api-latest.tar user@192.168.1.100:/home/user/
```

#### 方式二：使用 `rsync`（支持断点续传，适合大文件）

```bash
rsync -avz --progress cyou-new-api-latest.tar.gz user@192.168.1.100:/home/user/
```

#### 方式三：Windows 本地传输（使用 WinSCP 或 PowerShell）

```powershell
# PowerShell + OpenSSH（Windows 10/11 自带）
scp cyou-new-api-latest.tar user@192.168.1.100:/home/user/
```

---

### 第四步：服务器端导入镜像

SSH 登录服务器后执行：

```bash
# 导入普通 tar
docker load -i /home/user/cyou-new-api-latest.tar

# 导入 gzip 压缩包
docker load -i /home/user/cyou-new-api-latest.tar.gz
# 或
gunzip -c cyou-new-api-latest.tar.gz | docker load
```

导入成功后验证镜像：

```bash
docker images cyou-new-api
```

输出示例：
```
REPOSITORY      TAG       IMAGE ID       CREATED        SIZE
cyou-new-api    latest    a1b2c3d4e5f6   2 hours ago    150MB
```

---

### 第五步：在服务器上启动服务

将项目配置文件也传输到服务器（如果还没有的话）：

```bash
# 本地执行：传输配置文件
scp docker-compose.yml docker-compose.sqlite.yml .env.example user@192.168.1.100:/opt/cyou-new-api/
```

服务器上启动：

```bash
cd /opt/cyou-new-api

# SQLite 模式（快速启动）
docker compose -f docker-compose.sqlite.yml up -d

# 或生产模式（需先配置 .env）
cp .env.example .env
# 编辑 .env 填入数据库等配置
docker compose up -d
```

---

### 常用辅助命令

```bash
# 查看所有本地镜像
docker images

# 删除旧的导出文件（服务器磁盘空间不足时）
rm cyou-new-api-latest.tar.gz

# 给镜像打标签（多版本管理）
docker tag cyou-new-api:latest cyou-new-api:v1.0.0
docker save -o cyou-new-api-v1.0.0.tar cyou-new-api:v1.0.0

# 同时导出多个镜像到一个 tar（如需同时迁移多个服务）
docker save -o all-images.tar cyou-new-api:latest nginx:alpine
```

---

## 环境变量参考

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | 服务监听端口 |
| `TZ` | - | 时区，如 `Asia/Shanghai` |
| `SQL_DSN` | - | MySQL/PostgreSQL 连接串，不设置则使用 SQLite |
| `LOG_SQL_DSN` | - | 日志数据库连接串，不设置则与主库共用 |
| `SQLITE_PATH` | `one-api.db` | SQLite 数据库文件路径 |
| `REDIS_CONN_STRING` | - | Redis 连接串，不设置则使用内存缓存 |
| `MEMORY_CACHE_ENABLED` | `false` | 是否启用内存缓存（无 Redis 时建议开启） |
| `SESSION_SECRET` | - | 会话密钥，生产环境务必设置 |
| `BATCH_UPDATE_ENABLED` | `false` | 是否启用批量更新 |
| `ERROR_LOG_ENABLED` | `false` | 是否启用错误日志 |
| `SYNC_FREQUENCY` | `60` | 数据同步频率（秒） |
| `RELAY_TIMEOUT` | `0` | 请求超时（秒），0 表示不限制 |
| `STREAMING_TIMEOUT` | `300` | 流式响应无数据超时（秒） |
| `FRONTEND_BASE_URL` | - | 前端基础 URL |
| `NODE_TYPE` | - | 节点类型，主节点设为 `master` |
