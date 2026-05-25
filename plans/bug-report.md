# EasyExam 项目 Bug 审查报告

> 审查时间: 2026-05-25
> 审查范围: docs/src/ 下全部 JS 模块、index.html、styles/

---

## 严重程度说明

| 等级 | 含义 |
|------|------|
| 🔴 高 | 会导致运行时崩溃、数据丢失或安全漏洞 |
| 🟡 中 | 功能异常或用户体验明显受损 |
| 🟢 低 | 代码质量问题、冗余代码或潜在隐患 |

---

## 🔴 高严重度

### Bug #1: `escapeHtml` 无法防御 HTML 属性注入（XSS 风险）

**文件**: [`escapeHtml()`](docs/src/utils/dom.js:8)

**问题**: [`escapeHtml()`](docs/src/utils/dom.js:8) 使用 `div.textContent → div.innerHTML` 技术转义 HTML。该方法会转义 `<`、`>`、`&`，但**不会转义双引号 `"`**。当转义后的字符串被插入到 HTML 属性（如 `value="..."`）中时，攻击者可注入属性值。

**影响位置**:
- [`ai.js:220`](docs/src/features/ai.js:220) — `promptConfigName()` 中 `value="${escapeHtml(defaultName)}"` — 如果配置名称包含 `"` 字符，可注入 `onfocus` 等事件处理器
- [`formatManager.js:153`](docs/src/features/formatManager.js:153) — 示例模态框中 `data-preset-id="${safePresetId}"`
- [`bankController.js:68`](docs/src/features/bankController.js:68) — 题目选择列表中 `data-index="${i}"`（此处为数字，无风险）
- [`questionBank.js:214-222`](docs/src/features/questionBank.js:214) — 题库卡片中多处 `data-bank-id="${bank.id}"`（此处为数字，无风险）

**复现条件**: 用户创建一个包含 `"` 字符的 AI 配置名称，然后重命名该配置时触发。

**修复建议**: 增加专门的属性转义函数，或在 `escapeHtml` 基础上额外替换 `"` → `"`、`'` → `'`：

```js
export function escapeAttr(value) {
    return escapeHtml(value)
        .replace(/"/g, '"')
        .replace(/'/g, ''');
}
```

---

### Bug #2: `ai.js:generateAIQuestions()` 未使用超时控制

**文件**: [`ai.js:651`](docs/src/features/ai.js:651)

**问题**: AI 出题的 `fetch` 调用直接使用原生 `fetch`，未使用 [`fetchWithTimeout()`](docs/src/utils/api.js:19)。如果 API 服务器无响应，请求将永远挂起，用户无法取消或得到反馈。

**对比**: [`aiChat.js:483`](docs/src/features/aiChat.js:483) 中的 AI 聊天请求正确使用了 `fetchWithTimeout(..., 30000)`；[`ai.js:383`](docs/src/features/ai.js:383) 中获取模型列表也使用了 `fetchWithTimeout(..., 12000)`。

**修复建议**:

```js
// ai.js:651 替换为
const response = await fetchWithTimeout(aiConfig.apiUrl, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.apiToken}`
    },
    body: JSON.stringify({ ... })
}, 120000); // 生成题目耗时较长，设为 120s
```

---

### Bug #3: `ai.js:testAPIConnection()` 未使用超时控制

**文件**: [`ai.js:504`](docs/src/features/ai.js:504)

**问题**: 与 Bug #2 类似，API 连接测试使用原生 `fetch`，无超时保护。

**修复建议**: 替换为 `fetchWithTimeout(apiUrl, { ... }, 15000)`.

---

## 🟡 中严重度

### Bug #4: `events.js` 与 `formatManager.js` 对 `presetList` 重复绑定 click 事件

**文件**:
- [`events.js:179-187`](docs/src/events.js:179)
- [`formatManager.js:85-93`](docs/src/features/formatManager.js:85)

**问题**: 预设列表 `#presetList` 被绑定了两个 click 事件处理器：
1. [`events.js:181`](docs/src/events.js:181) — 点击 `.preset-card` 时调用 `selectPreset(id)`
2. [`formatManager.js:85`](docs/src/features/formatManager.js:85) — 在 `renderPresets()` 中通过 `container.onclick` 绑定，先检查 `showExample` 按钮，再检查 `.preset-card` 调用 `selectPreset`

**影响**:
- 点击预设卡片时 `selectPreset` 被调用两次（无功能错误，但冗余）
- 点击"查看例题"按钮时，`events.js` 的处理器也会触发 `selectPreset`，导致查看例题时意外选中该预设

