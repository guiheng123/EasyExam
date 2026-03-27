// 答题逻辑模块

import { $, MOTION_REDUCED } from '../utils/dom.js';
import { shuffleArray, renderMathInElement } from '../utils/helpers.js';
import { showAlert, showDangerConfirm } from '../components/Dialog.js';

// 答题状态
let questions = [];
let originalQuestions = [];
let userAnswers = [];
let currentIndex = 0;
let isReviewMode = false;
let quizStartTime = 0;

// 打乱单道题目的选项并更新正确答案字母
function shuffleQuestionOptions(q) {
    if (!q || !Array.isArray(q.options) || q.options.length === 0) return;
    const correctLetter = q.answer;
    const shuffled = q.options.map(o => ({ ...o }));
    shuffleArray(shuffled);
    for (let i = 0; i < shuffled.length; i++) {
        if (!shuffled[i]) continue;
        const wasCorrect = shuffled[i].letter === correctLetter;
        shuffled[i].letter = String.fromCharCode(65 + i);
        if (wasCorrect) q.answer = shuffled[i].letter;
    }
    q.options = shuffled;
}

// 开始答题
export function startQuiz(shuffleQuestions, shuffleOptions) {
    if (!Array.isArray(questions) || questions.length === 0) {
        showAlert('没有可用题目，请先导入题库', '⚠️');
        return false;
    }

    if (shuffleQuestions) shuffleArray(questions);
    if (shuffleOptions) questions.forEach(shuffleQuestionOptions);

    userAnswers = new Array(questions.length).fill(null);
    currentIndex = 0;
    isReviewMode = false;
    quizStartTime = Date.now();

    return true;
}

// 渲染当前题目
export function renderQuestion() {
    const q = questions[currentIndex];
    if (!q || !Array.isArray(q.options)) {
        console.warn('题目渲染失败：当前题目不存在或选项格式无效', { currentIndex, questionCount: questions.length });
        return false;
    }

    const progressText = $('progressText');
    const questionText = $('questionText');
    const container = $('optionsContainer');
    const analysisBox = $('analysisBox');
    const analysisContent = $('analysisContent');
    const prevBtn = $('prevBtn');
    const nextBtn = $('nextBtn');

    if (!progressText || !questionText || !container || !analysisBox || !analysisContent || !prevBtn || !nextBtn) {
        console.warn('题目渲染失败：缺少必要的 DOM 节点');
        return false;
    }

    const isLastQuestion = currentIndex === questions.length - 1;
    const answered = userAnswers[currentIndex] !== null;
    const userAnswer = userAnswers[currentIndex];

    progressText.textContent = `${currentIndex + 1}/${questions.length}`;
    questionText.textContent = q.question || '';
    renderMathInElement(questionText);

    const fragment = document.createDocumentFragment();

    for (const opt of q.options) {
        if (!opt) continue;

        const div = document.createElement('div');
        div.className = 'option-item';
        div.dataset.letter = opt.letter || '';
        div.textContent = `${opt.letter || ''}. ${opt.text || ''}`;
        renderMathInElement(div);

        if (answered || isReviewMode) {
            div.classList.add('disabled');
            if (opt.letter === q.answer) {
                div.classList.add('correct');
            } else if (opt.letter === userAnswer) {
                div.classList.add('wrong');
            }
        }
        fragment.appendChild(div);
    }

    container.replaceChildren(fragment);

    if ((answered || isReviewMode) && q.explanation) {
        analysisContent.textContent = q.explanation;
        renderMathInElement(analysisContent);
        analysisBox.style.display = 'block';
    } else {
        analysisContent.textContent = '';
        analysisBox.style.display = 'none';
    }

    prevBtn.style.visibility = currentIndex > 0 ? 'visible' : 'hidden';
    nextBtn.textContent = isLastQuestion
        ? (isReviewMode ? '返回结果' : '提交')
        : '下一题';

    return true;
}

// 选择答案
export function selectAnswer(letter) {
    const q = questions[currentIndex];
    if (!q || !Array.isArray(q.options)) return false;
    if (!q.options.some(opt => opt && opt.letter === letter)) return false;

    userAnswers[currentIndex] = letter;
    return renderQuestion();
}

// 上一题
export function prevQuestion() {
    if (currentIndex > 0) {
        currentIndex--;
        renderQuestion();
        return currentIndex;
    }
    return currentIndex;
}

// 下一题
export function nextQuestion() {
    if (isReviewMode) {
        if (currentIndex < questions.length - 1) {
            currentIndex++;
            renderQuestion();
            return { action: 'next', index: currentIndex };
        } else {
            return { action: 'result' };
        }
    }
    if (currentIndex < questions.length - 1) {
        currentIndex++;
        renderQuestion();
        return { action: 'next', index: currentIndex };
    } else {
        return { action: 'result' };
    }
}

