"""Localized phrase templates for server-generated, per-user content
(notifications, certificates) that is never admin-edited — the recipient's
own `Language` picks which template renders, at the moment the row is created.
"""

from app.enums import Language, NotificationType

# Each entry: {Language: (title_template, message_template)}. Templates are
# `str.format`-style; the exact placeholder names depend on the notification
# type and must match the kwargs passed to `notify()` at each call site.
NOTIFICATION_TEMPLATES: dict[NotificationType, dict[Language, tuple[str, str]]] = {
    NotificationType.ARTIFACT_DISCOVERED: {
        Language.KAZAKH: ("Артефакт табылды", 'Сіз "{name}" артефактісін таптыңыз!'),
        Language.RUSSIAN: ("Артефакт обнаружен", 'Вы обнаружили артефакт «{name}»!'),
        Language.ENGLISH: ("Artifact discovered", 'You discovered "{name}"!'),
    },
    NotificationType.DAILY_REWARD: {
        Language.KAZAKH: (
            "Күнделікті сыйақы алынды",
            "{streak_days} күндік серия үшін +{bonus_xp} XP және +{bonus_coins} монета!",
        ),
        Language.RUSSIAN: (
            "Ежедневная награда получена",
            "+{bonus_xp} XP и +{bonus_coins} монет за серию в {streak_days} дн.!",
        ),
        Language.ENGLISH: (
            "Daily reward collected",
            "+{bonus_xp} XP and +{bonus_coins} coins for a {streak_days}-day streak!",
        ),
    },
    NotificationType.DAILY_QUEST_REFRESHED: {
        Language.KAZAKH: (
            "Тапсырмалар жаңартылды",
            "Бүгінгі тапсырмалар дайын — картадан жаңалықтарды қараңыз.",
        ),
        Language.RUSSIAN: (
            "Задания обновлены",
            "Сегодняшние задания готовы — посмотрите на карте, что нового.",
        ),
        Language.ENGLISH: (
            "Quests refreshed",
            "Today's quests are ready — check the map for what's new.",
        ),
    },
    NotificationType.ACHIEVEMENT_UNLOCKED: {
        Language.KAZAKH: (
            "Жетістік ашылды",
            '«{title}» жетістігі ашылды (+{reward_xp} XP, +{reward_coins} монета)!',
        ),
        Language.RUSSIAN: (
            "Достижение разблокировано",
            'Вы получили достижение «{title}» (+{reward_xp} XP, +{reward_coins} монет)!',
        ),
        Language.ENGLISH: (
            "Achievement unlocked",
            'You unlocked "{title}" (+{reward_xp} XP, +{reward_coins} coins)!',
        ),
    },
    NotificationType.QUEST_AVAILABLE: {
        Language.KAZAKH: ("Жаңа тапсырма қолжетімді", '«{title}» жаңа тапсырмасы енді қолжетімді!'),
        Language.RUSSIAN: ("Доступно новое задание", 'Новое задание «{title}» теперь доступно!'),
        Language.ENGLISH: ("New quest available", 'A new quest "{title}" is now available!'),
    },
    NotificationType.CERTIFICATE_READY: {
        Language.KAZAKH: ("Сертификат дайын", '«{title}» сертификатыңызды жүктеп алуға болады!'),
        Language.RUSSIAN: ("Сертификат готов", 'Ваш сертификат «{title}» готов к скачиванию!'),
        Language.ENGLISH: ("Certificate ready", 'Your certificate "{title}" is ready to download!'),
    },
    NotificationType.CITY_UNLOCKED: {
        Language.KAZAKH: ("Жаңа қала ашылды", '«{title}» енді сіздің саяхатыңызда қолжетімді!'),
        Language.RUSSIAN: ("Открыт новый город", 'Город «{title}» теперь доступен в вашем путешествии!'),
        Language.ENGLISH: ("New city unlocked", '"{title}" is now open on your journey!'),
    },
}


def render_notification(
    notification_type: NotificationType, language: Language, **kwargs: object
) -> tuple[str, str]:
    templates = NOTIFICATION_TEMPLATES[notification_type]
    title_template, message_template = templates.get(language, templates[Language.KAZAKH])
    return title_template.format(**kwargs), message_template.format(**kwargs)


# (title_template, description_template) — description takes {name} (recipient's
# display name) and {percent} (completion percentage).
CERTIFICATE_TEMPLATES: dict[Language, tuple[str, str]] = {
    Language.KAZAKH: (
        "ORDA Тарихи Саяхат сертификаты",
        "{name} ORDA Тарихи Саяхатының {percent}% аяқтағаны үшін марапатталды.",
    ),
    Language.RUSSIAN: (
        "Сертификат «ORDA: Историческое путешествие»",
        "{name} награждается за прохождение {percent}% Исторического путешествия ORDA.",
    ),
    Language.ENGLISH: (
        "ORDA Historical Journey Certificate",
        "Awarded to {name} for completing {percent}% of the ORDA Historical Journey.",
    ),
}


def render_certificate(language: Language, *, name: str, percent: int) -> tuple[str, str]:
    title_template, description_template = CERTIFICATE_TEMPLATES.get(
        language, CERTIFICATE_TEMPLATES[Language.KAZAKH]
    )
    return title_template, description_template.format(name=name, percent=percent)