**修复建议**: 移除 [`events.js:179-187`](docs/src/events.js:179) 中的 `presetList` click 绑定，因为 `formatManager.js` 中的 `renderPresets()` 已通过事件委托处理了该逻辑。

---

### Bug #5: `events.js:331` 缺少 null 检查

**文件**: [`events.js:331`](docs/src/events.js:331)

**问题**:

```js
$('selectAllQuestions').checked = all.length === checked.length;
```

如果 `$('selectAllQuestions')` 返回 `null`（DOM 元素不存在），将抛出 `TypeError: Cannot set properties of null`。

**修复建议**:

```js
const selectAll = $('selectAllQuestions');
if (selectAll) selectAll.checked = all.length === checked.length;
```

---

### Bug #6: `questionBank.js` 使用 `Date.now()` 作为 ID 可能冲突

**文件**: [`questionBank.js:65`](docs/src/features/questionBank.js:65)

**问题**: 题库 ID 使用 `Date.now()` 生成。如果用户在极短时间内（同一毫秒内）创建多个题库，ID 会冲突导致数据覆盖。

**修复建议**: 使用更可靠的 ID 生成方式：

```js
id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
```

---

### Bug #7: `quiz.js` 中 `originalQuestions` 从未被使用（死代码）

**文件**: [`quiz.js:9`](docs/src/features/quiz.js:9), [`quiz.js:270-276`](docs/src/features/quiz.js:270)

**问题**: `originalQuestions` 在 `setQuestions()` 中被赋值，但整个模块中没有任何地方读取它。这看起来像是一个未完成的功能——在选项打乱后恢复原始顺序。

**影响**: 浪费内存（每道题的深拷贝），且如果将来需要"重置打乱"功能，当前的 `originalQuestions` 拷贝逻辑可能已过时。

**修复建议**: 如果不需要恢复功能，删除 `originalQuestions` 相关代码；如果需要，在 `startQuiz()` 中使用它来实现重置。

---

### Bug #8: `ai.js:saveAISettings()` 在每次按键时触发

**文件**: [`events.js:372-385`](docs/src/events.js:372)

**问题**: API URL、Token、Model 的 `input` 事件都会调用 `saveAISettings()`，该函数执行 `syncFormToActiveConfig()` + `JSON.stringify()` + `obfuscateToken()` + `localStorage.setItem()`。每次按键都会触发完整的序列化和存储操作。

**影响**: 频繁的 localStorage 写入可能导致性能问题，尤其是在 Token 较长时（每次都要 base64 编码 + 混淆）。

**修复建议**: 添加 debounce（防抖），延迟 300-500ms 后再保存。

---

### Bug #9: `aiChat.js:renderMarkdownToHtml()` 中代码块内的 HTML 被双重转义

**文件**: [`aiChat.js:208`](docs/src/features/aiChat.js:208)

**问题**: `renderMarkdownToHtml()` 首先对整个文本调用 `escapeHtml()`（第 208 行），然后在代码块中又原样输出（第 268 行 `codeBlockLines.push(line)`）。由于 `line` 已经被 `escapeHtml` 处理过，代码块中的 `<`、`>`、`&` 等字符会被转义为 `<`、`>`、`&`，这是正确的行为。

但 `formatInlineMarkdown()` 中的 `` `code` `` 匹配（第 186 行）会对已经转义的文本再做处理。例如原始文本 `` `a < b` `` 经过 `escapeHtml` 变成 `` `a < b` ``，然后 inline code 匹配后输出 `<code>a < b</code>`，这是正确的。

**结论**: 经仔细分析，此处逻辑正确，不是 bug。但 `formatInlineMarkdown` 中的正则对已转义文本的匹配可能在极端情况下产生意外结果，建议添加测试用例覆盖。

---

### Bug #10: `quizController.js:reviewQuestionAt()` 中冗余的面板切换

**文件**: [`quizController.js:163-171`](docs/src/features/quizController.js:163)

**问题**:

```js
export function reviewQuestionAt(idx) {
    reviewQuestion(idx);
    showView('quizView');
    activateAIChatSessionForQuestion(idx);
    const aiChatPanel = $('aiChatPanel');
    if (aiChatPanel?.classList.contains('active')) {
        toggleAIChatPanel(true);  // 面板已 active，再传 true 是 no-op
    }
}
```

`toggleAIChatPanel(true)` 在面板已激活时是无意义的操作（它只是确保面板打开）。

**修复建议**: 移除冗余的 `toggleAIChatPanel(true)` 调用，或改为直接调用 `renderAIChatSession()` 来刷新面板内容。

---

## 🟢 低严重度

### Bug #11: `events.js` 中 Tab 按钮绑定与 `viewManager.js` 重复

