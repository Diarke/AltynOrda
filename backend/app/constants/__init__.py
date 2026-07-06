"""Application constants."""

from typing import NamedTuple

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
MIN_PASSWORD_LENGTH = 8
MAX_CHAT_HISTORY_MESSAGES = 50
CERTIFICATE_MIN_COMPLETION_PERCENT = 80

# SystemSetting key under which the admin-editable AI historian system prompt is stored.
AI_SYSTEM_PROMPT_SETTING_KEY = "ai_system_prompt"

# Player title ladder, unlocked in order as the user's level rises, per language.
# Index 0 applies to level 1, index 1 to level 2, ... the last entry applies
# to that level and every level beyond it.
PLAYER_TITLES: dict[str, tuple[str, ...]] = {
    "en": (
        "Beginner",
        "Traveler",
        "Caravan Merchant",
        "Merchant",
        "Historian",
        "Archaeologist",
        "Advisor to the Khan",
        "Keeper of History",
    ),
    "ru": (
        "Новичок",
        "Путешественник",
        "Караванщик",
        "Купец",
        "Историк",
        "Археолог",
        "Советник хана",
        "Хранитель истории",
    ),
    "kk": (
        "Жаңадан бастаушы",
        "Саяхатшы",
        "Керуенші",
        "Саудагер",
        "Тарихшы",
        "Археолог",
        "Хан кеңесшісі",
        "Тарих сақтаушысы",
    ),
}


class AvatarFrame(NamedTuple):
    key: str
    cost_coins: int
    names: dict[str, str]


# Cosmetic avatar frames unlockable with coins. "default" is free and always owned.
AVATAR_FRAME_CATALOG: tuple[AvatarFrame, ...] = (
    AvatarFrame(
        key="default",
        cost_coins=0,
        names={"en": "Traveler's Frame", "ru": "Рамка путника", "kk": "Саяхатшы жиегі"},
    ),
    AvatarFrame(
        key="bronze",
        cost_coins=150,
        names={"en": "Bronze Frame", "ru": "Бронзовая рамка", "kk": "Қола жиек"},
    ),
    AvatarFrame(
        key="silver",
        cost_coins=350,
        names={"en": "Silver Frame", "ru": "Серебряная рамка", "kk": "Күміс жиек"},
    ),
    AvatarFrame(
        key="gold",
        cost_coins=700,
        names={"en": "Gold Frame", "ru": "Золотая рамка", "kk": "Алтын жиек"},
    ),
    AvatarFrame(
        key="royal",
        cost_coins=1200,
        names={"en": "Khan's Frame", "ru": "Ханская рамка", "kk": "Хан жиегі"},
    ),
)
