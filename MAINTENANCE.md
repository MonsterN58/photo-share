# PhotoShare 维护手册

## 目录
1. [项目概览](#1-项目概览)
2. [环境要求](#2-环境要求)
3. [首次部署](#3-首次部署)
4. [日常启动与重启](#4-日常启动与重启)
5. [代码更新流程](#5-代码更新流程)
6. [配置说明（.env.local）](#6-配置说明envlocal)
7. [存储模式切换](#7-存储模式切换)
8. [数据库维护](#8-数据库维护)
9. [日志与故障排查](#9-日志与故障排查)
10. [服务器 SSH 维护](#10-服务器-ssh-维护)

---

## 1. 项目概览

| 项目 | 值 |
|------|----|
| 框架 | Next.js 16 (App Router) |
| 运行时 | Node.js |
| 数据库 | SQLite（本地）/ Supabase（远程，需配合 GitHub 存储） |
| 图片存储 | 本地磁盘 / Gitee / GitHub |
| 服务器 IP | 152.42.222.12 |
| 默认端口 | 3000 |

---

## 2. 环境要求

```
Node.js >= 18
npm >= 9
```

验证版本：
```powershell
node -v
npm -v
```

---

## 3. 首次部署

```powershell
# 1. 进入项目目录
cd "d:\AIcode项目\盐选\photo-share"

# 2. 安装依赖
npm install

# 3. 配置环境变量（复制示例文件，再编辑）
# 若已有 .env.local 则跳过此步
Copy-Item .env.local.example .env.local   # 如不存在示例文件，手动创建
# 按第 6 节说明填写 .env.local

# 4. 构建生产包
npm run build

# 5. 启动
npm run start
```

---

## 4. 日常启动与重启

### 开发模式（含热更新）

```powershell
cd "d:\AIcode项目\盐选\photo-share"

# 方式 A：一键启动脚本（自动检测端口冲突、检查环境变量）
npm run dev:oneclick
# 或直接：
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1

# 方式 B：指定端口
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1 -Port 3001

# 方式 C：跳过 npm install 检查（依赖无变化时更快）
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1 -SkipInstall
```

### 生产模式

```powershell
cd "d:\AIcode项目\盐选\photo-share"
npm run build     # 先构建
npm run start     # 再启动
```

### 重启（生产）

```powershell
# 停止旧进程（找到占用 3000 端口的进程并结束）
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000 -State Listen).OwningProcess | Stop-Process -Force

# 重新构建并启动
npm run build
npm run start
```

### 仅重启不重新构建（配置变更后）

```powershell
# 停止旧进程
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000 -State Listen).OwningProcess | Stop-Process -Force

# 直接启动（使用上次构建产物）
npm run start
```

> **注意**：修改 `.env.local` 后必须重启服务才能生效。修改代码后必须重新 `npm run build`。

---

## 5. 代码更新流程

```powershell
cd "d:\AIcode项目\盐选\photo-share"

# 1. 拉取最新代码
git pull

# 2. 更新依赖（若 package.json 有变化）
npm install

# 3. 重新构建
npm run build

# 4. 重启服务
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force
npm run start
```

---

## 6. 配置说明（.env.local）

文件路径：`photo-share/.env.local`

```ini
# ── 数据库模式 ──────────────────────────────────────
DATABASE_MODE=local        # local：SQLite本地文件
                           # remote：Supabase（仅在 STORAGE_MODE=github 时有效）

LOCAL_DATABASE_PATH=data/photoshare.sqlite
# 实际生成的文件名为 photoshare-{storage_mode}.sqlite
# 例如：photoshare-local.sqlite / photoshare-gitee.sqlite

# ── 存储模式 ──────────────────────────────────────
STORAGE_MODE=local         # local：存本机 public/uploads/
                           # gitee：上传到 Gitee 仓库
                           # github：上传到 GitHub 仓库

# ── Supabase（DATABASE_MODE=remote 时必填）──────────
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...

# ── Gitee（STORAGE_MODE=gitee 时必填）──────────────
GITEE_TOKEN=
GITEE_REPO_OWNER=
GITEE_REPO_NAME=
GITEE_REPO_BRANCH=master
GITEE_IMAGE_DIR=uploads

# ── GitHub（STORAGE_MODE=github 时必填）────────────
GITHUB_TOKEN=github_pat_...
GITHUB_REPO_OWNER=
GITHUB_REPO_NAME=
GITHUB_REPO_BRANCH=master
GITHUB_IMAGE_DIR=uploads
GITHUB_IMAGE_CDN=jsdelivr   # 使用 jsDelivr CDN 加速访问

# ── 其他功能 ─────────────────────────────────────
NEXT_PUBLIC_ANTI_SCREENSHOT_ENABLED=false   # true：开启防截图模糊
```

> **安全提醒**：`.env.local` 含有 Token，不要提交到 Git 仓库。确认 `.gitignore` 中已包含 `.env.local`。

---

## 7. 存储模式切换

### 切换步骤

1. 修改 `.env.local` 中的 `STORAGE_MODE`
2. 重启服务（见第 4 节）

### 各模式对应的数据库文件

| STORAGE_MODE | 数据库文件 |
|---|---|
| `local` | `data/photoshare-local.sqlite` |
| `gitee` | `data/photoshare-gitee.sqlite` |
| `github` | `data/photoshare-github.sqlite` |

不同存储模式使用**独立的数据库文件**，切换后历史数据不互通。

### 本地存储的图片位置

```
photo-share/public/uploads/YYYY/文件名
```

---

## 8. 数据库维护

### 查看数据库文件

```powershell
Get-ChildItem "d:\AIcode项目\盐选\photo-share\data"
```

### 备份数据库

```powershell
$date = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item "d:\AIcode项目\盐选\photo-share\data\photoshare-local.sqlite" `
          "d:\AIcode项目\盐选\photo-share\data\backup_$date.sqlite"
```

### 还原数据库

```powershell
# 先停止服务，再替换文件，再重启
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000 -State Listen).OwningProcess -Force
Copy-Item "d:\AIcode项目\盐选\photo-share\data\backup_20260419_120000.sqlite" `
          "d:\AIcode项目\盐选\photo-share\data\photoshare-local.sqlite"
npm run start
```

### WAL 文件说明

`data/` 目录下的 `.sqlite-shm` 和 `.sqlite-wal` 是 SQLite WAL 模式的辅助文件，正常运行时会自动管理，**不要单独删除**。

---

## 9. 日志与故障排查

### 查看运行日志

开发模式下日志直接输出在终端。生产模式建议用 PM2 托管：

```powershell
# 安装 PM2（一次性）
npm install -g pm2

# 用 PM2 启动
cd "d:\AIcode项目\盐选\photo-share"
pm2 start "npm run start" --name photo-share

# 查看日志
pm2 logs photo-share

# 重启
pm2 restart photo-share

# 开机自启
pm2 startup
pm2 save
```

### 常见问题

| 现象 | 原因 | 解决方法 |
|------|------|---------|
| 端口被占用 | 上次进程未退出 | `Get-NetTCPConnection -LocalPort 3000` 找到 PID 后 `Stop-Process` |
| 图片上传失败 | Token 过期或仓库配置错误 | 检查 `.env.local` 中的 Token，重新生成 |
| 数据库锁定错误 | 多进程同时访问 SQLite | 确保只有一个 Node 进程运行 |
| 环境变量不生效 | 未重启 / 格式错误 | 检查 `.env.local` 无多余空格，重启服务 |
| 构建报错 | 依赖缺失 | 先运行 `npm install` 再构建 |

### 检查服务是否在运行

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
# 有结果 = 服务运行中；无结果 = 服务已停止
```

---

## 10. 服务器 SSH 维护

服务器 IP：`152.42.222.12`，系统：Ubuntu

### SSH 密钥路径

```
私钥：d:\AIcode项目\盐选\id_ed25519
公钥：d:\AIcode项目\盐选\id_ed25519.pub
```

### 连接命令

```powershell
ssh -i "d:\AIcode项目\盐选\id_ed25519" root@152.42.222.12
```

### 若无法连接，通过 VPS 控制台执行以下步骤

```bash
# 1. 检查并启动 SSH 服务
systemctl status ssh
systemctl start ssh
systemctl enable ssh

# 2. 检查防火墙
ufw status
ufw allow 22/tcp    # 若防火墙 active，放行 SSH

# 3. 添加公钥（首次或公钥丢失时）
mkdir -p ~/.ssh
cat >> ~/.ssh/authorized_keys << 'EOF'
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPnxd3k15+b+bY43nvZ79jLVnLANAXojyeYFKVR/Qlf5 秦东杰@MonsterN
EOF
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### 上传代码到服务器

```powershell
# 上传整个项目（排除 node_modules 和数据库）
scp -i "d:\AIcode项目\盐选\id_ed25519" -r `
    "d:\AIcode项目\盐选\photo-share" `
    root@152.42.222.12:/opt/photo-share

# 仅同步代码变更（推荐）
rsync -avz --exclude node_modules --exclude data --exclude .next `
    -e "ssh -i d:\AIcode项目\盐选\id_ed25519" `
    "d:\AIcode项目\盐选\photo-share/" `
    root@152.42.222.12:/opt/photo-share/
```

### 服务器上的重启流程

```bash
cd /opt/photo-share

# 安装依赖 & 构建
npm install
npm run build

# 用 PM2 重启
pm2 restart photo-share
# 或首次启动
pm2 start "npm run start" --name photo-share
```
