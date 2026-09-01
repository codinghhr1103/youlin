from sqlalchemy import inspect, or_, text
from sqlalchemy.orm import Session

from app.auth import hash_password
from app.db import engine
from app.models import CollectionItem, Post, PostLike, Stamp, Swap, User

# 票图均来自维基共享，且为 1931 年前发行的中国邮票（公有领域 / 自由许可）。
# 新中国新邮原图仍受版权保护，故不收录。
STAMPS = [
    {
        "catalog_no": "QH-DL-1",
        "name": "海关大龙 壹分银",
        "year": 1878,
        "theme": "龙纹",
        "mark": "龙",
        "color": "#3f4f3a",
        "face_value": "1分银",
        "issuer": "海关邮政",
        "description": "中国第一套邮票。海关大龙三枚一套，这一枚是壹分银。云水间一条五爪龙，很多人把集邮的起点放在这里。",
        "image_path": "/stamps/cn-01.png",
        "image_license": "Public domain",
        "image_credit": "维基共享 / 大清海关邮政",
        "image_source": "https://commons.wikimedia.org/wiki/File:Big_Dragon_stamp_1-candareen_1878.PNG",
    },
    {
        "catalog_no": "QH-DL-3",
        "name": "海关大龙 叁分银",
        "year": 1878,
        "theme": "龙纹",
        "mark": "龙",
        "color": "#8a3a2a",
        "face_value": "3分银",
        "issuer": "海关邮政",
        "description": "大龙套票里最常见的一枚。齿孔、纸质、版式都是入门后很快会盯着看的细节。",
        "image_path": "/stamps/cn-02.png",
        "image_license": "Public domain",
        "image_credit": "维基共享 / 大清海关邮政",
        "image_source": "https://commons.wikimedia.org/wiki/File:Big_Dragon_stamp_3-candareen_1878.PNG",
    },
    {
        "catalog_no": "QH-DL-5",
        "name": "海关大龙 伍分银",
        "year": 1878,
        "theme": "龙纹",
        "mark": "龙",
        "color": "#c9a227",
        "face_value": "5分银",
        "issuer": "海关邮政",
        "description": "大龙高值。三枚凑齐，才算把中国邮票的第一页翻完。",
        "image_path": "/stamps/cn-03.png",
        "image_license": "Public domain",
        "image_credit": "维基共享 / 大清海关邮政",
        "image_source": "https://commons.wikimedia.org/wiki/File:Big_Dragon_stamp_5-candareen_1878.PNG",
    },
    {
        "catalog_no": "QH-XL-1",
        "name": "海关小龙 壹分银",
        "year": 1885,
        "theme": "龙纹",
        "mark": "龙",
        "color": "#5b6b4a",
        "face_value": "1分银",
        "issuer": "海关邮政",
        "description": "海关第二次正式邮票。比大龙更小、更密，被称作小龙。",
        "image_path": "/stamps/cn-04.jpg",
        "image_license": "Public domain",
        "image_credit": "维基共享 / 大清海关邮政",
        "image_source": "https://commons.wikimedia.org/wiki/File:Stamp_China_1885_1c.jpg",
    },
    {
        "catalog_no": "QH-YL",
        "name": "海关云龙",
        "year": 1883,
        "theme": "龙纹",
        "mark": "云",
        "color": "#6b4f2a",
        "face_value": "分银",
        "issuer": "海关邮政",
        "description": "海关二次云龙。龙身裹在云气里，是大龙之后很重要的过渡票。",
        "image_path": "/stamps/cn-05.jpg",
        "image_license": "Public domain",
        "image_credit": "维基共享",
        "image_source": "https://commons.wikimedia.org/wiki/File:%E6%B8%85%E6%B5%B7%E9%97%9C%E4%BA%8C%E6%AC%A1%E9%9B%B2%E9%BE%8D%E9%83%B5%E7%A5%A8.jpg",
    },
    {
        "catalog_no": "QH-WS-4",
        "name": "慈禧寿辰 肆分",
        "year": 1894,
        "theme": "纪念",
        "mark": "寿",
        "color": "#b4232c",
        "face_value": "4分",
        "issuer": "海关邮政",
        "description": "俗称万寿票。为中国早期纪念邮票，牡丹、寿字和宫里的喜气叠在一张纸上。",
        "image_path": "/stamps/cn-07.jpg",
        "image_license": "Public domain",
        "image_credit": "维基共享",
        "image_source": "https://commons.wikimedia.org/wiki/File:1894%E5%B9%B4%E5%88%9D%E7%89%88%E6%85%88%E7%A6%A7%E5%A3%BD%E8%BE%B0%E7%B4%80%E5%BF%B5%E7%A5%A84%E5%88%86.jpg",
    },
    {
        "catalog_no": "YC-1",
        "name": "宜昌商埠 壹分银",
        "year": 1894,
        "theme": "商埠",
        "mark": "埠",
        "color": "#2c5e52",
        "face_value": "1 candarin",
        "issuer": "宜昌商埠",
        "description": "长江口岸自己的地方邮资。商埠票是中国集邮里一条很有故事的旁支。",
        "image_path": "/stamps/cn-08.jpg",
        "image_license": "Public domain",
        "image_credit": "维基共享 / 宜昌商埠",
        "image_source": "https://commons.wikimedia.org/wiki/File:1_candarin_(postage_stamp)_-_I-Chang_(1894)_Elizabethan-Postage-Stamps_01.jpg",
    },
    {
        "catalog_no": "YC-3M",
        "name": "宜昌商埠 叁钱",
        "year": 1894,
        "theme": "商埠",
        "mark": "埠",
        "color": "#8f1720",
        "face_value": "3 mace",
        "issuer": "宜昌商埠",
        "description": "宜昌高值。山、水和英文面值挤在同一枚票上，口岸城市的气味很重。",
        "image_path": "/stamps/cn-09.jpg",
        "image_license": "Public domain",
        "image_credit": "维基共享 / 宜昌商埠",
        "image_source": "https://commons.wikimedia.org/wiki/File:3_Mace_postage_stamp_-_I-Chang_(1894-1896)_I.B.redguy.jpg",
    },
    {
        "catalog_no": "CQ-BT",
        "name": "重庆书信馆 报恩塔",
        "year": 1894,
        "theme": "商埠",
        "mark": "渝",
        "color": "#1d4ed8",
        "face_value": "2分—24分",
        "issuer": "重庆书信馆",
        "description": "报恩塔、江船和雪山。重庆书信馆一套五色，是商埠票里很好认的一套。",
        "image_path": "/stamps/cn-25.jpg",
        "image_license": "Public domain",
        "image_credit": "维基共享 / 重庆书信馆",
        "image_source": "https://commons.wikimedia.org/wiki/File:%E9%87%8D%E5%BA%86%E4%B9%A6%E4%BF%A1%E9%A6%86%E6%8A%A5%E6%81%A9%E5%A1%94%E9%82%AE%E7%A5%A8%EF%BC%8C%E5%8F%91%E8%A1%8C%E4%BA%8E1894%E5%B9%B411%E6%9C%88%EF%BC%8C%E9%9D%A2%E5%80%BC%EF%BC%9A2%E5%88%86-24%E5%88%86.jpg",
    },
    {
        "catalog_no": "TW-LM",
        "name": "台湾龙马图",
        "year": 1895,
        "theme": "地方",
        "mark": "马",
        "color": "#92400e",
        "face_value": "制钱",
        "issuer": "台湾邮政",
        "description": "龙马图是台湾早期邮票里最有辨识度的一张。龙、马和制钱面值写在同一枚纸上。",
        "image_path": "/stamps/cn-10.jpg",
        "image_license": "Public domain",
        "image_credit": "维基共享",
        "image_source": "https://commons.wikimedia.org/wiki/File:%E9%BE%8D%E9%A6%AC%E5%9C%96%E9%83%B5%E7%A5%A8.jpg",
    },
    {
        "catalog_no": "TW-LM-20",
        "name": "台湾龙马 贰拾文",
        "year": 1896,
        "theme": "地方",
        "mark": "马",
        "color": "#0f766e",
        "face_value": "20文",
        "issuer": "大清台湾邮政局",
        "description": "光绪二十二年台湾龙马高值。制钱贰拾文，票幅比大陆海关票更方。",
        "image_path": "/stamps/cn-11.png",
        "image_license": "Public domain",
        "image_credit": "维基共享 / 大清台湾邮政局",
        "image_source": "https://commons.wikimedia.org/wiki/File:20_W%C3%A9n_(%E5%88%B6%E9%8C%A2%E8%B2%B3%E6%8B%BE%E6%96%87)_-_Formosa,_Qing_Dynasty_(%E5%A4%A7%E6%B8%85%E8%87%BA%E7%81%A3%E9%83%B5%E6%94%BF%E5%B1%80)_stamp_(%E9%BE%8D%E9%A6%AC%E9%83%B5%E7%A5%A8)_-_1896%E5%B9%B4_(%E5%85%89%E7%B7%92%E4%BA%8C%E5%8D%81%E4%BA%8C%E5%B9%B4).png",
    },
    {
        "catalog_no": "QH-HYH-4",
        "name": "红印花加盖小肆分",
        "year": 1897,
        "theme": "加盖",
        "mark": "花",
        "color": "#b4232c",
        "face_value": "4分",
        "issuer": "大清邮政",
        "description": "印花税票改作邮资。红印花加盖是中国古典集邮的核心题目，小肆分是入门常见的一枚。",
        "image_path": "/stamps/cn-13.jpg",
        "image_license": "Public domain",
        "image_credit": "维基共享 / 大清邮政",
        "image_source": "https://commons.wikimedia.org/wiki/File:%E7%B4%85%E5%8D%B0%E8%8A%B1%E5%B0%8F4%E5%88%86%E9%83%B5%E7%A5%A8.jpg",
    },
    {
        "catalog_no": "QH-HYH-2",
        "name": "红印花加盖贰分",
        "year": 1897,
        "theme": "加盖",
        "mark": "花",
        "color": "#c2410c",
        "face_value": "2 cents",
        "issuer": "大清邮政",
        "description": "原为3 cents 印花，加盖改作贰分邮资。图为双连，齿孔和加盖位置都值得对着灯看。",
        "image_path": "/stamps/cn-14.jpg",
        "image_license": "Public domain",
        "image_credit": "维基共享 / 大清邮政",
        "image_source": "https://commons.wikimedia.org/wiki/File:Red_Maiden_in_the_Green_Robe_%EF%BC%88%E7%BB%BF%E8%A1%A3%E7%BA%A2%E5%A8%98%EF%BC%89.jpg",
    },
    {
        "catalog_no": "QH-HYH-A",
        "name": "红印花加盖",
        "year": 1897,
        "theme": "加盖",
        "mark": "花",
        "color": "#9f1239",
        "face_value": "加盖",
        "issuer": "大清邮政",
        "description": "红印花家族里的另一枚加盖。同一底票，不同加盖，就是不同的条目。",
        "image_path": "/stamps/cn-15.jpg",
        "image_license": "CC BY-SA 4.0",
        "image_credit": "维基共享（CC BY-SA 4.0）",
        "image_source": "https://commons.wikimedia.org/wiki/File:1897Red_1.jpg",
    },
    {
        "catalog_no": "QH-HYH-B",
        "name": "红印花加盖变体",
        "year": 1897,
        "theme": "加盖",
        "mark": "花",
        "color": "#be185d",
        "face_value": "加盖",
        "issuer": "大清邮政",
        "description": "加盖的墨色、位置和齿孔，是红印花专题里最花时间的部分。",
        "image_path": "/stamps/cn-16.jpg",
        "image_license": "CC BY-SA 4.0",
        "image_credit": "维基共享（CC BY-SA 4.0）",
        "image_source": "https://commons.wikimedia.org/wiki/File:1897Red_4.jpg",
    },
    {
        "catalog_no": "QH-1897-05",
        "name": "大清邮政 半分石印",
        "year": 1897,
        "theme": "普通",
        "mark": "清",
        "color": "#115e59",
        "face_value": "½分",
        "issuer": "大清邮政",
        "description": "国家邮政开办当年的低值石印票。新邮务刚从海关手里接过来时的痕迹。",
        "image_path": "/stamps/cn-12.jpg",
        "image_license": "Public domain",
        "image_credit": "维基共享 / 大清邮政",
        "image_source": "https://commons.wikimedia.org/wiki/File:Stamp_China_1897_0.5c_litho.jpg",
    },
    {
        "catalog_no": "CIP-PL-1",
        "name": "蟠龙 壹分",
        "year": 1898,
        "theme": "龙纹",
        "mark": "龙",
        "color": "#c2410c",
        "face_value": "1分",
        "issuer": "大清邮政",
        "description": "伦敦版蟠龙。圆框里一条龙，四角是壹分。从清末用到民初，是流通时间最长的龙票。",
        "image_path": "/stamps/cn-06.jpg",
        "image_license": "Public domain",
        "image_credit": "维基共享",
        "image_source": "https://commons.wikimedia.org/wiki/File:%E6%B8%85%E8%9F%A0%E9%BE%8D%E4%B8%80%E5%88%86%E6%96%B0%E7%A5%A8.jpg",
    },
    {
        "catalog_no": "CIP-PL-1902",
        "name": "蟠龙 无水印",
        "year": 1902,
        "theme": "龙纹",
        "mark": "龙",
        "color": "#1e3a8a",
        "face_value": "分",
        "issuer": "大清邮政",
        "description": "二十世纪初的蟠龙。水印有无、纸质厚薄，是这套票的分版乐趣。",
        "image_path": "/stamps/cn-22.jpg",
        "image_license": "CC0",
        "image_credit": "维基共享（CC0）",
        "image_source": "https://commons.wikimedia.org/wiki/File:1902_Chine_Yv67.jpg",
    },
    {
        "catalog_no": "QH-XT-1909",
        "name": "宣统登基纪念",
        "year": 1909,
        "theme": "纪念",
        "mark": "宣",
        "color": "#334155",
        "face_value": "分",
        "issuer": "大清邮政",
        "description": "宣统元年纪念票。末代皇帝登基那年的邮政纸，庙堂气很重。",
        "image_path": "/stamps/cn-23.jpg",
        "image_license": "Public domain",
        "image_credit": "维基共享 / 大清邮政",
        "image_source": "https://commons.wikimedia.org/wiki/File:CN_1909_MiNr0079_pm_B002a.jpg",
    },
    {
        "catalog_no": "QH-PY",
        "name": "宣统像",
        "year": 1909,
        "theme": "纪念",
        "mark": "宣",
        "color": "#7c2d12",
        "face_value": "分",
        "issuer": "大清邮政",
        "description": "溥仪像入票。清朝最后几年的面孔，也是古典集邮里很好认的一张。",
        "image_path": "/stamps/cn-24.jpg",
        "image_license": "CC BY-SA 4.0",
        "image_credit": "维基共享（CC BY-SA 4.0）",
        "image_source": "https://commons.wikimedia.org/wiki/File:Puyi_stamp.jpg",
    },
    {
        "catalog_no": "CIP-1910-2",
        "name": "蟠龙加盖 贰分",
        "year": 1910,
        "theme": "加盖",
        "mark": "盖",
        "color": "#0f766e",
        "face_value": "2分",
        "issuer": "大清邮政",
        "description": "在蟠龙底票上加盖改值。加盖是中国古典集邮里仅次于龙纹的一条主线。",
        "image_path": "/stamps/cn-17.png",
        "image_license": "Public domain",
        "image_credit": "维基共享",
        "image_source": "https://commons.wikimedia.org/wiki/File:Stamp_China_1910_2c_with_overprint.png",
    },
    {
        "catalog_no": "ROC-1912-30",
        "name": "中华民国加盖 叁角",
        "year": 1912,
        "theme": "加盖",
        "mark": "民",
        "color": "#1e40af",
        "face_value": "30分",
        "issuer": "中华民国",
        "description": "Waterlow 版蟠龙加盖「中华民国」。旧票换新朝，一枚纸上叠着两个时代。",
        "image_path": "/stamps/cn-18.jpg",
        "image_license": "Public domain",
        "image_credit": "维基共享",
        "image_source": "https://commons.wikimedia.org/wiki/File:Stamp_China_1912_30c_ovpt_Waterlow.jpg",
    },
    {
        "catalog_no": "ROC-LS-1",
        "name": "临时中立 中华民国",
        "year": 1912,
        "theme": "加盖",
        "mark": "立",
        "color": "#991b1b",
        "face_value": "加盖",
        "issuer": "中华民国",
        "description": "「临时中立」加盖。南北议和那几个月的邮政实验，存世叙事比票面更长。",
        "image_path": "/stamps/cn-19.jpg",
        "image_license": "Public domain",
        "image_credit": "维基共享 / 大清邮政底票",
        "image_source": "https://commons.wikimedia.org/wiki/File:%E5%8A%A0%E8%93%8B%E4%B8%AD%E8%8F%AF%E6%B0%91%E5%9C%8B%E8%87%A8%E6%99%82%E4%B8%AD%E7%AB%8B%E9%83%B5%E7%A5%A8.jpg",
    },
    {
        "catalog_no": "ROC-LS-2",
        "name": "临时中立加盖",
        "year": 1912,
        "theme": "加盖",
        "mark": "立",
        "color": "#9a3412",
        "face_value": "加盖",
        "issuer": "中华民国",
        "description": "临时中立的另一种加盖。和「中华民国」双行加盖对照着看，最有意思。",
        "image_path": "/stamps/cn-20.jpg",
        "image_license": "Public domain",
        "image_credit": "维基共享 / 大清邮政底票",
        "image_source": "https://commons.wikimedia.org/wiki/File:%E5%8A%A0%E8%93%8B%E8%87%A8%E6%99%82%E4%B8%AD%E7%AB%8B%E9%83%B5%E7%A5%A8.jpg",
    },
    {
        "catalog_no": "ROC-GH-3",
        "name": "共和纪念 叁分",
        "year": 1912,
        "theme": "纪念",
        "mark": "和",
        "color": "#115e59",
        "face_value": "3分",
        "issuer": "中华民国",
        "description": "中华民国共和纪念。票心是中国轮廓，英文写着 Chinese Republic Memorial Stamp。",
        "image_path": "/stamps/cn-21.jpg",
        "image_license": "Public domain",
        "image_credit": "维基共享 / 中华民国邮政",
        "image_source": "https://commons.wikimedia.org/wiki/File:Chinese_republic_memorial_stamp.jpg",
    },
]

