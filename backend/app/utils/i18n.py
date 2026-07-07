"""Helpers for resolving `<field>_kk`/`<field>_ru`/`<field>_en` suffixed columns
down to a single value for the requested language, falling back to Kazakh
(the product default), then to whatever language actually has content — so a
required field never resolves to `None` just because a translation hasn't
been filled in yet.
"""

from typing import Any

from app.enums import Language


def resolve_localized(obj: Any, field: str, language: Language) -> Any:
    """Works for both scalar text fields and JSON list fields (e.g. `historical_facts`)."""
    value = getattr(obj, f"{field}_{language.value}")
    if value:
        return value
    for fallback in (Language.KAZAKH, Language.ENGLISH, Language.RUSSIAN):
        value = getattr(obj, f"{field}_{fallback.value}")
        if value:
            return value
    return None
