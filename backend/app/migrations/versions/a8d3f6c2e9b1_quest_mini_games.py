"""Add `game_type`/`game_data` to quests for interactive mini-games (Khan's
Court true/false, Chronograph event-ordering, Caravan Builder goods-picking),
replacing the plain instant-complete button for a handful of quests. Backfills
real content onto three existing Otrar quests so it's playable immediately.

Revision ID: a8d3f6c2e9b1
Revises: f2b6d94a1c7e
Create Date: 2026-07-10 09:00:00.000000
"""

import json

import sqlalchemy as sa
from alembic import op

revision = "a8d3f6c2e9b1"
down_revision = "f2b6d94a1c7e"
branch_labels = None
depends_on = None


KHANS_COURT_DATA = {
    "statements": [
        {
            "text_en": "The northern Silk Road route passed through Otrar.",
            "text_ru": "Северный маршрут Шёлкового пути проходил через Отрар.",
            "text_kk": "Жібек жолының солтүстік бағыты Отырар арқылы өтті.",
            "answer": True,
        },
        {
            "text_en": "The execution of a Mongol trade caravan at Otrar in 1218 triggered Genghis Khan's invasion of Khwarezm.",
            "text_ru": "Казнь монгольского торгового каравана в Отраре в 1218 году спровоцировала вторжение Чингисхана в Хорезм.",
            "text_kk": "1218 жылы Отырарда моңғол сауда керуенінің өлтірілуі Шыңғысханның Хорезмге басып кіруіне түрткі болды.",
            "answer": True,
        },
        {
            "text_en": "The philosopher Al-Farabi is traditionally said to have been born in the Otrar region.",
            "text_ru": "Философ Аль-Фараби, по преданию, родился в районе Отрара.",
            "text_kk": "Философ Әл-Фараби дәстүр бойынша Отырар өңірінде дүниеге келген делінеді.",
            "answer": True,
        },
        {
            "text_en": "Otrar was the capital city of the Golden Horde.",
            "text_ru": "Отрар был столицей Золотой Орды.",
            "text_kk": "Отырар Алтын Орданың астанасы болды.",
            "answer": False,
        },
        {
            "text_en": "Timur (Tamerlane) died near Otrar in 1405 while on campaign.",
            "text_ru": "Тимур (Тамерлан) умер близ Отрара в 1405 году во время похода.",
            "text_kk": "Тимур (Ақсақ Темір) 1405 жылы жорық кезінде Отырар маңында қайтыс болды.",
            "answer": True,
        },
    ]
}

CHRONOGRAPH_DATA = {
    "events": [
        {
            "text_en": "Otrar is founded as an oasis city along the Syr Darya.",
            "text_ru": "Отрар основан как город-оазис на берегу Сырдарьи.",
            "text_kk": "Отырар Сырдария бойындағы оазис қала ретінде негізделді.",
            "order": 1,
        },
        {
            "text_en": "Otrar grows into a major Silk Road caravan hub linking Central Asia to the Golden Horde.",
            "text_ru": "Отрар превращается в крупный караванный узел Шёлкового пути, связывающий Среднюю Азию с Золотой Ордой.",
            "text_kk": "Отырар Орталық Азияны Алтын Ордамен байланыстыратын Жібек жолының ірі керуен торабына айналады.",
            "order": 2,
        },
        {
            "text_en": "The Mongols besiege and destroy Otrar in 1219–1220 after the Otrar Incident.",
            "text_ru": "Монголы осаждают и разрушают Отрар в 1219–1220 годах после Отрарского инцидента.",
            "text_kk": "Отырар оқиғасынан кейін моңғолдар 1219–1220 жылдары Отырарды қоршап, қиратады.",
            "order": 3,
        },
        {
            "text_en": "Otrar gradually declines and is eventually abandoned in later centuries.",
            "text_ru": "Отрар постепенно приходит в упадок и в итоге был покинут в последующие века.",
            "text_kk": "Отырар бірте-бірте құлдырап, кейінгі ғасырларда тасталды.",
            "order": 4,
        },
    ]
}

CARAVAN_BUILDER_DATA = {
    "goods": [
        {"key": "silk", "label_en": "Silk", "label_ru": "Шёлк", "label_kk": "Жібек", "correct": True},
        {"key": "fur", "label_en": "Fur", "label_ru": "Мех", "label_kk": "Аң терісі", "correct": True},
        {"key": "ceramics", "label_en": "Ceramics", "label_ru": "Керамика", "label_kk": "Керамика", "correct": True},
        {"key": "spices", "label_en": "Spices", "label_ru": "Пряности", "label_kk": "Дәмдеуіштер", "correct": True},
        {"key": "potatoes", "label_en": "Potatoes", "label_ru": "Картофель", "label_kk": "Картоп", "correct": False},
        {"key": "oil", "label_en": "Oil", "label_ru": "Нефть", "label_kk": "Мұнай", "correct": False},
    ]
}


def upgrade() -> None:
    op.add_column("quests", sa.Column("game_type", sa.String(30), nullable=True))
    op.add_column("quests", sa.Column("game_data", sa.Text(), nullable=True))

    quests = sa.table(
        "quests",
        sa.column("title_en", sa.String),
        sa.column("game_type", sa.String),
        sa.column("game_data", sa.Text),
    )
    # SQLAlchemy's `Enum(..., native_enum=False)` stores the Python enum
    # member's *name* (uppercase), not its `.value` — matches how every other
    # enum-backed column in this app (role, language, journey, ...) is stored.
    op.execute(
        quests.update()
        .where(quests.c.title_en == "Silk Road Ledger")
        .values(game_type="KHANS_COURT", game_data=json.dumps(KHANS_COURT_DATA))
    )
    op.execute(
        quests.update()
        .where(quests.c.title_en == "Citadel Excavation")
        .values(game_type="CHRONOGRAPH", game_data=json.dumps(CHRONOGRAPH_DATA))
    )
    op.execute(
        quests.update()
        .where(quests.c.title_en == "The Fatal Caravan")
        .values(game_type="CARAVAN_BUILDER", game_data=json.dumps(CARAVAN_BUILDER_DATA))
    )


def downgrade() -> None:
    op.drop_column("quests", "game_data")
    op.drop_column("quests", "game_type")
