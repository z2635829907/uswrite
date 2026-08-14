import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import bcrypt from "bcryptjs";

const db = new DatabaseSync(path.join(process.cwd(), "data", "blog.db"));
db.exec("PRAGMA foreign_keys = ON;");

const now = Date.now();
const day = 24 * 60 * 60 * 1000;
const hour = 60 * 60 * 1000;

// 补充几位作者，让社区看起来更热闹
const extraUsers = [
  {
    username: "aqing",
    display_name: "阿晴",
    bio: "在沿海小城长大的旅行编辑，台风天也要出门看海。",
    avatar: "aqing",
  },
  {
    username: "xiaoman",
    display_name: "小满",
    bio: "写生活里的小事，从菜市场到民政局，什么都想记一笔。",
    avatar: "xiaoman",
  },
  {
    username: "laozhou",
    display_name: "老周",
    bio: "四十岁才开始写字的体育迷，夜宵喜欢配一碗热汤。",
    avatar: "laozhou",
  },
  {
    username: "chenmo",
    display_name: "陈默",
    bio: "游戏与影视双修，坚信好故事藏在普通人身上。",
    avatar: "chenmo",
  },
];

const passwordHash = await bcrypt.hash("Demo@2026", 10);
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users
    (username, email, password_hash, display_name, bio, website, avatar_seed, role, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, '', ?, 'user', 'active', ?, ?)
