# 邮邻 Youlin

给年轻集邮爱好者的收藏与社交网站本地原型：整理数字邮册、晒票、按缺品和复品匹配交换。不做交易和行情。

## 技术

- 后端：Python 3.12 + FastAPI + SQLite
- 前端：原生 HTML / CSS / JS（本机没有 Node，所以不依赖前端构建工具）
- 一个进程同时提供 API 和网页

## 票图说明

目录里的票图是 **1931 年以前发行的中国邮票** 扫描件，来自 [维基共享资源](https://commons.wikimedia.org/)，版权状态为公有领域或 CC0 / CC BY-SA。出处见 `web/stamps/manifest.json` 与各票详情页。

当代新中国生肖、特种邮票的原图仍受版权保护，所以没有放进仓库。事实性的志号、名称可以以后再补目录，但不能直接转载票面。

## 本地运行

在 PowerShell 里进入本目录后执行：

```powershell
.\run.ps1
```

浏览器打开 http://127.0.0.1:8000

试玩账号（密码都是 `youlin123`）：

- `fangcun` 林方寸（杭州）
- `achuo` 阿戳（青岛）
- `xiaofeng` 小封（成都）
- `miaopiao` 喵票（上海）

## 部署到 Render

仓库已包含 `render.yaml`。把代码推到 GitHub 后：

1. 打开 [Render Dashboard](https://dashboard.render.com)，用 GitHub 登录。
2. **New → Blueprint**，选中这个仓库。
3. 按提示创建服务 `youlin`（免费档、新加坡节点、自动生成 `SECRET_KEY`）。
4. 等 Build 完成后，访问 `https://youlin.onrender.com`（若名称被占用，Render 会给你一个带后缀的地址）。

也可以不走 Blueprint：**New → Web Service**，连接本仓库，然后填：

- Runtime：Python
- Build Command：`pip install -r requirements.txt`
- Start Command：`python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- 环境变量：`PYTHON_VERSION=3.12.8`，`SECRET_KEY` 填一段随机字符串

免费档一段时间没人访问会休眠，第一次打开可能要等几十秒。SQLite 在免费实例上会随重启丢失，下次启动会重新写入种子数据。

## 第一版功能

- 注册 / 登录
- 邮票目录（搜索、专题筛选）
- 数字邮册：在册 / 想要 / 可换
- 晒票动态与喜欢
- 缺品 × 复品匹配，发起 / 同意 / 完成交换
- 邮友主页

种子数据会在第一次启动时写入数据库（默认 `data/youlin.db`）。
