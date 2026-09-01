from sqlalchemy.orm import Session

from app.auth import hash_password
from app.models import CollectionItem, Post, Stamp, User

STAMPS = [
    {
        "catalog_no": "T46",
        "name": "庚申年",
        "year": 1980,
        "theme": "生肖",
        "mark": "猴",
        "color": "#c2410c",
        "face_value": "8分",
        "description": "第一轮生肖猴票，黄永玉设计。很多人集邮的起点，也是方寸里最有故事的一枚。",
    },
    {
        "catalog_no": "2024-1",
        "name": "甲辰年",
        "year": 2024,
        "theme": "生肖",
        "mark": "龙",
        "color": "#b91c1c",
        "face_value": "1.20元",
        "description": "甲辰龙年贺岁票。新邮里最适合寄给朋友、也最适合收入生肖专题的一张。",
    },
    {
        "catalog_no": "2023-1",
        "name": "癸卯年",
        "year": 2023,
        "theme": "生肖",
        "mark": "兔",
        "color": "#9f1239",
        "face_value": "1.20元",
        "description": "兔年票，线条柔软，适合做首日实寄或贴在手绘封上。",
    },
    {
        "catalog_no": "2022-1",
        "name": "壬寅年",
        "year": 2022,
        "theme": "生肖",
        "mark": "虎",
        "color": "#9a3412",
        "face_value": "1.20元",
        "description": "虎年票气势足，专题集邮里常和山、林、民俗一起组集。",
    },
    {
        "catalog_no": "T168",
        "name": "熊猫",
        "year": 1985,
        "theme": "动物",
        "mark": "熊",
        "color": "#292524",
        "face_value": "8分",
        "description": "八十年代熊猫票，黑白块面干净，动物专题和儿童集邮都很常见。",
    },
    {
        "catalog_no": "2023-20",
        "name": "大熊猫",
        "year": 2023,
        "theme": "动物",
        "mark": "猫",
        "color": "#44403c",
        "face_value": "1.20元",
        "description": "新版大熊猫票，适合和四川原地、主题邮局一起玩实寄。",
    },
    {
        "catalog_no": "2020-16",
        "name": "故宫博物院",
        "year": 2020,
        "theme": "建筑",
        "mark": "宫",
        "color": "#991b1b",
        "face_value": "1.20元",
        "description": "太和殿朱墙黄瓦，建筑专题和北京原地集邮的常客。",
    },
    {
        "catalog_no": "特57",
        "name": "黄山风景",
        "year": 1963,
        "theme": "风景",
        "mark": "山",
        "color": "#115e59",
        "face_value": "8分",
        "description": "特57 黄山，新中国风景票里的经典。云海与奇松，适合慢慢看齿孔。",
    },
    {
        "catalog_no": "2023-10",
        "name": "长江",
        "year": 2023,
        "theme": "风景",
        "mark": "江",
        "color": "#1d4ed8",
        "face_value": "1.20元",
        "description": "长江专题票，沿江城市都可以做原地，旅程感很强。",
    },
    {
        "catalog_no": "2022-12",
        "name": "中国航天",
        "year": 2022,
        "theme": "科技",
        "mark": "星",
        "color": "#1e3a8a",
        "face_value": "1.20元",
        "description": "航天票适合追发射日戳、航天城邮局，是年轻集邮者很爱的一条线。",
    },
    {
        "catalog_no": "2018-15",
        "name": "高铁",
        "year": 2018,
        "theme": "科技",
        "mark": "轨",
        "color": "#0f766e",
        "face_value": "1.20元",
        "description": "高铁入票，现代交通专题里最亲切的一套。",
    },
    {
        "catalog_no": "特61",
        "name": "牡丹",
        "year": 1964,
        "theme": "花卉",
        "mark": "花",
        "color": "#be185d",
        "face_value": "4分",
        "description": "特61 牡丹，颜色饱满，花卉票里常被拿来做欣赏和组集封面。",
    },
    {
        "catalog_no": "2023-7",
        "name": "桃花",
        "year": 2023,
        "theme": "花卉",
        "mark": "桃",
        "color": "#db2777",
        "face_value": "1.20元",
        "description": "春日桃花票，适合做极限片：票、片、戳三点合一。",
    },
    {
        "catalog_no": "2016-20",
        "name": "西游记（孙悟空）",
        "year": 2016,
        "theme": "文学",
        "mark": "悟空",
        "color": "#c2410c",
        "face_value": "1.20元",
        "description": "名著专题里最有人气的一张。连非集邮的朋友也认得这张脸。",
    },
    {
        "catalog_no": "2019-11",
        "name": "中国古代神话",
        "year": 2019,
        "theme": "文学",
        "mark": "神话",
        "color": "#7c2d12",
        "face_value": "1.20元",
        "description": "神话入票，构图饱满，适合讲故事，也适合做手绘封。",
    },
    {
        "catalog_no": "2021-20",
        "name": "中国共产党成立一百周年",
        "year": 2021,
        "theme": "纪念",
        "mark": "百",
        "color": "#9f1239",
        "face_value": "1.20元",
        "description": "建党百年纪念票，发行量大，适合作为新邮和首日封的入门收藏。",
    },
    {
        "catalog_no": "2022-2",
        "name": "北京冬奥会",
        "year": 2022,
        "theme": "体育",
        "mark": "冰",
        "color": "#0369a1",
        "face_value": "1.20元",
        "description": "冬奥票，体育与城市记忆叠在一起，主题邮局很多。",
    },
    {
        "catalog_no": "2023-16",
        "name": "杭州亚运会",
        "year": 2023,
        "theme": "体育",
        "mark": "杭",
        "color": "#0f766e",
        "face_value": "1.20元",
        "description": "杭州亚运票，江南色调，杭州集邮者几乎人手一套。",
    },
    {
        "catalog_no": "2024-7",
        "name": "二十四节气",
        "year": 2024,
        "theme": "民俗",
        "mark": "气",
        "color": "#3f6212",
        "face_value": "1.20元",
        "description": "节气入票，一年可以做十二次甚至二十四次实寄计划。",
    },
    {
        "catalog_no": "2020-4",
        "name": "珠穆朗玛峰",
        "year": 2020,
        "theme": "风景",
        "mark": "峰",
        "color": "#334155",
        "face_value": "1.20元",
        "description": "珠峰票，风景专题里的高光。蓝白冷色，齿孔外也像风。",
    },
    {
        "catalog_no": "2019-7",
        "name": "古蜀文明",
        "year": 2019,
        "theme": "文物",
        "mark": "蜀",
        "color": "#92400e",
        "face_value": "1.20元",
        "description": "三星堆意象，文物专题和四川原地都很对味。",
    },
    {
        "catalog_no": "T42",
        "name": "台湾风光",
        "year": 1979,
        "theme": "风景",
        "mark": "岛",
        "color": "#065f46",
        "face_value": "8分",
        "description": "七十年代末的风光套票，颜色清透，适合一张张摊开看。",
    },
    {
        "catalog_no": "2021-12",
        "name": "中国铁路",
        "year": 2021,
        "theme": "科技",
        "mark": "路",
        "color": "#1e40af",
        "face_value": "1.20元",
        "description": "铁路入票，适合沿铁路线收集车站日戳。",
    },
    {
        "catalog_no": "2024-4",
        "name": "龙年特种邮票",
        "year": 2024,
        "theme": "生肖",
        "mark": "腾",
        "color": "#b45309",
        "face_value": "1.20元",
        "description": "龙年特种，比贺岁票更适合做欣赏和展页。",
    },
]