`);

for (const u of extraUsers) {
  insertUser.run(
    u.username,
    `${u.username}@shiguang.local`,
    passwordHash,
    u.display_name,
    u.bio,
    u.avatar,
    now - 30 * day,
    now - 30 * day
  );
}

const userId = (username) =>
  db.prepare("SELECT id FROM users WHERE username = ?").get(username).id;

const insertPost = db.prepare(`
  INSERT OR IGNORE INTO posts
    (author_id, slug, title, content, excerpt, cover_seed, tags, category, status, rejection_reason, views, created_at, updated_at, published_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', '', ?, ?, ?, ?)
`);

const posts = [
  {
    author: "aqing",
    slug: "coastal-town-after-typhoon",
    title: "台风过境后，沿海小城重新睁开眼睛",
    excerpt:
      "白海豚擦着海岸线离开后的第三天，玉环的街道恢复了车流。被水泡过的卷帘门一扇扇拉开，小城像刚睡醒一样重新睁开眼睛。",
    coverSeed: "yuhuan-typhoon-after",
    tags: "旅行,台风,随笔",
    category: "travel",
    views: 512,
    published: now - 2 * hour,
    content: `白海豚擦着海岸线离开后的第三天，玉环的街道恢复了车流。积水退去的地方，留下薄薄一层泥，环卫车从凌晨开始一遍遍经过。

## 雨停之后

沿街的卷帘门一扇扇拉开，五金店老板把泡过水的轮胎搬出来晒，早餐铺重新支起油锅。被台风按下暂停键的城市，正在一格一格地恢复播放。

我沿着海岸线走了一段。浪还是很大，但天空已经蓝得不像话。有人在栈道边钓鱼，有人把家里的被子抱到楼顶晾晒，空气里都是洗衣液和青草的味道。

> 台风把城市吹乱了一次，也把城市重新聚拢了一次。

## 重新上桌的早餐

豆浆铺的老板娘说，台风那两天她最惦记的是电：炉子能不能用、豆子要不要提前泡。开业第一单，老客远远就喊她加两份油条。

小城没有太多宏大的叙事，恢复的办法也很朴素——把日子重新过起来，从一顿热气腾腾的早餐开始。`,
  },
  {
    author: "aqing",
    slug: "china-cool-tour",
    title: "“China Cool”来了：老外扎堆来避暑，我陪朋友逛了三天山城",
    excerpt:
      "今年夏天，海外社交平台上的高频词变成了“China Cool”。避暑、爬山、逛夜市，入境游第一次离我的生活这么近。",
    coverSeed: "china-cool-mountain-city",
    tags: "旅行,文化,热点",
    category: "travel",
    views: 468,
    published: now - 6 * hour,
    content: `朋友玛雅是今年夏天来的中国。她告诉我，在海外社交平台上，“China Cool”已经成了夏天的流量密码——比起在家吹空调，年轻人更愿意来中国“天然空调房”里避暑。

## 三天山城

我们住进山城的老街区，白天爬山看江，晚上钻进夜市。玛雅举着手机拍个不停：糖水铺的冰粉、临江的小板凳、天台上晾着的竹席，她都说“very cool”。

她最惊讶的是交通。机器人出租车、无人机配送，这些在她视频里出现过的东西，居然真的在路上跑。她站在路边看了十分钟，说这就是她理解的未来感。

> 文化游、生态游、科技游，正在成为同一趟旅程的三层底色。

## 从打卡到生活

送她上飞机前，玛雅说了一句让我印象很深的话：来之前以为中国是“景点”，来之后发现中国是“生活”。

入境游热闹起来的不只是数字，还有我们习以为常的日常。那些我们觉得普通的街道、夜市和小馆子，恰恰是最打动远方来客的部分。`,
  },
  {
    author: "aqing",
    slug: "robotaxi-city-tour",
    title: "机器人出租车带我看城市：一场没有司机的旅行",
    excerpt:
      "预约、上车、输入目的地，全程没有司机。车窗外的城市还是那座城市，体验却完全不一样了。",
    coverSeed: "robotaxi-city",
    tags: "旅行,科技",
    category: "travel",
    views: 231,
    published: now - (1 * day + 4 * hour),
    content: `晚上十点，我在街边用手机叫了一辆机器人出租车。没有司机的车缓缓停到面前，后备厢门自己弹开，像一位沉默的老朋友。

## 没有司机的夜晚

上车、输入目的地、系好安全带，车里安静得只剩下导航的声音。我本来做好了“坐得提心吊胆”的准备，结果它开得比我想象中稳重得多——该让行时让行，该转弯时转弯，甚至比不少老司机更有耐心。

车窗外的城市还是那座城市：路灯、骑电动车的外卖员、刚下晚班的人群。变的是我们看待它的方式——原来科技已经悄悄融进了最日常的交通。

## 城市在慢慢变新

第二天白天，我又体验了一次。副驾驶放着一瓶水，中控屏会提示路过的高楼是哪一年建成的。与其说这是一次“炫技”，不如说城市正在用一种更轻的方式，重新介绍自己。

> 科技最动人的部分，从来不是它有多新，而是它有多常见。`,
  },
  {
    author: "xiaoman",
    slug: "marriage-at-bank",
    title: "银行能办结婚证了，我陪朋友去体验了一把",
    excerpt:
      "民政局把婚姻登记处开进了银行。陪朋友领证的那天，我忽然觉得，这座城市的公共服务正在变得有趣。",
    coverSeed: "marriage-at-bank",
    tags: "生活,热点",
    category: "life",
    views: 593,
    published: now - 4 * hour,
    content: `朋友小赵说要领证，约我一起去。我还以为走错了地方——民政局把婚姻登记处开进了银行，取号、叫号、拍照，一气呵成。

## 领证体验

大厅的角落辟出一块区域，墙上是喜气的红色，工作人员递表格的时候还笑着道喜。小赵和对象填完表，前后不到四十分钟，红本本就到手了。

她说原本还担心“去银行领证会不会太奇怪”，结果体验下来反而觉得方便：车位好找、流程顺畅、环境安静，连拍照的背景墙都比想象中好看。

> 公共服务变得好用，是一件值得认真记录的小事。

## 城市的小变化

回家的路上，我们聊起这些年办证的变化：从排队一天到预约分时，从跑三个部门到一个窗口搞定。银行里的婚姻登记处，只是这串变化里最新的一环。

婚姻登记处进了银行，听起来像一句段子，但办完事的人都说“真香”。城市的好，往往就藏在这些愿意为你多想一步的细节里。`,
  },
  {
    author: "xiaoman",
    slug: "delivery-rider-flood",
    title: "外卖小哥放假那天，跑去帮消防排涝了",
    excerpt:
      "台风“白海豚”过境，玉环被淹。外卖平台给骑手放了假，可有人穿着雨衣，骑着小电驴到了排涝一线。",
    coverSeed: "rider-flood-relief",
    tags: "生活,正能量,热点",
    category: "life",
    views: 621,
    published: now - 8 * hour,
    content: `台风“白海豚”过境那天，外卖平台给骑手放了假，系统停了单。可老陈还是穿上雨衣出了门——他骑着小电驴，一路到了排涝一线。

## 放假那天，他去了积水最深的地方

消防员在清理路面淤泥，老陈把车停到路边，挽起裤腿就下去帮忙。搬树枝、清杂物、疏导车辆，他跟着忙了一下午。有人拍下视频发上网，评论区都在说：这单不用送，但值得加鸡腿。

后来有记者找到他，他搓着手说：“平台给我们放假，是怕我们危险。但台风天大家都难，能搭把手就搭把手。”

> 最打动人的，往往不是宏大的英雄叙事，而是普通人顺手伸出的那只手。

## 城市里的光

那几天，玉环还有很多人在做同样的事：村干部抢收新姜，商户腾出店面给邻居充电，社区群里有人一趟趟帮忙送药。

台风把城市淋湿了，可这些细节又把它烘干了。也许我们记住的不该只有灾害，还有灾害里那些普通人的光芒。`,
  },
  {
    author: "xiaoman",
    slug: "ginger-harvest",
    title: "两小时抢收千斤新姜，村干部的一天",
    excerpt:
      "台风前，镇村干部组成的抢收队下田，和风雨赛跑。两小时，几千斤新姜抢进仓库，这一季的心血保住了。",
    coverSeed: "ginger-harvest-field",
    tags: "生活,乡村",
    category: "life",
    views: 176,
    published: now - 20 * hour,
    content: `台风预报出来的那个晚上，姜农老吴一宿没睡。地里的新姜还有几千斤没收，雨一下来，半年的心血就要泡汤。

## 和风雨赛跑的两小时

第二天清晨，镇村干部组成的“抢收队”下了田。弯腰、拔姜、装筐、上车，大家闷头干活，只听得见雨点砸在雨衣上的声音。短短两个多小时，几千斤新姜被抢进了仓库。

老吴后来在村口拦着人挨个递水，嗓子有点哑：“这哪里是帮忙，这是保了我一家一年的收成。”

> 台风天最珍贵的东西，叫“被惦记着”。

## 雨后的姜田

雨停之后我路过那片姜田，绿油油的姜叶还挂着水珠。抢收只是第一道坎，晾晒、分拣、联系买家，后面还有一堆事。

可老吴笑着说，心里踏实了。田间地头没有那么多豪言壮语，有的只是雨里弯腰的人，和一场接一场的仗。`,
  },
  {
    author: "xiaoman",
    slug: "phone-survived-crash",
    title: "被追尾那天，手机替我挡了一劫",
    excerpt:
      "追尾的瞬间，手机从支架上飞出去，摔在座位缝里，屏幕没碎。我把它捡起来，第一反应是给家里报平安。",
    coverSeed: "phone-survived-crash",
    tags: "生活,科技,数码",
    category: "life",
    views: 205,
    published: now - 2 * day,
    content: `追尾发生的时候，我正停在路口等红灯，后面那辆车没刹住。车身一抖，手机从支架上飞出去，撞上副驾又弹进座位缝里。

## 屏幕没碎

下车处理事故，把手机捡起来才发现，屏幕竟然完好。评论区里有人笑称这是“抗致命一击”，我倒是觉得，它更像一个忠心的老伙计，关键时刻替我扛了一下。

处理完现场，我坐在路边，第一反应是给家里发了条消息：人没事，别担心。

## 科技的安全感

这些年手机的迭代，我们聊的最多是像素、芯片和电池。可真到了关键一刻，你只会庆幸它结实、可靠，就像你庆幸自己系了安全带。

> 好东西的标准有时候很简单：在意外来临时，稳得住。

后来我把旧手机收进了抽屉，买了个新的。旧的那台替我扛过一劫，值得退休。`,
  },
  {
    author: "laozhou",
    slug: "stormy-night-message",
    title: "暴雨夜里，收到一条“你那边还好吗”",
    excerpt:
      "台风夜，雨打在窗上像有人在敲门。手机亮了一下，是三年没怎么联系的老友发来的消息。",
    coverSeed: "stormy-night-window",
    tags: "情感,随笔",
    category: "emotion",
    views: 344,
    published: now - 10 * hour,
    content: `台风夜，雨打在窗上，像有人在敲门。我把窗帘拉开一条缝，外面什么也看不清，只有风声一阵紧过一阵。

手机亮了一下，是一条消息：“你那边还好吗？”发消息的人，是我三年没怎么联系的老友。

## 被想起的那一刻

我们上一次认真聊天，还是他搬家那天。之后的日子各忙各的，朋友圈偶尔点赞，没有更深的交集。可这个雨夜，他翻着新闻里台风的消息，第一个想到的城市坐标，是我这里。

我回了一句“挺好，就是风大”，然后问他：“你呢？”那一晚我们聊到凌晨一点，聊工作、聊父母、聊这些年绕过的路。

> 成年人的友情，有时候不是常联系，而是关键时刻总想得起。

## 台风夜的礼物

第二天风小了，我把窗台的盆栽挪回原处。阳光照进来的时候，我又看了一眼昨晚的聊天记录。

那场台风过去得很快，但它顺路带回来一个人。或许每场风暴里，都藏着这样一份意外的礼物。`,
  },
  {
    author: "laozhou",
    slug: "ginger-soup-typhoon",
    title: "台风天的一碗姜汤，从抢收的姜田到我家灶台",
    excerpt:
      "抢收回来的新姜，一部分进了酱缸，一部分进了我家锅。台风天，一碗热姜汤比什么都有用。",
    coverSeed: "ginger-soup-bowl",
    tags: "美食,生活",
    category: "food",
    views: 158,
    published: now - 14 * hour,
    content: `台风天，家里的菜篮子比平时空得快，但我妈早有准备。早市抢回来的新姜，一部分塞进酱缸，一部分洗净切片，准备煮姜汤。

## 一碗姜汤的讲究

新姜皮薄肉嫩，辣味不冲，切成薄片丢进锅里，加两粒红枣，水开再焖五分钟。盛出来的时候，热气里带着一股干净的辛香，喝下去从头暖到脚。

我妈说，台风天的姜汤有讲究：要趁热喝，要在雨声最响的时候喝，效果最好。我怀疑这是她的心理暗示，但不得不承认，这碗汤确实让屋里踏实了不少。

> 食物的治愈力，一半在味道，一半在惦记。

## 台风天的厨房

窗外风大雨大，厨房里灶火很稳。锅里咕嘟咕嘟响着，电饭煲里焖着饭，阳台上的盆接住了飘进来的雨。

台风把外面的世界吹乱了，厨房却始终是秩序的中心。一碗姜汤下肚，我觉得今晚可以安心睡觉了。`,
  },
  {
    author: "laozhou",
    slug: "summer-noodles-philosophy",
    title: "三伏天的凉面哲学",
    excerpt:
      "天越热，越想念一碗凉面。面条过冰水，黄瓜切丝，醋要足。生活的智慧有时候就藏在厨房里。",
    coverSeed: "summer-cold-noodles",
    tags: "美食,生活,随笔",
    category: "food",
    views: 289,
    published: now - 3 * day,
    content: `三伏天的饭点，人没什么胃口。可有一件事能让人瞬间清醒——一碗过过冰水的凉面。

## 凉面的仪式感

面要煮到八分熟，捞起来过冰水，抖散，浇上调好的酱汁。黄瓜切丝、豆芽焯水、花生拍碎，最后淋一勺醋。

我妈做凉面有个原则：醋要足，蒜要轻。她说热天人的脾气大，吃食上就要酸一点、轻一点，把火气压下去。

> 凉面的哲学很简单：过一遍冷水，才更筋道。

## 厨房里的夏天

后来我自己住，也学会了这碗面。最热的那几天，下班回家不做别的，就煮一小把面，过冰水，拌一拌。

坐在风扇前吃完，汗出了一层，人也舒坦了。夏天自有夏天的解法，有时候它不在空调房里，而在那一碗凉得刚好、酸得正妙的面里。`,
  },
  {
    author: "laozhou",
    slug: "ronaldo-wedding",
    title: "他官宣结婚了：那个喊“siu”的男人",
    excerpt:
      "消息冲上热搜的下午，我翻出十几年前的比赛录像。那个从马德拉岛走出来的少年，终于也成了别人故事里的归宿。",
    coverSeed: "ronaldo-wedding-news",
    tags: "体育,热点",
    category: "sports",
    views: 748,
    published: now - 3 * hour,
    content: `中午刷到热搜，第一反应是揉了揉眼睛——C罗宣布结婚了。评论区瞬间被“青春结束了”和“恭喜总裁”刷屏。

## 那个从马德拉岛走出来的少年

我翻出十几年前的比赛录像。那时候他还是曼联那个爱踩单车的毛头小子，进球后对着镜头喊出后来响彻全世界的“siu”。我们都以为他永远不会老，就像我们以为自己的青春永远不会散场。

可他也会在某个普通的下午，认真地对全世界说：我找到可以共度一生的人了。

> 偶像的意义，是陪我们走过一段路，然后在自己的故事里幸福下去。

## 致敬青春

晚上和球友群里聊起这事，有人说：“他结不结婚关我什么事？”有人回：“关我们的事，因为我们的青春里有他。”

是啊，运动员会退役，球星会结婚，但那些凌晨爬起来看球的夜晚是真的。祝福他，也谢谢他——那个用二十年时光，陪我们长大的“siu”。`,
  },
  {
    author: "laozhou",
    slug: "court-after-typhoon",
    title: "台风过后，球场上的人比平时多了一倍",
    excerpt:
      "台风走了，球场的水还没干透，已经有人运起了球。被憋了两天的人，都在用同一件事庆祝天晴。",
    coverSeed: "court-after-rain",
    tags: "体育,生活",
    category: "sports",
    views: 198,
    published: now - 1 * day,
    content: `台风走的第二天下午，球场的水还没完全干透，已经有人抱着球站在场边了。

## 憋坏了的人

先是三个学生运球投篮，接着来了两个大叔，后来连楼下卖水果的老板都换了拖鞋上场。被憋了两天的人，都在用同一件事庆祝天晴——把球投进篮筐，然后大汗淋漓地笑。

球场旁边的水洼映着蓝天，有人故意往里面投了个球，溅起一片水花，引来一阵起哄。没有裁判，没有比分牌，只有夕阳和笑声。

> 生活的快乐有时候门槛很低：一场雨停，一场球，就够。

## 回到日常

打完球去便利店买水，老板说这两天球场的灯都亮得比平时久。台风把城市关了两天，人们用一个傍晚就把快乐补了回来。

所谓韧性，大概就是雨停之后，依旧有人第一时间走到球场上，把生活重新投进篮筐。`,
  },
  {
    author: "chenmo",
    slug: "modexian-hit",
    title: "《莫得闲》爆火：小成本故事片凭什么出圈",
    excerpt:
      "上线一周，全网曝光破五亿，热搜上了二十多次。一部没有流量明星的网络故事片，讲出了最普通人的生活。",
    coverSeed: "modexian-movie",
    tags: "娱乐,影视,热点",
    category: "entertainment",
    views: 556,
    published: now - 5 * hour,
    content: `上线一周，全网累计曝光突破五亿，热搜上了二十多次——《莫得闲》成了这个夏天最意外的黑马。没有流量明星，没有大制作特效，可它就是火了。

## 为什么是它

朋友圈里最常出现的一句评价是：“拍的好像我的生活。”故事讲的是几个普通人的鸡毛蒜皮：加班、还贷、相亲、和老家的父母视频。没有反转，没有爽点，只有真实。

当大家被越来越浮夸的剧情包围时，一部踏踏实实讲人话的片子，反而成了稀缺品。

> 观众不是不爱看故事，只是更爱看“自己”的故事。

## 小成本的春天

《莫得闲》的团队不大，导演说很多镜头都是朋友帮忙拍的。它的成功让更多小成本创作者看到希望：只要真诚，观众会看见。

娱乐行业的热闹，不该只有大制作。那些贴近地面的声音，往往才是最有力量的回响。`,
  },
  {
    author: "chenmo",
    slug: "weekend-drama",
    title: "追完那部剧，我又开始等下一个周末",
    excerpt:
      "剧集完结的晚上，我把片尾曲听完了。好的故事结束以后，生活还是要自己往下写。",
    coverSeed: "weekend-drama-ending",
    tags: "娱乐,影视,随笔",
    category: "entertainment",
    views: 246,
    published: now - 4 * day,
    content: `追了两个月的剧，昨晚大结局。片尾曲放完，我没有立刻关掉视频，对着黑屏的播放器发了一会儿呆。

## 告别一个故事

故事里的人各有归宿，故事外的我泡了杯茶，把手机放下，忽然有点舍不得。舍不得的不是剧情，而是每个周五晚上那份“有盼头”的心情。

追剧最幸福的时刻，其实不是结局，而是过程中那些确定的期待：周六晚上八点，泡好茶，关掉工作群，世界暂时只剩下屏幕里的那点悲欢。

> 好的故事会结束，但认真等待它的日子不会白费。

## 下一个周末

新的一周开始，我又开始物色下一部剧。朋友笑我“剧荒焦虑”，我说这叫“生活的仪式感”。

我们追的哪里是剧，分明是给忙碌的日子留一个温柔的出口。剧会完结，但周末会来，故事也永远会有下一章。`,
  },
  {
    author: "chenmo",
    slug: "typhoon-game-marathon",
    title: "台风天，我把囤的游戏通关了两部",
    excerpt:
      "雨声和游戏音效叠在一起，两天时间，我通关了两部搁置半年的游戏。台风天宅家，原来也是一种治愈。",
    coverSeed: "typhoon-game-marathon",
    tags: "游戏,生活",
    category: "game",
    views: 187,
    published: now - 12 * hour,
    content: `台风两天，我把囤了半年的游戏清单翻了出来，居然通关了两部。雨声打在窗上，耳机里的音乐铺开，世界忽然变得安静又完整。

## 囤了很久的进度条

第一部是搁置半年的独立游戏，存档还停在三年前的秋天。重新打开的那一刻，熟悉的配乐响起来，我居然还记得所有剧情。第二部是朋友安利了很久的开放世界，趁着台风天一口气跑完了主线。

两天里我很少看手机，只有游戏、雨声和热茶。台风把城市关在窗外，反而给了我一个名正言顺的“暂停”理由。

> 游戏最好的时候，不是通关，而是你可以心无旁骛地进入另一个世界。

## 台风天的意义

雨停之后，我回到办公桌前，进度条是满的，心里的电量好像也充回来了。

台风天适合囤粮，也适合囤一点快乐。下次预报来之前，记得把想玩的游戏先下载好。`,
  },
  {
    author: "chenmo",
    slug: "chinese-games-abroad",
    title: "国产游戏出海：下一个“黑神话”会在哪里出现",
    excerpt:
      "从“黑神话”到独立游戏扎堆出海，中国团队正在用更成熟的表达走向世界。下一款现象级作品，也许就在某个小工作室里。",
    coverSeed: "chinese-games-global",
    tags: "游戏,科技,热点",
    category: "game",
    views: 412,
    published: now - (2 * day + 2 * hour),
    content: `这几年，国产游戏出海的名单越来越长。从“黑神话”把西游文化带进全球玩家的视野，到独立团队的作品登上各大平台的热销榜，中国游戏正在从“代工”走向“表达”。

## 从文化符号到产品力

早些年的出海，靠的是题材新鲜感；现在的出海，靠的是实打实的产品力——流畅的动作、扎实的美术、完整的叙事。玩家不再因为“中国制造”而好奇，而是因为好玩而买单。

一位独立开发者朋友说：“我们现在讨论的不是怎么‘走出去’，而是怎么‘走进去’——走进全球玩家的审美和日常。”

> 文化出海最踏实的路，是先做出一款真正好玩的游戏。

## 下一站在哪

下一款现象级作品会在哪里出现？也许是某个大厂，也许是某个三五个人的工作室，也许正在某个深夜的代码里慢慢成型。

我们能做的，就是保持期待，也保持耐心。好游戏和好故事一样，都需要时间。`,
  },
];

let inserted = 0;
for (const p of posts) {
  const result = insertPost.run(
    userId(p.author),
    p.slug,
    p.title,
    p.content,
    p.excerpt,
    p.coverSeed,
    p.tags,
    p.category,
    p.views,
    now - 1 * day,
    now - 1 * day,
    p.published
  );
  if (result.changes > 0) inserted += 1;
}

// 给部分新文章补充点赞和评论，让首页数据更鲜活
const insertLike = db.prepare(
  "INSERT OR IGNORE INTO likes (user_id, post_id, created_at) VALUES (?, ?, ?)"
);
const insertComment = db.prepare(
  "INSERT INTO comments (post_id, user_id, content, status, created_at) VALUES (?, ?, ?, 'visible', ?)"
);

const postIdBySlug = (slug) =>
  db.prepare("SELECT id FROM posts WHERE slug = ?").get(slug).id;

const likePairs = [
  ["coastal-town-after-typhoon", 2],
  ["coastal-town-after-typhoon", 1],
  ["china-cool-tour", 2],
  ["marriage-at-bank", 1],
  ["delivery-rider-flood", 2],
  ["ronaldo-wedding", 1],
  ["modexian-hit", 2],
  ["chinese-games-abroad", 1],
  ["chinese-games-abroad", 3],
];
for (const [slug, uid] of likePairs) {
  insertLike.run(uid, postIdBySlug(slug), now - 1 * hour);
}

const commentPairs = [
  ["coastal-town-after-typhoon", 1, "写得真好，台风天最动人的就是这些普通人。", now - 1 * hour],
  ["china-cool-tour", 2, "原来我们习以为常的生活，在别人眼里这么酷。", now - 5 * hour],
  ["marriage-at-bank", 2, "朋友上周也去体验了，流程确实很快，还很喜庆。", now - 3 * hour],
  ["delivery-rider-flood", 1, "这才是值得上热搜的新闻。", now - 7 * hour],
  ["ronaldo-wedding", 2, "青春真的结束了，但祝福是真的。", now - 2 * hour],
  ["modexian-hit", 1, "刚看完，确实难得，普通人的故事最有力量。", now - 4 * hour],
  ["typhoon-game-marathon", 2, "台风天游戏清单 +1，下次暴雨就靠它了。", now - 11 * hour],
];
for (const [slug, uid, content, ts] of commentPairs) {
  insertComment.run(postIdBySlug(slug), uid, content, ts);
}

db.close();
console.log(`热点文章写入完成：新增 ${inserted} 篇，作者 4 位，点赞与评论已补充。`);