USERS = [
    {
        "username": "fangcun",
        "display_name": "林方寸",
        "city": "杭州",
        "bio": "从海关大龙开始。现在做两个专题：龙纹，以及红印花加盖。",
        "password": "youlin123",
    },
    {
        "username": "achuo",
        "display_name": "阿戳",
        "city": "青岛",
        "bio": "商埠票和口岸实寄。票可以重复，戳不能将就。",
        "password": "youlin123",
    },
    {
        "username": "xiaofeng",
        "display_name": "小封",
        "city": "成都",
        "bio": "民初加盖和自制封。觉得一枚票被实寄过，才算真正走过一遭。",
        "password": "youlin123",
    },
    {
        "username": "miaopiao",
        "display_name": "喵票",
        "city": "上海",
        "bio": "龙马、红印花，以及一切圆眼睛的动物和花。",
        "password": "youlin123",
    },
]


def ensure_stamp_columns() -> None:
    inspector = inspect(engine)
    if "stamps" not in inspector.get_table_names():
        return
    cols = {col["name"] for col in inspector.get_columns("stamps")}
    additions = {
        "issuer": "VARCHAR(40) DEFAULT ''",
        "image_path": "VARCHAR(160) DEFAULT ''",
        "image_license": "VARCHAR(40) DEFAULT ''",
        "image_credit": "VARCHAR(160) DEFAULT ''",
        "image_source": "VARCHAR(240) DEFAULT ''",
    }
    with engine.begin() as conn:
        for name, ddl in additions.items():
            if name not in cols:
                conn.execute(text(f"ALTER TABLE stamps ADD COLUMN {name} {ddl}"))


