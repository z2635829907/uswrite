# uswrite · 一个安静的文字社区

中文博客社区,**四服务架构**:Next.js 前端 + Spring Boot 业务后端 + 独立 Python(FastAPI + LangChain)AI 助手 + MySQL。

支持用户注册登录、文章发布与随时编辑、点赞收藏、评论互动、站内通知、管理员后台的内容审核与用户管理;并内置一个基于 RAG(检索增强生成)的站内 AI 助手,可以就站内文章进行问答并给出引用来源。

## 架构总览

```
浏览器
  │
  ▼
Next.js 15 (3000)  ── 页面 SSR + API 转发代理
  │
  ├──► Spring Boot (8080)   业务 API:文章 / 用户 / 评论 / 通知 / 管理
  │       └── 依赖 MySQL (3306)
  │
  └──► FastAPI + LangChain (8000)   AI 助手:对话 / SSE 流式 / RAG 检索
          └── 依赖 MySQL (3306) 与 Spring 共享同一张库
```

- **前后端分流**:AI 助手从 Spring Boot 中拆分为独立 Python 服务。前端 `lib/assistant.ts` 把 assistant / admin-rag 流量按 `ASSISTANT_API_URL`(默认 `http://localhost:8000`)转发到 Python;其余业务流量走 Spring。
- **鉴权互认**:Spring 签发 JWT(HMAC,实际按密钥长度自动选 HS384),Python 服务用同一 secret 验签,实现匿名 / 登录 / 管理员三级权限互通。
- **共享数据库**:AI 服务与业务后端共用 MySQL(库名 `shiguang`),`rag_chunks` / `rag_entries` 两张表存放知识库分块与向量。
- Spring 端原 AI 代码(`backend/.../ai/`)保留为**可回滚**方案,前端已不再调用。

## 快速开始

四个服务都要起来,启动顺序:**数据库 → 后端 → AI 助手 → 前端**。

```bash
# 1) 数据库(MySQL 8.0,库名 shiguang)
#    确保 MySQL80 服务 Running,3306 在监听

# 2) 业务后端(Spring Boot,8080)
cd backend
mvn spring-boot:run

# 3) AI 助手(FastAPI + LangChain,8000)
cd ai-service
cp .env.example .env         # 填入 LLM / Embedding 的 API Key
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# 4) 前端(Next.js,3000)
npm install
npm run dev                  # 访问 http://localhost:3000
```

生产模式:

```bash
npm run build && npm run start
```

## 演示账号

| 角色 | 用户名 | 密码 |
| --- | --- | --- |
| 管理员 | `admin` | `Admin@2026` |
| 普通用户 | `demo` | `Demo@2026` |

## 功能清单

### 公开区域
- 首页:全屏英雄区、热门标签、最新文章、社区真实数据
- 文章列表:最新 / 热门排序、关键词搜索、分页
- 文章详情:Markdown 渲染、阅读时长、浏览量、相关文章、文章目录
- 标签聚合页、分类页、作者主页(文章、简介、获赞统计)
- 浅色 / 深色模式(跟随系统,可手动切换)

### 用户中心
- 注册 / 登录 / 退出(JWT 会话)
- 写作编辑器:标题、标签、封面关键词、摘要、正文,支持写作 / 预览切换
- 草稿保存、提交审核、审核状态可见、驳回原因提示
- 文章随时编辑、删除
- 点赞 / 收藏,收藏页
- 评论文章、删除评论;站内通知(点赞、评论、审核结果)
- 个人资料设置、修改密码

### AI 助手(`/assistant`)
- 就站内文章问答,回答带 `[n]` 编号引用,并列出命中的来源文章与片段
- SSE 流式输出,逐字返回
- 多轮追问(检索前做 query 改写,补全指代,提升多轮命中)
- 未配置 LLM Key 时自动降级为关键词摘要回答,不阻断服务

### 管理员后台(`/admin`)
- 仪表盘:用户、文章、待审核、评论统计
- 帖子审核:通过 / 驳回(填写原因),按状态筛选
- 用户管理:搜索、设为 / 取消管理员、禁用 / 解禁
- 评论管理:隐藏 / 恢复显示
- 知识库管理:维护 AI 助手的知识条目(`rag_entries`)

## AI 助手与 RAG 实现

检索链路(核心在 `ai-service/app/rag.py`):

