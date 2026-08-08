import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, "blog.db"));
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  avatar_seed TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','banned')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  cover_seed TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','approved','rejected')),
  rejection_reason TEXT NOT NULL DEFAULT '',
  views INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER
);
CREATE TABLE IF NOT EXISTS likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, post_id)
);
CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, post_id)
);
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden')),
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('like','comment','review','system')),
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
`);

const countRow = db.prepare("SELECT COUNT(*) AS n FROM users").get();
if (countRow.n > 0) {
  console.log("数据库已有数据，跳过种子写入。");
  db.close();
  process.exit(0);
}

const now = Date.now();
const day = 24 * 60 * 60 * 1000;

const insertUser = db.prepare(`
  INSERT INTO users (username, email, password_hash, display_name, bio, website, avatar_seed, role, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
`);

const adminHash = await bcrypt.hash("Admin@2026", 10);
const demoHash = await bcrypt.hash("Demo@2026", 10);

insertUser.run(
  "admin",
  "admin@shiguang.local",
  adminHash,
  "拾光管理员",
  "负责维护这个社区的秩序与氛围。",
  "",
  "shiguang-admin",
  "admin",
  now - 90 * day,
  now - 90 * day
);

insertUser.run(
  "demo",
  "demo@shiguang.local",
  demoHash,
  "林禾",
  "在生活里收集细小的光。写随笔、读书笔记，偶尔写代码。",
  "https://example.com",
  "linhe",
  "user",
  now - 60 * day,
  now - 60 * day
);

const insertPost = db.prepare(`
  INSERT INTO posts (author_id, slug, title, content, excerpt, cover_seed, tags, status, rejection_reason, views, created_at, updated_at, published_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?)
`);

const posts = [
  {
    authorId: 2,
    slug: "morning-light",
    title: "把时间还给清晨",
    coverSeed: "shiguang-morning-mist",
    tags: "生活,随笔",
    status: "approved",
    views: 186,
    created: now - 40 * day,
    excerpt:
      "早起本身不是目的。真正让人着迷的，是那段还没有被任何人占据的时间。",
    content: `有人问我，坚持早起之后最大的变化是什么。我认真想了想，不是多看了几页书，也不是多跑了三公里，而是每天拥有一段完全属于自己的时间。

## 安静的时间

六点的城市还很轻。厨房里水烧开的声音，窗外第一班公交经过的声音，都比白天清晰。这段时间里没有人找我，没有消息需要回复，世界暂时把我忘在了一边。

> 清晨的馈赠，不在日出，而在无人打扰。

## 一点点仪式

我的早晨很简单：

- 一杯温水
- 十分钟无目的阅读
- 写下今天最重要的一件事

不贪多。仪式感的价值在于稳定，不在于丰富。

## 傍晚再看

到了晚上，我会把早上写下的那件事翻出来，看看完成了没有。多数时候完成了，少数时候没有。无论哪种结果，这一天的边界都比从前清楚。

把时间还给清晨，其实是把选择权拿回自己手里。`,
    published: now - 40 * day,
  },
  {
    authorId: 2,
    slug: "after-reading-a-book",
    title: "读完一本书之后",
    coverSeed: "shiguang-bookshelf-dusk",
    tags: "阅读",
    status: "approved",
    views: 142,
    created: now - 32 * day,
    excerpt:
      "合上书的那一刻，一本书才算真正开始。接下来的几天里，它会在生活里悄悄起作用。",
    content: `读完一本书的瞬间，常常是最空茫的。故事结束了，人物散场了，可心里还留着某种没有落定的情绪。

过去我总急着读下一本，好像书页之间的空白是浪费。后来发现，空白才是书真正发生作用的地方。

## 合上书之后，我会做三件事

1. **什么都不做，待一会儿。** 让结尾的情绪自己消化，不给它立刻贴上标签。
2. **在空白处写几句话。** 不写书评，只写感受：哪一段让我停下来，哪个句子我反复读了两遍。
3. **把它放进生活里。** 接下来的几天，留意书中反复出现的意象，它们往往会在真实生活里再次出现。

## 书不是终点

一本书更像一段对话的起点。读完只是把话筒递给自己。

> 真正的阅读，发生在合上书之后。

所以，如果你刚读完一本书，不必急着开始下一本。留一点时间，让回声落地。`,
    published: now - 32 * day,
  },
  {
    authorId: 2,
    slug: "small-town-station",
    title: "小城车站",
    coverSeed: "shiguang-station-platform",
    tags: "旅行,随笔",
    status: "approved",
    views: 98,
    created: now - 21 * day,
    excerpt:
      "三等小站没有扶梯，也没有广播。列车进站时，站台上的每个人都看得见火车从山坡那头开来。",
    content: `去外婆家的路，要在一个三等小站换乘。车站建在半山腰，月台只有两条，站房是八十年代的水泥房子，墙上还留着褪色的标语。

## 等车的人

小站没有扶梯，行李都是自己拎下台阶。也没有滚动播报，列车进站时，广播里只有一声带着电流音的招呼，多数乘客靠看时间来判断。

但这里的每个人都知道火车什么时候来。不是看表，是看山坡那边，有没有一列绿色的影子慢慢转过来。

## 慢的意义

在大城市坐惯高铁，会觉得小站的一切都不方便。可站在月台上等车的那二十分钟，忽然明白了一件事：赶路的人眼里没有风景，等人的时间里才有。

> 慢，不是效率的反面，是另一种注意力的开始。

后来我不再抱怨那二十分钟的等待。它像书页之间的留白，让旅程有了呼吸的缝隙。`,
    published: now - 21 * day,
  },
  {
    authorId: 2,
    slug: "quiet-corner-of-code",
    title: "代码里的安静角落",
    coverSeed: "shiguang-code-window",
    tags: "技术",
    status: "pending",
    views: 0,
    created: now - 2 * day,
    excerpt:
      "好的代码和好的文章有相似之处：读起来流畅，修改时不伤筋骨，多年后仍能看懂当时的思路。",
    content: `写代码和写作，在某种意义上是一回事。两者都是把模糊的想法，变成别人能读懂的东西。

## 可读性优先

一段代码最好的状态，是不需要注释就能读懂。如果必须写注释，说明命名出了问题。

\`\`\`ts
// 不好：命名没有信息量
const d = getData();
apply(d, 2);

// 更好：意图自己说话
const drafts = fetchDraftsFor(userId);
publish(drafts.filter(isReadyToPublish));
\`\`\`

## 留白也是设计

代码里的空行、缩进、拆函数，作用与文章里的分段相同。它们不增加信息，但决定信息能不能被接收。

## 面向未来的读者

写代码时要想到三种读者：几小时后的自己、几个月后的同事、几年后接手的人。他们读到的不是语法，是当时思考的顺序。

> 好的代码，是写给人的。机器只是顺带能运行。

希望这篇分享能带来一些同行的想法。`,
    published: null,
  },
  {
    authorId: 2,
    slug: "foggy-notes",
    title: "雾天笔记",
    coverSeed: "shiguang-fog-window",
    tags: "随笔",
    status: "draft",
    views: 0,
    created: now - 1 * day,
    excerpt: "",
    content: `今天起雾了。窗外的楼和树都变得不确定，轮廓柔和，边界消失。

雾天适合做不需要边界的事：整理旧照片，把抽屉深处的东西翻出来晒太阳，或者只是坐在窗前发呆。

草稿先写到这里，等雾散了再回来。`,
    published: null,
  },
];

for (const p of posts) {
  insertPost.run(
    p.authorId,
    p.slug,
    p.title,
    p.content,
    p.excerpt,
    p.coverSeed,
    p.tags,
    p.status,
    p.views,
    p.created,
    p.created,
    p.published
  );
}

// 少量点赞与评论，让数据看起来是活的
const insertLike = db.prepare(
  "INSERT OR IGNORE INTO likes (user_id, post_id, created_at) VALUES (?, ?, ?)"
);
insertLike.run(2, 1, now - 10 * day);
insertLike.run(1, 1, now - 8 * day);
insertLike.run(1, 2, now - 9 * day);
insertLike.run(2, 3, now - 6 * day);

const insertComment = db.prepare(
  "INSERT INTO comments (post_id, user_id, content, status, created_at) VALUES (?, ?, ?, 'visible', ?)"
);
insertComment.run(
  1,
  1,
  "早起的那段无人打扰的时间，确实是最珍贵的。读完想试试。",
  now - 30 * day
);
insertComment.run(
  2,
  1,
  "书页之间的留白这个说法很妙，感谢分享。",
  now - 25 * day
);

db.close();
console.log("种子数据写入完成：管理员 admin / Admin@2026，演示用户 demo / Demo@2026");