def _stamp_by_catalog(db: Session, catalog_no: str) -> Stamp:
    return db.query(Stamp).filter(Stamp.catalog_no == catalog_no).one()


def _retire_old_catalog(db: Session) -> None:
    wanted = {row["catalog_no"] for row in STAMPS}
    leftovers = db.query(Stamp).filter(~Stamp.catalog_no.in_(wanted)).all()
    if not leftovers:
        return
    ids = [stamp.id for stamp in leftovers]
    post_ids = [row[0] for row in db.query(Post.id).filter(Post.stamp_id.in_(ids)).all()]
    if post_ids:
        db.query(PostLike).filter(PostLike.post_id.in_(post_ids)).delete(synchronize_session=False)
        db.query(Post).filter(Post.id.in_(post_ids)).delete(synchronize_session=False)
    db.query(CollectionItem).filter(CollectionItem.stamp_id.in_(ids)).delete(synchronize_session=False)
    db.query(Swap).filter(
        or_(Swap.offer_stamp_id.in_(ids), Swap.request_stamp_id.in_(ids))
    ).delete(synchronize_session=False)
    db.query(Stamp).filter(Stamp.id.in_(ids)).delete(synchronize_session=False)


def _sync_stamps(db: Session) -> None:
    for row in STAMPS:
        existing = db.query(Stamp).filter(Stamp.catalog_no == row["catalog_no"]).first()
        if existing:
            for key, value in row.items():
                setattr(existing, key, value)
        else:
            db.add(Stamp(**row))
    db.flush()
    _retire_old_catalog(db)