**文件**: [`events.js:157-162`](docs/src/events.js:157), [`events.js:164-169`](docs/src/events.js:164), [`events.js:171-176`](docs/src/events.js:171)

**问题**: `events.js` 为 `.tab-btn`、`.sub-tab-btn`、`.mode-btn` 分别绑定了 click 事件。但 [`index.html`](docs/index.html:26) 中这些按钮已有 `data-action="setTab"` 等属性，暗示可能存在基于 `data-action` 的事件委托机制。然而实际上没有统一的事件委托处理器，这些 `data-action` 属性只是语义标记。

**影响**: 不是 bug，但 `data-action` 属性未被使用，造成代码意图混淆。

---

### Bug #12: `aiChat.js:beginDrag()` 中重复调用 `e.preventDefault()`

**文件**: [`aiChat.js:704`](docs/src/features/aiChat.js:704) 和 [`aiChat.js:727`](docs/src/features/aiChat.js:727)

**问题**: `beginDrag()` 函数中 `e.preventDefault()` 被调用了两次（第 704 行和第 727 行）。

**修复建议**: 删除第 727 行的重复调用。

---

### Bug #13: `ai.js` 中 Prompt 文本框 `input` 事件过于频繁地保存

**文件**: [`events.js:417-425`](docs/src/events.js:417)

**问题**: AI 分析 Prompt 和出题 Prompt 的 `input` 事件都会调用 `saveCustomPrompts()`，每次按键都执行 `localStorage.setItem()`。

**影响**: 与 Bug #8 类似，性能影响较小但可优化。

**修复建议**: 添加 debounce。

---

### Bug #14: `storage.js:checkLocalStorageSpace()` 写入测试数据但计算方式不准确

**文件**: [`storage.js:65-89`](docs/src/core/storage.js:65)

**问题**: 该函数计算 `used` 时使用字符串 `length`（字符数），但 localStorage 的实际存储大小以 UTF-16 编码计算（每个字符 2 字节）。报告的 `usedKB` 实际上是字符数/1024，而非字节数/1024。

**修复建议**: 如果需要准确的空间报告，应将 `size` 乘以 2（UTF-16），或使用 `Blob` 来估算字节数：

```js
const bytes = new Blob(Object.keys(localStorage).map(k => k + localStorage.getItem(k))).size;
```

---

### Bug #15: `ai.js` Token 混淆使用随机 salt 但解混淆时不验证

**文件**: [`storage.js:4-28`](docs/src/core/storage.js:4)

**问题**: `obfuscateToken()` 每次生成随机 salt，`deobfuscateToken()` 只解码中间的 base64 部分，忽略 salt。这意味着同一个 token 每次保存后 localStorage 中的值都不同，无法通过比较存储值来判断 token 是否变化。

**影响**: 功能上正确（加解密一致性不受影响），但增加了不必要的存储差异，可能干扰调试和变更检测。

---

## 架构层面的观察（非 Bug）

### 观察 A: 模块职责边界模糊

[`events.js`](docs/src/events.js) 承担了所有 DOM 事件绑定，但部分事件处理逻辑也存在于 [`formatManager.js`](docs/src/features/formatManager.js:85) 和 [`aiChat.js`](docs/src/features/aiChat.js:658) 中（通过 `initAIAnalysisWidget()`）。这导致了 Bug #4 中的重复绑定问题。

### 观察 B: 回调注入模式增加耦合

多个模块通过 `setXxxCallback()` 模式注入回调（如 [`fileImport.js:17`](docs/src/features/fileImport.js:17)、[`ai.js:73`](docs/src/features/ai.js:73)、[`quizController.js:132`](docs/src/features/quizController.js:132)）。虽然这避免了循环依赖，但增加了模块间的隐式耦合，使得回调链难以追踪。

### 观察 C: 缺少统一的错误处理策略

部分模块使用 `try/catch` + `console.error`，部分使用 `showAlert` 弹窗，部分静默忽略错误。建议建立统一的错误处理中间件。

---

## 总结

| 严重度 | 数量 | 关键项 |
|--------|------|--------|
| 🔴 高 | 3 | XSS 属性注入、AI 请求无超时 |
| 🟡 中 | 7 | 重复事件绑定、null 引用、ID 冲突、死代码、性能 |
| 🟢 低 | 5 | 冗余调用、空间计算不精确、salt 验证 |

**优先修复建议**:
1. 修复 `escapeHtml` 的属性注入问题（Bug #1）
2. 为 AI 请求添加超时控制（Bug #2、#3）
3. 移除重复的事件绑定（Bug #4）
4. 添加 null 检查（Bug #5）
