# MarketTracker

AI 驱动的市场资讯分析终端，基于 Electron + React + Vite 构建。

[English](./README.md)

## 功能特性

- **RSS 信息流** — 订阅多个 RSS 源，自动抓取最新资讯
- **AI 摘要** — 抓取全文后自动生成摘要和要点
- **AI 分析** — 情绪分析（看涨/看跌/中性）、相关资产、推理过程
- **自定义分析** — 在设置中配置自定义 prompt，按需分析文章
- **标题翻译** — 英文标题自动翻译为中文（需配置 LLM）
- **深色/浅色主题** — 支持两种主题切换
- **中英文界面** — 支持中文和英文
- **自动更新** — 检测新版本并一键更新

## 下载

从 [Releases](https://github.com/modayishujia/MarketTracker/releases) 页面下载最新版本：

| 平台 | 格式 |
|------|------|
| macOS | `.dmg` |
| Windows | `.exe`（NSIS 安装包） |

每日自动构建版本（prerelease）也会发布在 Releases 页面。

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发
npm run dev

# 构建生产版本
npm run build

# 构建 macOS 安装包
npm run build:mac

# 构建 Windows 安装包
npm run build:win
```

## 配置

首次启动后，进入 **设置** 页面配置：

1. **AI 模型** — 填写 OpenAI 兼容的 API 地址、密钥和模型名称
2. **订阅源** — 默认已预置常用 RSS 源，可自行添加/删除
3. **通用设置** — 语言、主题、获取间隔、自动分析开关

## 技术栈

- **前端** — React 19 + TypeScript + Tailwind CSS + Zustand
- **桌面** — Electron 43 + electron-vite
- **数据库** — SQLite (better-sqlite3)，本地存储于 `userData` 目录，首次启动自动建表
- **AI** — OpenAI 兼容 API（支持任何兼容接口）

## 项目结构

```
MarketTracker/
├── electron/              # Electron 主进程
│   ├── db/                # 数据库操作
│   ├── ipc/               # IPC 处理器
│   ├── services/          # 业务服务（RSS、LLM、更新）
│   ├── main.ts            # 入口
│   └── preload.ts         # 预加载脚本
├── src/                   # React 前端
│   ├── components/        # 组件
│   ├── stores/            # Zustand 状态管理
│   ├── i18n/              # 国际化
│   └── pages/             # 页面
├── build/                 # 构建资源（图标等）
└── .github/workflows/     # CI/CD
```

## 许可证

MIT
