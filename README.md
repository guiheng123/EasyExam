# 📝 极简答题系统 Pro

一个纯前端的在线答题系统，支持多种题目格式导入、AI 出题、题库管理和快捷键操作。无需后端，开箱即用。

> [!NOTE]
> 本项目代码由 AI 生成。

> **在线体验**：通过 GitHub Pages 部署 `docs/` 目录即可直接使用。

## ✨ 功能特性

- **多种导入方式** — 支持文件导入（`.txt` / `.json`）、文本粘贴、AI 出题、题库选择
- **灵活的格式解析** — 内置标准格式、序号格式、括号格式、英文格式等预设，也支持自定义正则解析
- **AI 出题 & 解析** — 接入 OpenAI 兼容 API，支持多配置管理、AI 对话和题目解析
- **题库管理** — 本地持久化存储题库，支持增删改查和答题状态追踪
- **答题模式** — 题目/选项随机打乱、实时计时、答题进度追踪、成绩回顾
- **快捷键系统** — 可自定义的键盘快捷键，支持数字键选择选项、方向键切换题目
- **数学公式渲染** — 集成 KaTeX，支持 LaTeX 数学公式显示
- **响应式设计** — 适配桌面端和移动端
- **数据安全** — API Token 本地混淆存储，所有数据保存在浏览器 localStorage

## 📁 项目结构

```
EasyExam/
├── docs/                    # 应用主目录（可直接部署）
│   ├── index.html           # 入口页面
│   ├── styles/              # 样式文件
│   │   ├── base.css         # 基础样式与变量
│   │   ├── components.css   # 组件样式
│   │   ├── quiz.css         # 答题页样式
│   │   ├── ai.css           # AI 功能样式
│   │   ├── questionBank.css # 题库样式
│   │   └── responsive.css   # 响应式适配
│   └── src/                 # JavaScript 模块
│       ├── main.js          # 应用入口
│       ├── events.js        # 事件绑定
│       ├── state.js         # 全局状态管理
│       ├── config/          # 配置
│       ├── core/            # 核心逻辑（解析、存储、数据处理）
│       ├── features/        # 功能模块（答题、AI、题库、快捷键等）
│       ├── components/      # UI 组件（弹窗、侧边栏等）
│       └── utils/           # 工具函数
├── LICENSE                  # MIT 许可证
└── README.md
```

## 🚀 使用方式

### 直接打开

项目为纯前端应用，无需构建。直接在浏览器中打开 `docs/index.html` 即可使用。

### GitHub Pages 部署

1. 将仓库推送到 GitHub
2. 进入仓库 Settings → Pages
3. Source 选择 `main` 分支，目录选择 `/docs`
4. 保存后即可通过 `https://<用户名>.github.io/EasyExam/` 访问

### 本地服务器（可选）

由于使用了 ES Modules，本地开发建议通过 HTTP 服务器访问：

```bash
# 使用 Python
cd docs && python -m http.server 8080

# 或使用 Node.js
npx serve docs
```

## 📖 题目格式示例

### 标准格式

```
Q: 以下哪个是 Python 的特点？
A: 编译型语言
B: 解释型语言
C: 汇编语言
D: 机器语言
答案: B
解析: Python 是一种解释型、面向对象的高级编程语言
---
Q: HTTP 默认端口号是多少？
A: 80
B: 443
C: 8080
D: 3306
答案: A
```

### 序号格式

```
1. 计算机的核心部件是什么？
A. 硬盘
B. CPU
C. 内存
D. 显卡
答案: B
```

### JSON 格式

```json
[
  {
    "question": "HTTP 默认端口号是多少？",
    "options": [
      { "letter": "A", "text": "80" },
      { "letter": "B", "text": "443" },
      { "letter": "C", "text": "8080" },
      { "letter": "D", "text": "3306" }
    ],
    "answer": "A",
    "explanation": "HTTP 默认使用 80 端口"
  }
]
```

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `1` / `2` / `3` / `4` | 选择选项 A / B / C / D |
| `←` / `→` | 上一题 / 下一题 |

快捷键可在设置中自定义。

## 🤖 AI 出题配置

支持任何 OpenAI 兼容的 API 接口：

1. 在首页点击设置图标
2. 填入 API 地址、Token 和模型名称
3. 支持多套配置切换
4. 配置完成后即可使用 AI 出题和 AI 解析功能

## 📄 许可证

[MIT License](LICENSE) © guiheng123
