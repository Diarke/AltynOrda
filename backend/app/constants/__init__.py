"""Application constants."""

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
MIN_PASSWORD_LENGTH = 8
MAX_CHAT_HISTORY_MESSAGES = 50
CERTIFICATE_MIN_COMPLETION_PERCENT = 80

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