USERS = [
    {
        "username": "fangcun",
        "display_name": "林方寸",
        "city": "杭州",
        "bio": "从小学集邮。现在做两个专题：生肖，以及故宫与古建筑。",
        "password": "youlin123",
    },
    {
        "username": "achuo",
        "display_name": "阿戳",
        "city": "青岛",
        "bio": "风景日戳和原地实寄。票可以重复，戳不能将就。",
        "password": "youlin123",
    },
    {
        "username": "xiaofeng",
        "display_name": "小封",
        "city": "成都",
        "bio": "自制封、极限片。觉得一枚票被实寄过，才算真正走过一遭。",
        "password": "youlin123",
    },
    {
        "username": "miaopiao",
        "display_name": "喵票",
        "city": "上海",
        "bio": "只集猫、熊猫和一切圆眼睛的动物票。",
        "password": "youlin123",
    },
]


def _stamp_by_catalog(db: Session, catalog_no: str) -> Stamp:
    return db.query(Stamp).filter(Stamp.catalog_no == catalog_no).one()


def seed_if_empty(db: Session) -> None:
    if db.query(Stamp).first():
        return

    for row in STAMPS:
        db.add(Stamp(**row))
    db.flush()

    users: dict[str, User] = {}
    for row in USERS:
        user = User(
            username=row["username"],
            display_name=row["display_name"],
            city=row["city"],
            bio=row["bio"],
            password_hash=hash_password(row["password"]),
        )
        db.add(user)
        db.flush()
        users[row["username"]] = user

    collections = [
        ("fangcun", "T46", "own", "小学时妈妈给的第一枚生肖票"),
        ("fangcun", "2024-1", "swap", "龙年复品，可换风景票"),
        ("fangcun", "2023-1", "swap", "复品，品相全新"),
        ("fangcun", "2020-16", "own", "想配一套故宫建筑"),
        ("fangcun", "特57", "want", "一直缺黄山"),
        ("fangcun", "2016-20", "want", ""),
        ("fangcun", "2023-16", "own", "亚运那年在杭州寄的"),
        ("fangcun", "特61", "swap", "牡丹复品"),
        ("achuo", "特57", "swap", "黄山复品，适合做原地的人来换"),
        ("achuo", "2023-10", "own", ""),
        ("achuo", "2020-4", "own", "珠峰"),
        ("achuo", "T42", "swap", "风光复品"),
        ("achuo", "2024-1", "want", "龙年还缺"),
        ("achuo", "2020-16", "want", "故宫想配戳"),
        ("achuo", "2022-12", "own", ""),
        ("achuo", "2018-15", "swap", ""),
        ("xiaofeng", "2019-7", "own", "古蜀，成都人的义务"),
        ("xiaofeng", "2023-20", "own", ""),
        ("xiaofeng", "T46", "want", "猴票只想要一枚能实寄的"),
        ("xiaofeng", "2016-20", "own", "孙悟空，手绘封素材"),
        ("xiaofeng", "2019-11", "swap", ""),
        ("xiaofeng", "2023-7", "own", "桃花极限片进行中"),
        ("xiaofeng", "特61", "want", "牡丹想做花的极限"),
        ("miaopiao", "T168", "own", "第一套熊猫"),
        ("miaopiao", "2023-20", "swap", "新熊猫有复品"),
        ("miaopiao", "2023-1", "want", "兔也算圆眼睛"),
        ("miaopiao", "2022-1", "own", ""),
        ("miaopiao", "2024-7", "want", ""),
        ("miaopiao", "2018-15", "want", ""),
    ]
    for username, catalog_no, status, note in collections:
        db.add(
            CollectionItem(
                user_id=users[username].id,
                stamp_id=_stamp_by_catalog(db, catalog_no).id,
                status=status,
                note=note,
            )
        )

    posts = [
        (
            "fangcun",
            "T46",
            "小学三年级，妈妈在邮局窗口撕给我一枚猴。当时不懂齿孔，只觉得红色很好看。今天把它放进邮册第一页。",
        ),
        (
            "achuo",
            "特57",
            "黄山这套摊在灯下看，云不是印出来的，是留白留出来的。下周去黄山景区邮局盖一天戳。",
        ),
        (
            "xiaofeng",
            "2019-7",
            "三星堆的眼睛贴在封上，比博物馆灯光还亮。自制封第一枚，欢迎交换花和动物的复品。",
        ),
        (
            "miaopiao",
            "2023-20",
            "新熊猫票的毛发比八十年代那套更细。我有一张全新复品，想换癸卯兔。",
        ),
        (
            "fangcun",
            "2023-16",
            "亚运那年骑车去主题邮局排队。票普通，戳是自己的。邮邻如果能把这种日子记住就好了。",
        ),
        (
            "achuo",
            "2022-12",
            "航天票不一定要等发射日。普通日子贴上去，也是一张会飞的纸。",
        ),
    ]
    for username, catalog_no, body in posts:
        db.add(
            Post(
                user_id=users[username].id,
                stamp_id=_stamp_by_catalog(db, catalog_no).id,
                body=body,
            )
        )
    db.commit()