def _seed_demo_people(db: Session) -> None:
    demo_names = {row["username"] for row in USERS}
    users: dict[str, User] = {
        user.username: user
        for user in db.query(User).filter(User.username.in_(demo_names)).all()
    }
    if not users:
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
    else:
        by_name = {row["username"]: row for row in USERS}
        for username, user in users.items():
            row = by_name.get(username)
            if row:
                user.bio = row["bio"]

    demo_ids = [user.id for user in users.values()]
    if db.query(CollectionItem).filter(CollectionItem.user_id.in_(demo_ids)).first():
        return

    collections = [
        ("fangcun", "QH-DL-1", "own", "册子里的第一枚中国票"),
        ("fangcun", "QH-DL-3", "swap", "大龙复品，可换红印花"),
        ("fangcun", "CIP-PL-1", "own", "蟠龙新票"),
        ("fangcun", "QH-WS-4", "own", "万寿四分成色不错"),
        ("fangcun", "QH-HYH-4", "want", "一直缺小肆分"),
        ("fangcun", "ROC-GH-3", "want", ""),
        ("fangcun", "QH-DL-5", "swap", "伍分银复品"),
        ("achuo", "CQ-BT", "swap", "重庆书信馆复品"),
        ("achuo", "YC-1", "own", "宜昌商埠"),
        ("achuo", "YC-3M", "own", ""),
        ("achuo", "QH-YL", "swap", "云龙可换"),
        ("achuo", "QH-DL-5", "want", "大龙伍分银还缺"),
        ("achuo", "CIP-PL-1902", "own", ""),
        ("achuo", "QH-1897-05", "swap", ""),
        ("xiaofeng", "ROC-1912-30", "own", "民国加盖，成都人的义务"),
        ("xiaofeng", "ROC-LS-1", "own", ""),
        ("xiaofeng", "QH-DL-1", "want", "大龙只想要一枚能实寄的"),
        ("xiaofeng", "ROC-GH-3", "own", "共和纪念，手绘封素材"),
        ("xiaofeng", "ROC-LS-2", "swap", ""),
        ("xiaofeng", "QH-XT-1909", "own", ""),
        ("xiaofeng", "QH-WS-4", "want", "万寿想做极限"),
        ("miaopiao", "TW-LM", "own", "第一枚龙马"),
        ("miaopiao", "TW-LM-20", "swap", "贰拾文有复品"),
        ("miaopiao", "QH-HYH-2", "want", "红印花也算圆眼睛"),
        ("miaopiao", "QH-HYH-4", "own", ""),
        ("miaopiao", "QH-PY", "want", ""),
        ("miaopiao", "CIP-1910-2", "want", ""),
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
            "QH-DL-1",
            "第一次看见海关大龙，是在一本发黄的目录里。绿色的壹分银，云比龙还密。今天把它放进邮册第一页。",
        ),
        (
            "achuo",
            "CQ-BT",
            "重庆书信馆的报恩塔摊在灯下看，江船不是印出来的，是线条留出来的。下周想找一枚带日戳的。",
        ),
        (
            "xiaofeng",
            "ROC-1912-30",
            "蟠龙底票上盖着中华民国。一张纸叠着两个年号，比博物馆说明牌还短，也更真。",
        ),
        (
            "miaopiao",
            "TW-LM",
            "龙马图的眼睛比海关大龙更圆。我有一枚贰拾文复品，想换红印花小肆分。",
        ),
        (
            "fangcun",
            "CIP-PL-1",
            "蟠龙壹分是流通最久的龙票。票普通，齿孔是自己的。邮邻如果能把这种日子记住就好了。",
        ),
        (
            "achuo",
            "YC-1",
            "商埠票不一定要等口岸纪念日。普通日子贴上去，也是一张走过长江的纸。",
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


def seed_if_empty(db: Session) -> None:
    ensure_stamp_columns()
    _sync_stamps(db)
    _seed_demo_people(db)
    db.commit()
