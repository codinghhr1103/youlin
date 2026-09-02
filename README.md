# 邮邻 Youlin

给年轻集邮爱好者的收藏与社交网站：整理数字邮册、晒票、按缺品和复品匹配交换。

邮邻只做邻里式交换，**不做交易、不报行情、不评估票价**。现在是一个可运行的本地原型，也已能部署到公网，欢迎一起把它做得更像一个真正能用的小站。

仓库：[github.com/codinghhr1103/youlin](https://github.com/codinghhr1103/youlin)

## 目录

- [这是什么](#这是什么)
- [现在能做什么](#现在能做什么)
- [技术栈](#技术栈)
- [仓库结构](#仓库结构)
- [本地运行](#本地运行)
- [试玩账号](#试玩账号)
- [票图说明](#票图说明)
- [部署到 Render](#部署到-render)
- [如何参与](#如何参与)
- [适合接手的方向](#适合接手的方向)
- [已知限制](#已知限制)
- [许可](#许可)

## 这是什么

集邮圈子里，很多人手里有复品、也有一直缺的票，但缺少一个轻量、友善的碰面方式。邮邻想先把这件事做小、做清楚：

1. 把邮票放进自己的数字邮册（在册 / 想要 / 可换）
2. 晒一晒手里的票，让别人看见品相和故事
3. 系统按「你可换 × 对方想要」做匹配，再由双方发起、同意、完成交换

它面向愿意分享收藏、愿意用复品换缺品的年轻人，而不是拍卖行或行情站。

## 现在能做什么

- **注册 / 登录**：用户名加邮箱或手机号；登录可用用户名、邮箱或手机号。站点**不会发送**短信或邮件验证码。邮箱和手机号只对本人和管理员可见。
- **邮票目录**：链到 StampDIR、大众邮藏、WNS、Colnect 等外部目录，不自建世界票库。
- **集邮入门**：背胶、齿孔、大版小版、老纪特、编年等名词说明。
- **数字邮册**：把票标成在册、想要或可换，并写新/旧、品相备注。
- **晒票动态**：未登录可看；登录后可发帖、点喜欢，动态可关联一枚站内示例票。
- **交换匹配**：根据缺品和复品找出可能的交换对象，发起 / 同意 / 完成交换。
- **邮友主页**：看别人的简介和收藏；本人可编辑称呼、城市和简介。
- **管理后台**：管理员可查看用户（含联系方式）、停用或恢复账号。

页面大致包括首页、目录、入门、晒票、邮册、交换、票详情、个人资料、个人页，以及管理员看到的用户管理。

## 技术栈

刻意保持简单，方便在没有 Node 的机器上开发：

| 层 | 选择 |
| --- | --- |
| 后端 | Python 3.12、FastAPI、SQLAlchemy、SQLite |
| 前端 | 原生 HTML / CSS / JS（单页，无构建步骤） |
| 鉴权 | JWT（`pyjwt`） |
| 进程 | 一个 Uvicorn 进程同时提供 API 和静态页面 |

依赖见 `requirements.txt`。Python 版本见 `.python-version`（`3.12.8`）。

## 仓库结构

```
youlin/
├── app/                  # FastAPI 后端
│   ├── main.py           # 启动、静态页、路由挂载
│   ├── models.py         # 用户、邮票、邮册、动态、交换
│   ├── routers/          # /api 下的各功能
│   ├── seed.py           # 目录、试玩账号、管理员种子数据
│   └── settings.py       # 管理员相关环境变量
├── web/                  # 前端
│   ├── index.html
│   ├── css/style.css
│   ├── js/app.js         # 页面渲染与路由
│   └── stamps/           # 公有领域票图与 manifest
├── scripts/              # 从维基共享重新拉取票图
├── render.yaml           # Render Blueprint
├── LICENSE               # MIT
└── run.ps1               # Windows 一键启动
```

API 前缀是 `/api`。启动时会建表并写入种子数据，默认数据库在 `data/youlin.db`。

## 本地运行

需要 **Python 3.12**。

### Windows

在仓库根目录的 PowerShell 里：

```powershell
.\run.ps1
```

脚本会创建 `.venv`、用清华镜像安装依赖，然后在 http://127.0.0.1:8000 启动带热重载的服务。

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

打开 http://127.0.0.1:8000 即可。接口文档在 http://127.0.0.1:8000/docs。

管理员账号通过环境变量 `ADMIN_USERNAME`、`ADMIN_PASSWORD`、`ADMIN_EMAIL` 配置。**不要把真实密码写进仓库或提交到 Git。** 本地未设置 `ADMIN_PASSWORD` 时，开发默认口令是 `youlin-local-admin`，只适用于本机。

注册须填写邮箱或手机号作为联系方式，并勾选协议。

## 试玩账号

密码都是 `youlin123`：

| 用户名 | 显示名 | 城市 |
| --- | --- | --- |
| `fangcun` | 林方寸 | 杭州 |
| `achuo` | 阿戳 | 青岛 |
| `xiaofeng` | 小封 | 成都 |
| `miaopiao` | 喵票 | 上海 |

种子数据只在本地或新库首次写入时方便体验匹配与动态，不是正式用户。

## 票图说明

目录里的票图是 **1931 年以前发行的中国邮票** 扫描件，来自 [维基共享资源](https://commons.wikimedia.org/)，版权状态为公有领域或 CC0 / CC BY-SA。出处见 `web/stamps/manifest.json` 与各票详情页。

当代新中国生肖、特种邮票的原图仍受版权保护，所以没有放进仓库。事实性的志号、名称可以以后再补目录，但**不能直接转载票面**。

重新下载票图：

```powershell
python scripts/fetch_stamp_images.py
```

更细的说明见 [`web/stamps/README.md`](web/stamps/README.md)。

## 部署到 Render

仓库已包含 `render.yaml`。把代码推到 GitHub 后：

1. 打开 [Render Dashboard](https://dashboard.render.com)，用 GitHub 登录。
2. **New → Blueprint**，选中这个仓库。
3. 按提示创建服务 `youlin`（免费档、新加坡节点、自动生成 `SECRET_KEY`）。
4. 在 Render 控制台为 `ADMIN_USERNAME`、`ADMIN_EMAIL`、`ADMIN_PASSWORD` 填入你自己的值（Blueprint 不会把密码写进仓库）。**若曾经用过仓库里旧的示例口令，请立刻换成新密码。**
5. 等 Build 完成后访问 Render 给出的地址（名称被占用时会带后缀）。

也可以不走 Blueprint：**New → Web Service**，连接本仓库，然后填：

- Runtime：Python
- Build Command：`pip install -r requirements.txt`
- Start Command：`python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- 环境变量：`PYTHON_VERSION=3.12.8`，`SECRET_KEY` 填一段随机字符串，以及管理员相关变量

免费档一段时间没人访问会休眠，第一次打开可能要等几十秒。SQLite 在免费实例上会随重启丢失，下次启动会重新写入种子数据。

## 如何参与

非常欢迎加入。不论是修一个错字、补一枚公有领域票图、改一处交互，还是讨论产品方向，都有帮助。

### 开始之前

1. 先 [Watch / Star](https://github.com/codinghhr1103/youlin) 仓库，浏览 [Issues](https://github.com/codinghhr1103/youlin/issues)。
2. 较大的改动请先开 Issue 说明动机和大致方案，避免两个人做同一件事。
3. 本地按上面的步骤把站点跑起来，用试玩账号走一遍邮册、晒票和交换。

### 开发流程

1. Fork 本仓库，再克隆你的 Fork。
2. 从 `main` 拉一条分支，名称尽量说明意图，例如 `fix/login-error`、`feat/stamp-search`。
3. 在本地改、自己点一遍相关页面。前端改动请确认布局在常见宽度下还能看。
4. 不要提交 `.venv/`、`data/`、`.env`、数据库文件或真实密钥。
5. 推送到你的 Fork，向本仓库的 `main` 开 Pull Request。

PR 里请写清：

- 改了什么、为什么改
- 你是怎么验证的（例如：用 `fangcun` 登录，从邮册把某票标成可换，再看交换页）
- 若有截图或录屏，对 UI 改动特别有用

### 代码约定

- 跟现有风格走：后端是小型 FastAPI 路由 + Pydantic schema；前端是 `web/js/app.js` 里的原生渲染，暂时不引入 React / Vue / 打包器。
- 用户可见文案用简体中文。
- 新增 API 请同时考虑未登录、已登录、被停用账号这几种情况。
- 不要为了「完整目录」去加入受版权保护的当代票图。能补的是 1931 年以前、可核验授权的扫描件，并在 `manifest.json` 写清出处。

提交说明用中文或英文都可以，写成一句说得清的话即可，例如「修复交换匹配在空邮册时的报错」。

## 适合接手的方向

没有强制优先级，下面这些都适合第一次贡献：

- 无障碍与移动端排版：小屏幕上的导航、表单
- 空状态、错误提示写得更清楚
- 为关键 API 补测试（目前仓库里几乎还没有自动化测试）
- 文档：把某一步写得更不容易踩坑
- 讨论下一阶段：持久化数据库、用户自建藏品、更完整的交换流程等（请先开 Issue）

不确定从哪开始的话，直接开 Issue 自我介绍一下即可，可以说你更熟前端、后端还是集邮资料。

## 已知限制

- 这是原型，不是生产级服务：SQLite、单进程、免费托管会休眠。
- 没有邮件 / 短信，注册只校验格式，不验证联系方式是否真实持有。
- 前端无构建工具，所有页面逻辑都在 `web/js/app.js`，文件会随功能变长。
- 交换是站内状态机，不处理物流、验票或纠纷。
- 管理员能力目前只有用户列表和停用 / 恢复。

这些限制也是可以一起改进的方向，不必一次做完。

## 许可

票图的版权与出处见 [票图说明](#票图说明) 和 `web/stamps/manifest.json`。

代码以 [MIT License](LICENSE) 发布。提交代码即表示你同意维护者将贡献按同一许可证纳入本项目。
