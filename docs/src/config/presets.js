// 预设格式配置 - 题目解析的预设格式定义

export const PRESET_FORMATS = [
    {
        id: 'default',
        name: '标准格式',
        desc: '最常用的 Q:/A-D:/答案: 格式',
        example: `Q: 以下哪个是 Python 的特点？\nA: 编译型语言\nB: 解释型语言\nC: 汇编语言\nD: 机器语言\n答案: B\n解析: Python 是一种解释型、面向对象的高级编程语言\n---\nQ: HTTP 默认端口号是多少？\nA: 80\nB: 443\nC: 8080\nD: 3306\n答案: A\n解析: HTTP 默认使用 80 端口，HTTPS 使用 443 端口`,
        config: {
            questionMarkers: ['Q:', 'q:'],
            optionPattern: '^[A-Da-d][:\\uff1a]\\s*',
            answerMarkers: ['答案:', 'answer:', 'Answer:'],
            explanationMarkers: ['解析:', 'explain:', 'explanation:'],
            separators: ['---', '===']
        }
    },
    {
        id: 'numbered',
        name: '序号格式',
        desc: '使用数字编号的题目格式',
        example: `1. 计算机的核心部件是什么？\nA. 硬盘\nB. CPU\nC. 内存\nD. 显卡\n答案: B\n解析: CPU（中央处理器）是计算机的核心部件\n---\n2. 以下哪个是前端框架？\nA. Django\nB. Spring\nC. React\nD. Flask\n答案: C\n解析: React 是流行的前端 JavaScript 库`,
        config: {
            questionMarkers: [],
            questionPattern: '^\\d+[.、]\\s*',
            optionPattern: '^[A-Da-d][.、]\\s*',
            answerMarkers: ['答案:', '正确答案:'],
            explanationMarkers: ['解析:', '注:'],
            separators: ['---']
        }
    },
    {
        id: 'bracket',
        name: '括号格式',
        desc: '使用括号标记的格式',
        example: `【题目】数据库中主键的作用是什么？\n（A）提高查询速度\n（B）唯一标识记录\n（C）节省存储空间\n（D）加密数据\n【答案】B\n【解析】主键用于唯一标识表中的每一条记录\n---\n【题目】以下哪个不是面向对象的特性？\n（A）封装\n（B）继承\n（C）多态\n（D）编译\n【答案】D`,
        config: {
            questionMarkers: ['【题目】', '【题】'],
            optionPattern: '^[（(][A-Da-d][)）]\\s*',
            answerMarkers: ['【答案】', '【正确答案】'],
            explanationMarkers: ['【解析】', '【注释】'],
            separators: ['---', '===']
        }
    },
    {
        id: 'english',
        name: 'English Format',
        desc: 'Standard English question format',
        example: `Question: What does HTML stand for?\nA. Hyper Text Markup Language\nB. High Tech Modern Language\nC. Home Tool Markup Language\nD. Hyperlinks and Text Markup Language\nAnswer: A\nExplanation: HTML stands for Hyper Text Markup Language\n---\nQuestion: Which is a JavaScript framework?\nA. Laravel\nB. Django\nC. Vue.js\nD. Ruby on Rails\nAnswer: C\nExplanation: Vue.js is a progressive JavaScript framework`,
        config: {
            questionMarkers: ['Question:', 'Q:'],
            optionPattern: '^[A-D][.:]\\s*',
            answerMarkers: ['Answer:', 'Correct:'],
            explanationMarkers: ['Explanation:', 'Note:'],
            separators: ['---', '===']
        }
    },
    {
        id: 'chinese_simple',
        name: '简洁中文',
        desc: '题目不带标记，直接以文字开头',
        example: `什么是算法的时间复杂度？\nA、算法执行所需的时间\nB、算法占用的存储空间\nC、算法执行次数的数量级\nD、算法的代码行数\n答案: C\n解析: 时间复杂度描述算法执行次数随输入规模增长的趋势\n---\n栈的特点是什么？\nA、先进先出\nB、后进先出\nC、随机存取\nD、顺序存取\n答案: B`,
        config: {
            questionMarkers: [],
            optionPattern: '^[A-Da-d][.、:\\uff1a]\\s*',
            answerMarkers: ['答案:', '答:', 'answer:'],
            explanationMarkers: ['解析:', '注:', 'explain:'],
            separators: ['---', '===']
        }
    }
];