1. **分块**:按 Markdown 标题切分,单块目标 600 字(上限 1200),块首带标题作上下文。
2. **双路召回**:
   - **BM25**(关键词):jieba 分词 + TF/IDF + 文档长度归一(`k1=1.5, b=0.75`)。
   - **语义向量**:`text-embedding-v3`(1024 维)余弦相似度。
3. **RRF 融合**:Reciprocal Rank Fusion(`k=60`)按排名而非分数融合两路结果,避开不同量纲直接加权的问题;取 top 6。
4. **查询改写**:多轮对话时,先用 LLM 把追问改写成独立完整的问题再检索。
5. **生成**:LangChain `ChatOpenAI` 流式生成,系统提示约束"只依据资料回答 + 标注 `[n]`"。
6. **降级**:无向量 / 无 LLM 时逐级退化为纯 BM25 或关键词摘要。

**索引同步**(`ai-service/app/indexer.py`):启动时全量增量建索引,之后每 15 分钟巡检一次;文章审核状态变化、内容更新都会重建对应分块。

**评测**(`ai-service/eval/`):内置 40 条问答数据集(关键词型 22 / 语义型 18),对比 `bm25` / `weighted`(旧线性加权)/ `rrf` 三种策略的完整检索指标——**Hit@k、Recall@k、Precision@k、MRR、NDCG@k、MAP@k**。运行 `python eval/eval.py` 得逐条明细,`python eval/report.py` 生成可视化报告 `report.html`。当前 RRF 策略:Hit@5 **97.5%**、Recall@5 **96.6%**、MRR **0.943**;语义型命中率由纯 BM25 的 77.8% 提升至 94.4%。完整指标对比表见 [`ai-service/eval/README.md`](ai-service/eval/README.md)。

## 技术栈

**前端**
- Next.js 15(App Router + Turbopack)+ TypeScript
- Tailwind CSS v4 + Motion(动效)+ Phosphor Icons
- jose(JWT 会话)+ zod(输入校验)+ react-markdown(文章渲染)

**业务后端**
- Spring Boot 3.4.5 + MyBatis-Plus + Spring Security
- JWT(HMAC/HS 家族)鉴权,统一响应结构 `{ok:true,...}` / `{ok:false,error}`

**AI 助手**
- FastAPI + Uvicorn + LangChain
- numpy 风格的纯 Python 向量计算(jieba 分词、BM25、RRF)
- PyJWT(与 Spring 互认)+ pymysql / SQLAlchemy

**存储与模型**
- MySQL 8.0(库名 `shiguang`)
- 对话模型:阿里通义 `qwen3.8-flash`(DashScope OpenAI 兼容端点)
- 向量模型:`text-embedding-v3`(1024 维)

## 环境变量

**前端** —— `.env.local`:

```env
ASSISTANT_API_URL=http://localhost:8000   # AI 服务地址,缺省即此值
SPRING_API_URL=http://localhost:8080      # 业务后端地址
# AUTH_SECRET=<随机字符串>
```

**AI 助手** —— `ai-service/.env`(模板见 `.env.example`,勿提交真实 Key):

```env
LLM_API_KEY=<DashScope API Key>
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_MODEL=qwen3.8-flash

EMBEDDING_API_KEY=<同一把 Key 或独立 Key>
EMBEDDING_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
EMBEDDING_MODEL=text-embedding-v3

JWT_SECRET=<必须与 Spring 端 app.jwt.secret 一致>
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=<你的密码>
DB_NAME=shiguang
```

## 目录结构

```
app/                  页面与 API 路由(API 路由均为转发代理)
components/           共享组件(布局、卡片、编辑器、AI 助手面板、宠物等)
lib/                  数据层与工具(spring.ts 调业务后端、assistant.ts 调 AI 服务)
backend/              Spring Boot 业务后端(Maven 项目)
  └ src/main/java/com/shiguang/blog/
      ├ controller/   接口层
      ├ service/      业务逻辑
      ├ ai/           原 Java 版 AI 助手(保留,可回滚)
      └ ...
ai-service/           Python AI 助手服务
  ├ app/              main / config / db / auth / llm / rag / indexer / routers
  └ eval/             检索评测数据集与脚本
scripts/              种子数据与测试脚本
data/                 本地数据(已 gitignore)
```

## 备注

- 文章封面当前使用 Picsum 种子图作为兜底方案,可后续接入图片生成能力替换。
- 管理后台属于数据密集界面,采用克制的表格化设计,未套用营销页规范。