// 格式化用时
function formatDuration(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    if (m > 0) return `${m}分${s}秒`;
    return `${s}秒`;
}

// 显示结果
export function showResult() {
    let correct = 0;
    let wrong = 0;
    userAnswers.forEach((a, i) => {
        if (a === questions[i].answer) correct++;
        else wrong++;
    });
    const total = questions.length;
    const pct = Math.round((correct / total) * 100);
    const elapsed = Date.now() - quizStartTime;

    // --- 环形进度 ---
    $('scoreVal').textContent = pct;

    const circle = $('scoreCircle');
    const circumference = 2 * Math.PI * 60;
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = circumference;
    circle.style.transform = 'rotate(-90deg)';
    circle.style.transformOrigin = '50% 50%';
    circle.style.transition = MOTION_REDUCED
        ? 'stroke-dashoffset 0.35s ease-out'
        : 'stroke-dashoffset 1s ease';
    const targetOffset = circumference - (circumference * pct / 100);

    // 根据正确率设置颜色
    if (pct >= 80) {
        circle.style.stroke = 'var(--correct-text)';
    } else if (pct >= 60) {
        circle.style.stroke = 'var(--primary-color)';
    } else {
        circle.style.stroke = 'var(--wrong-text)';
    }

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            circle.style.strokeDashoffset = targetOffset;
        });
    });

    // --- 统计卡片 ---
    const statCorrect = $('statCorrect');
    const statWrong = $('statWrong');
    const statTime = $('statTime');
    const statAccuracy = $('statAccuracy');
    if (statCorrect) statCorrect.textContent = correct;
    if (statWrong) statWrong.textContent = wrong;
    if (statTime) statTime.textContent = formatDuration(elapsed);
    if (statAccuracy) statAccuracy.textContent = pct + '%';

    // --- 评语 ---
    const commentEl = $('resultComment');
    if (commentEl) {
        let comment, emoji;
        if (pct === 100) { emoji = '🏆'; comment = '满分！完美表现！'; }
        else if (pct >= 90) { emoji = '🌟'; comment = '非常优秀，继续保持！'; }
        else if (pct >= 80) { emoji = '👍'; comment = '表现不错，再接再厉！'; }
        else if (pct >= 60) { emoji = '💪'; comment = '及格了，还有提升空间！'; }
        else { emoji = '📖'; comment = '需要加油，多多复习！'; }
        commentEl.textContent = `${emoji} ${comment}`;
    }

    // --- 题目网格 ---
    const grid = $('resultGrid');
    const fragment = document.createDocumentFragment();
    questions.forEach((q, i) => {
        const dot = document.createElement('div');
        dot.className = 'grid-dot ' + (userAnswers[i] === q.answer ? 'correct' : 'wrong');
        dot.dataset.index = String(i);
        dot.textContent = i + 1;
        fragment.appendChild(dot);
    });
    grid.replaceChildren(fragment);

    return pct;
}

// 回顾题目
export function reviewQuestion(idx) {
    if (!jumpToIndex(idx)) return currentIndex;
    isReviewMode = true;
    renderQuestion();
    return currentIndex;
}

// 确认退出
export async function confirmExit() {
    if (isReviewMode) {
        return { confirmed: true, isReview: true };
    }
    const confirmed = await showDangerConfirm('确定要退出答题吗？当前进度不会保存。');
    return { confirmed, isReview: false };
}

// 重置导入
export function resetImport() {
    questions = [];
    originalQuestions = [];
    userAnswers = [];
    currentIndex = 0;
    isReviewMode = false;
    quizStartTime = 0;
}

// 设置题目数据
export function setQuestions(newQuestions) {
    originalQuestions = newQuestions.map(q => ({
        question: q.question,
        options: q.options.map(opt => ({ letter: opt.letter, text: opt.text })),
        answer: q.answer,
        explanation: q.explanation || '',
        ...(q._bankIndex !== undefined ? { _bankIndex: q._bankIndex } : {})
    }));
    questions = newQuestions.map(q => ({
        question: q.question,
        options: q.options.map(opt => ({ letter: opt.letter, text: opt.text })),
        answer: q.answer,
        explanation: q.explanation || '',
        ...(q._bankIndex !== undefined ? { _bankIndex: q._bankIndex } : {})
    }));
}

// 获取当前题目
export function getCurrentQuestion() {
    return questions[currentIndex];
}

// 获取当前索引
export function getCurrentIndex() {
    return currentIndex;
}

// 获取所有题目
export function getQuestions() {
    return questions;
}

// 获取用户答案
export function getUserAnswers() {
    return userAnswers;
}

// 获取是否为回顾模式
export function getIsReviewMode() {
    return isReviewMode;
}

// 跳转到指定题目（不改变模式）
export function jumpToIndex(idx) {
    if (!Number.isInteger(idx)) return false;
    if (idx < 0 || idx >= questions.length) return false;
    currentIndex = idx;
    return true;
}

