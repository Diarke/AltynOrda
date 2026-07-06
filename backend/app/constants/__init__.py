"""Application constants."""

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
MIN_PASSWORD_LENGTH = 8
MAX_CHAT_HISTORY_MESSAGES = 50
CERTIFICATE_MIN_COMPLETION_PERCENT = 80

# Player title ladder, unlocked in order as the user's level rises.
# Index 0 applies to level 1, index 1 to level 2, ... the last entry applies
# to that level and every level beyond it.
PLAYER_TITLES = (
    "Beginner",
    "Traveler",
    "Caravan Merchant",
    "Merchant",
    "Historian",
    "Archaeologist",
    "Advisor to the Khan",
    "Keeper of History",
)
