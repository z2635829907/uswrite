# 拾光博客项目 — 对话总结

> 生成日期:2026-08-15。本文档用于在对话被压缩后快速恢复上下文,请先读这份文件。

## 一、项目概况

- 项目名:**拾光 Shiguang**(一个安静的文字社区/博客网站)
- 代码位置:`C:\tanchishe\shiguang`
- 前端:Next.js 15.5(App Router + Turbopack + Tailwind v4),**只负责界面**
- 后端:Spring Boot 3.4.5(Java 17 编译,本机 JDK 23)+ MyBatis-Plus + Spring Security(JWT)+ MySQL 8.0
- 数据:已从 SQLite 完整迁移到 MySQL(库名 `shiguang`)
- 大模型:阿里 Qwen(DashScope 兼容接口),已接入 RAG 智能问答

## 二、当前运行方式(两个服务都要开)

1. 后端:`cd C:\tanchishe\shiguang\backend` → `mvn spring-boot:run`(端口 8080)
   - Maven 位置:`C:\tools\apache-maven-3.9.9\bin\mvn.cmd`
   - 需要环境变量 `SPRING_LLM_API_KEY`(已存本机用户环境变量,勿入库)
2. 前端:`cd C:\tanchishe\shiguang` → `npm run dev`(端口 3000)
3. MySQL:本机服务 `MySQL80` 运行中,`root / 123456`,数据库 `shiguang`

## 三、账号与密钥

- 网站账号:admin / `Admin@2026`(管理员)、demo / `Demo@2026`(普通用户林禾);新用户可注册
- MySQL:root / `123456`
- 大模型:阿里 DashScope
  - base-url:`https://dashscope.aliyuncs.com/compatible-mode/v1`
  - 对话模型:`qwen3.7-max`;向量模型:`text-embedding-v3`(1024 维)
  - Key 存在用户环境变量 `SPRING_LLM_API_KEY`,配置在 `backend/src/main/resources/application.yml`(只存占位,不存 Key)
  - 用户曾把 Key 贴在聊天里,已提醒其可在阿里云控制台重置

## 四、技术架构(重要)

- Next.js 页面(Server Components)通过 `lib/queries.ts` 调 `lib/spring.ts` → HTTP 请求 Spring Boot 8080
- 所有 `app/api/**` 路由都是转发到后端的代理(保持原请求/响应格式)
- 登录:Spring 校验密码(BCrypt)并签发 JWT;Next.js 把 JWT 存进自己的会话 cookie(claim `t`)
- `lib/auth.ts` 的 `getSpringToken()` 从会话取后端 JWT;`getSessionUser()` 调后端 `/api/auth/me`
- 已删除 `lib/db.ts`,前端不再直接读 SQLite
- 后端接口统一返回 `{ok:true, ...}` / 错误 `{ok:false, error}`
- 后端包结构:`com.shiguang.blog`(controller / service / mapper / entity / dto / view / security / ai / common / config)

## 五、已实现功能(按时间顺序)

### 1. 早期 Next.js 已有功能(已全部迁移到 Java 后端)
登录注册(BCrypt+JWT)、文章发布/编辑/删除/搜索/排序、分类、标签、评论、点赞、收藏、通知、统计、推荐算法、后台文章审核/用户管理/评论管理、写文章编辑器、设置页。

### 2. 前端界面功能(保留原样)
- 分类模块:导航下拉 + `/categories` 总览 + 分类文章页;编辑器可选分类;后台按分类审核筛选
- 推荐模块 `/recommended`(点赞×3+评论×4+阅读×0.2+时间衰减)
- 首页"最新文章"5 秒换一批(16 篇文章 4 批轮换,淡入切换,批次圆点)
- 首页 hero 背景:图片轮播 → 视频 → **高清图片(书桌小熊)**;现在:**整页宽度、左对齐、无标题无按钮无遮罩**
- 音乐播放器:悬浮小球(默认左上、点击展开、可拖动、自动收起)+ 最新文章区下方长条播放器(实时歌词),共享单例播放引擎 `lib/use-music-engine.ts`(APlayer CDN)
- "大家正在写"标签区在"最新文章"下方

### 3. Spring Boot + MySQL 后端(已完成)
登录注册(BCrypt+JWT)、文章 CRUD/列表/搜索/分类/标签、评论、点赞、收藏、通知、统计、推荐、后台管理(审核/用户/评论),数据从 SQLite 迁移(7 用户、47 篇文章、13 赞、10 评论等)。

### 4. RAG 智能问答(已完成)
- 知识库:文章自动分块(约 400 字)+ 管理员可手动维护知识条目,均生成向量
- 检索:关键词(中文二元组/英文词)+ 向量余弦相似度(0.7/0.3)
- 生成:qwen3.7-max,仅依据站内资料回答;未配置 Key 时自动降级为检索摘要
- 前端:右下角悬浮球(支持历史记录)+ 导航"AI 助手"页 `/assistant`(毛玻璃渐变风格,Markdown 回答,参考文章链接)
- 后台"AI 知识库"页 `/admin/rag`:管理员增删改知识条目;普通用户只能问答
- 聊天记录:`chat_messages` 表,登录用户自动保存,页面/悬浮球可恢复,"清空记录"可清除

### 5. 首页主视觉背景(最近改动)
- 资源:`public/images/hero-desk-bear.jpg`(1920×1079,约 0.16MB,由用户 4K 图压缩)
- 组件:`components/hero-image-background.tsx`:整页宽、`background-position: left center`
- 当前状态:**只保留图片**,标题/按钮/遮罩都已移除
- 踩坑:hero 若限定 `max-w-6xl` 图片到不了页面边缘,必须让 section 整页宽

## 六、关键文件速查

- 首页:`app/page.tsx`
- 主视觉背景:`components/hero-image-background.tsx`
- AI 助手页:`app/assistant/page.tsx` + `components/assistant-page.tsx` + `components/assistant-markdown.tsx`
- 悬浮球:`components/assistant-widget.tsx`
- 后台知识库:`app/admin/rag/page.tsx` + `components/rag-entry-manager.tsx`
- 前端数据层:`lib/spring.ts`(HTTP 客户端)、`lib/queries.ts`(查询封装)、`lib/auth.ts`(会话)、`lib/errors.ts`
- 后端 RAG:`backend/src/main/java/com/shiguang/blog/ai/`(RAGService、LLMClient、ChatHistoryService、RagEntry、RagChunk、LLMProperties、RagInitializer)
- 后端主要接口:`controller/`(AuthController、PostController、AdminController、AssistantController、NotificationController、HomeController)
- 数据库脚本:`backend/sql/schema.sql`;迁移脚本:`scripts/migrate-mysql.mjs`、`scripts/seed-hot.mjs`
- 播放引擎:`lib/use-music-engine.ts`

## 七、Git 状态

- 远程仓库:https://gitee.com/zrx26358/codex_blog.git(分支 master)
- 最近提交:`0fac059`(首页主视觉只保留图片)
- 注意:`data/blog.db`(SQLite)不入库;`backend/sql/migrate.sql`、`cleanup.sql`、`server*.log`、`backend/target` 已 gitignore;LLM Key 不入库

## 八、踩坑与注意事项(以后再遇到直接查)

1. **JDK 23 + Lombok**:javac 不再自动发现 classpath 处理器,`backend/pom.xml` 里必须显式配置 `maven-compiler-plugin` 的 `annotationProcessorPaths`(lombok 1.18.38)
2. **MySQL 保留字 `read`**:`notifications.read` 字段在 DDL/实体里都要加反引号(`@TableField("`read`")`)
3. **PowerShell 管道中文乱码**:向 `node -` 或 curl 传中文时,先执行 `$OutputEncoding = [System.Text.Encoding]::UTF8`,否则中文变 `?`(测试时踩过)
4. **无 ffmpeg**:看视频元数据/截帧用无头 Chrome(CDP,`Page.captureScreenshot`)完成
5. **hero 对齐问题**:背景图对齐要看 section 是否整页宽,`max-w-6xl` 会把图片限制在中间
6. 后端重启后 RAG 会在启动时自动补索引;改了分块逻辑要手动 `DELETE FROM rag_chunks` 再重启强制重建

## 九、毕业设计背景(用户重要诉求)

- 用户:**大四软件工程**,基础一般,毕设题目已定:**"基于 Spring Boot 与 AI大模型 的博客社区系统的设计与实现"**
- 已沟通的规划:核心是博客社区(现已完成),AI 是加分模块(RAG 已做,写作补全/纠错待做),最后部署上线
- 用户最担心**答辩讲不清楚**(代码主要是 AI 写的)→ 需要:中文注释、架构/数据流说明、答辩高频问题+答案、模拟答辩
- 选题/评分已讨论:中上 80~88 稳,冲 90+ 靠工程规范(防注入、加密、JWT、日志)、文档、答辩表现
- 用户希望继续推进:**写作智能补全 + AI 纠错**(写文章页面),以及**部署上线**

## 十、下一步待办(用户可能随时要求)

1. **写作智能补全 + AI 纠错**:在写文章/编辑页接入 qwen3.7-max(补全下一句、错别字/标点/风格修正),可复用现有 LLMClient
2. **部署上线**:云服务器(学生机)+ JDK + MySQL + Nginx(或 Docker);可配域名/HTTPS
3. **答辩资料**:讲解文档 + 答辩题库(可逐步产出)
4. 可能继续微调首页主视觉(遮罩、高度、衔接过渡)或其它界面细节

---

*本文档为本机记录,未提交到 Gitee,防止内部说明(密码/环境)外泄。*
