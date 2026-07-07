"""Seed the default ORDA dataset: cities, artifacts, galleries, quests,
achievement definitions, suggested AI-historian prompts, and homepage stats.

All content is written to the database — nothing here is read directly by the
frontend; it exists purely to populate the tables the app already reads from,
and everything it creates remains editable via the admin panel afterward.

Run with:  python -m app.scripts.seed_data
Safe to re-run: each section is skipped if that table already has rows.
"""

import asyncio
import logging
import uuid
from urllib.parse import quote_plus

from sqlalchemy import func, select

from app.database.redis import close_redis, get_redis_client
from app.database.session import dispose_engine, get_session_factory
from app.enums import AchievementMetric, Language
from app.models.achievement_definition import AchievementDefinition
from app.models.artifact import Artifact
from app.models.city import City
from app.models.gallery_image import GalleryImage
from app.models.homepage_content import HomepageContent
from app.models.quest import Quest
from app.models.suggested_prompt import SuggestedPrompt

# Mirrors CityService.CITIES_CACHE_KEY — duplicated here (rather than imported) to
# avoid pulling in the full `app.services` package graph from a standalone script.
CITIES_CACHE_KEY = "orda:cities:all"

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("seed_data")


def placeholder_image(text: str, bg: str = "14171F", fg: str = "D4AF37", size: str = "800x600") -> str:
    """A stable placeholder image URL, editable later via the admin panel."""
    encoded = quote_plus(text)
    return f"https://placehold.co/{size}/{bg}/{fg}?text={encoded}&font=playfair-display"


# ─────────────────────────────────────────────────────────────────────────────
# Cities
# ─────────────────────────────────────────────────────────────────────────────

CITIES = [
    {
        "name": "Sarai Batu",
        "slug": "sarai-batu",
        "historical_period": "1240s – 1360s",
        "latitude": 47.86,
        "longitude": 46.85,
        "population_estimate": "75,000 – 100,000 at its 14th-century peak",
        "description": (
            "Sarai Batu (\"Old Sarai\") was founded by Batu Khan around 1242 on the "
            "lower Volga (Akhtuba channel) as the first capital of the Ulus of Jochi, "
            "the westernmost khanate of the Mongol Empire. Within a century it grew "
            "into one of the largest cities on Earth, with quarters for Mongol, "
            "Kipchak, Alan, Russian, Armenian, and Italian communities, its own mint, "
            "monumental palaces, mosques, and a network of caravanserais serving "
            "merchants from Cairo to Beijing."
        ),
        "significance": (
            "As the seat of the khans, Sarai Batu was the political heart of the "
            "Golden Horde and the northern terminus of the Silk Road's steppe route, "
            "where Mongol administration, Islamic scholarship, and Eurasian trade met."
        ),
        "historical_facts": [
            "Founded c. 1242 by Batu Khan, grandson of Genghis Khan, after his campaigns in Europe.",
            "Visited by the Franciscan friar William of Rubruck (1253) and the Moroccan traveler Ibn Battuta (1330s), both of whom left detailed accounts of its size and diversity.",
            "Minted its own silver and copper coinage, some of the most widely circulated currency in medieval Eurasia.",
            "Housed distinct quarters for different peoples and faiths, reflecting the Golden Horde's religious tolerance under Mongol rule.",
            "Gradually eclipsed by Sarai al-Jadid (\"New Sarai\") downstream in the 14th century before both cities declined after Timur's raids in 1395.",
        ],
        "trade_info": (
            "Sarai Batu sat at the crossing point of the Volga trade artery and the "
            "steppe roads linking the Black Sea ports to Central Asia and China. "
            "Caravans passing through carried Chinese silk and porcelain, Persian "
            "textiles, Rus' furs and honey, and Central Asian horses, while the city's "
            "mint fed a monetary economy that Genoese and Venetian merchants from Kaffa "
            "and Tana relied on for bullion exchange."
        ),
        "image_url": placeholder_image("Sarai Batu"),
    },
    {
        "name": "Sarayshyk",
        "slug": "sarayshyk",
        "historical_period": "1250s – 1580s",
        "latitude": 47.05,
        "longitude": 51.90,
        "population_estimate": "10,000 – 15,000",
        "description": (
            "Sarayshyk (\"little Sarai\") grew up on the banks of the Ural (Zhaiyq) "
            "River as a waystation between Sarai Batu and the trade routes running "
            "north to the Kama and east toward Central Asia. Smaller than the twin "
            "capitals, it endured far longer than either, later serving as a capital "
            "of the Nogai Horde and the early Kazakh Khanate."
        ),
        "significance": (
            "Sarayshyk's strength was its position: a reliable river crossing and "
            "caravanserai stop that let it outlive the Golden Horde's great capitals "
            "by over a century, bridging the steppe empires that followed it."
        ),
        "historical_facts": [
            "Served as a key crossing point on the Ural River for caravans moving between the Volga and Central Asia.",
            "Became, in the 15th–16th centuries, an early capital associated with the Nogai Horde and the nascent Kazakh Khanate.",
            "Excavations have uncovered coin hoards, ceramics, and burial sites spanning several centuries of continuous habitation.",
            "Its name — a diminutive of \"Sarai\" — reflects its role as a smaller sister city to the Golden Horde's grand capitals.",
            "Repeatedly rebuilt after river flooding and raids, until it was finally abandoned in the late 16th century.",
        ],
        "trade_info": (
            "Positioned on the Ural River crossing, Sarayshyk taxed and provisioned "
            "caravans carrying furs and honey from the north, livestock and horses "
            "from the steppe, and manufactured goods moving between Sarai and Khwarezm, "
            "making it a modest but steady customs and rest stop on the northern Silk Road."
        ),
        "image_url": placeholder_image("Sarayshyk"),
    },
    {
        "name": "Otrar",
        "slug": "otrar",
        "historical_period": "9th – 16th centuries (Golden Horde era: 1220s – 1430s)",
        "latitude": 42.85,
        "longitude": 68.30,
        "population_estimate": "15,000 – 20,000",
        "description": (
            "Otrar was an ancient oasis city on the Syr Darya, long a center of "
            "learning and trade before the Mongol era — traditionally held to be the "
            "birthplace of the philosopher Al-Farabi. In 1219, the execution of a "
            "Mongol trade caravan by Otrar's governor gave Genghis Khan his pretext to "
            "invade Khwarezm; the city was besieged and razed, then rebuilt to serve "
            "the Chagatai Khanate and later the Golden Horde as a Syr Darya river-trade hub."
        ),
        "significance": (
            "Otrar's fate changed world history: its governor's fatal decision "
            "triggered the Mongol conquest of Central Asia. Rebuilt, it became a "
            "meeting point of Turkic, Persian, and Mongol culture on the Silk Road."
        ),
        "historical_facts": [
            "Traditionally regarded as the birthplace of the 10th-century philosopher and polymath Abu Nasr Al-Farabi.",
            "The 1219 Otrar incident — the killing of a Mongol trade mission — directly provoked Genghis Khan's invasion of the Khwarezmian Empire.",
            "The city was besieged for months and largely destroyed before being rebuilt under Mongol and later Golden Horde rule.",
            "Timur (Tamerlane) died at Otrar in February 1405 while preparing a campaign against Ming China.",
            "Extensive archaeological excavations since the 1970s have revealed a citadel, mosques, bathhouses, and craft workshops.",
        ],
        "trade_info": (
            "Otrar controlled a key Syr Darya crossing on the Silk Road between "
            "Transoxiana and the Kazakh steppe, taxing caravans carrying textiles, "
            "manuscripts, ceramics, and metalwork moving between Samarkand, Sygnak, "
            "and the cities of the Golden Horde."
        ),
        "image_url": placeholder_image("Otrar"),
    },
    {
        "name": "Sygnak",
        "slug": "sygnak",
        "historical_period": "11th – 16th centuries (White Horde capital, 1330s – 1420s)",
        "latitude": 44.85,
        "longitude": 66.53,
        "population_estimate": "10,000 – 15,000",
        "description": (
            "Sygnak (Signaq) stood on the middle Syr Darya as the principal city of "
            "the Kipchak steppe's Turkic population before becoming, in the 14th "
            "century, the capital of the White Horde (Ak Orda) — the eastern wing of "
            "the Jochid realm from which the Kazakh Khanate would later emerge."
        ),
        "significance": (
            "As the White Horde's seat, Sygnak was a political bridge between the "
            "nomadic steppe aristocracy and the settled river-trade towns of the Syr "
            "Darya, and a direct ancestor city in Kazakh state formation."
        ),
        "historical_facts": [
            "Became the capital of the White Horde (Ak Orda) under Erzen Khan in the early 14th century.",
            "Served as the coronation seat where Abu'l-Khayr Khan and later Kazakh khans were proclaimed rulers.",
            "Functioned as a customs and caravan town controlling river-crossing trade along the Syr Darya.",
            "Its ruins near modern Sozak, Kazakhstan, have been studied since the 19th century.",
            "Declined after the rise of neighboring Sauran and the shifting of trade routes in the 16th century.",
        ],
        "trade_info": (
            "Sygnak taxed and hosted caravans moving wool, livestock, and hides from "
            "the steppe in exchange for grain, textiles, and craft goods from the Syr "
            "Darya oasis towns, anchoring the White Horde's fragile settled-nomadic economy."
        ),
        "image_url": placeholder_image("Sygnak"),
    },
    {
        "name": "Bolgar",
        "slug": "bolgar",
        "historical_period": "10th – 15th centuries (Golden Horde era: 1240s – 1430s)",
        "latitude": 54.97,
        "longitude": 49.05,
        "population_estimate": "50,000 at its 14th-century peak",
        "description": (
            "Bolgar (Bulgar) was the historic capital of Volga Bulgaria, an early "
            "Muslim state on the middle Volga. Conquered by the Mongols in 1236, it "
            "was rebuilt as one of the Golden Horde's most important northern cities, "
            "prized for its mosques, mausoleums, and its role as a hub linking the "
            "Horde to the fur-rich forests of the north."
        ),
        "significance": (
            "Bolgar was a center of Islamic scholarship and craftsmanship in the "
            "Horde's northern territories, and its ruins remain a place of pilgrimage "
            "— the \"Small Hajj\" — for Volga-region Muslims to this day."
        ),
        "historical_facts": [
            "Volga Bulgaria formally adopted Islam in 922, making Bolgar one of the earliest Muslim urban centers in Eastern Europe.",
            "Destroyed by Mongol forces under Batu Khan's commanders in 1236, then rebuilt as a Golden Horde administrative city.",
            "Its surviving White Mosque and Great Minaret are among the best-preserved Golden Horde-era monuments anywhere.",
            "Functioned as a mint city producing silver dirhams for the Horde's northern territories.",
            "Recognized by UNESCO as a World Heritage Site (Bolgar Historical and Archaeological Complex) in 2014.",
        ],
        "trade_info": (
            "Bolgar was the Golden Horde's gateway to the fur trade of the northern "
            "forests, exchanging sable, ermine, and honey from Rus' and Finno-Ugric "
            "lands for silver, textiles, and manufactured goods flowing up the Volga "
            "from Sarai and beyond."
        ),
        "image_url": placeholder_image("Bolgar"),
    },
    {
        "name": "Crimea",
        "slug": "crimea",
        "historical_period": "1260s – 1440s (Golden Horde provincial capital)",
        "latitude": 45.03,
        "longitude": 35.37,
        "population_estimate": "20,000 – 30,000",
        "description": (
            "Qirim (modern Staryi Krym, \"Old Crimea\"), which gave its name to the "
            "entire peninsula, served as the Golden Horde's provincial capital on the "
            "Black Sea coast. Its fortunes were intertwined with the nearby Genoese "
            "trading colony of Kaffa, making the province a meeting place of Mongol "
            "administration, Italian merchant capital, and Black Sea commerce."
        ),
        "significance": (
            "Crimea was the Golden Horde's window onto the Mediterranean world, where "
            "khans taxed and protected Genoese and Venetian trading posts in exchange "
            "for a share of the immense wealth flowing through the Black Sea ports."
        ),
        "historical_facts": [
            "Gave its name to the entire Crimean peninsula, and later to the independent Crimean Khanate that succeeded Golden Horde rule there.",
            "Governed the province that included the Genoese colony of Kaffa (modern Feodosia), one of the Black Sea's busiest trading ports.",
            "A key node on the Genoese and Venetian trade network linking the Golden Horde to Constantinople and the Mediterranean.",
            "Home to a large multi-confessional population of Mongols, Armenians, Greeks, and Italians.",
            "Its mosque of Sultan Uzbek (built 1314) remains one of the oldest surviving Islamic monuments in Crimea.",
        ],
        "trade_info": (
            "Through the Genoese port of Kaffa, Crimea channeled Central Asian and "
            "Persian silk, spices, and slaves into Mediterranean markets, while Black "
            "Sea grain, salt, and Italian manufactured goods flowed back into the "
            "Horde — a customs relationship that made Crimea one of the richest "
            "provinces in the entire khanate."
        ),
        "image_url": placeholder_image("Crimea"),
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# Artifacts — 3 per category x 10 categories = 30, spread across the 6 cities
# ─────────────────────────────────────────────────────────────────────────────

ARTIFACTS = [
    # Coins
    {
        "city_slug": "sarai-batu", "name": "Silver Dirham of Öz Beg Khan",
        "era": "14th century, reign of Öz Beg Khan", "rarity": "rare",
        "description": "A hand-struck silver dirham bearing the khan's tamgha and Arabic minting inscription, struck at the Sarai mint during the Golden Horde's economic and territorial peak.",
        "historical_context": "Öz Beg Khan's currency reforms standardized coinage across the Horde and financed its 14th-century golden age.",
    },
    {
        "city_slug": "sarayshyk", "name": "Copper Pul of Toqta Khan",
        "era": "Late 13th – early 14th century", "rarity": "common",
        "description": "A small copper coin used for everyday transactions at the Sarayshyk river crossing, worth a fraction of a silver dirham.",
        "historical_context": "Copper pul coinage supported local trade while silver dirhams handled larger, long-distance exchanges.",
    },
    {
        "city_slug": "crimea", "name": "Genoese-Tatar Trade Dinar",
        "era": "14th century", "rarity": "legendary",
        "description": "A rare gold coin combining Mongol tamgha markings with Genoese minting techniques, evidence of the close commercial ties between Qirim and Kaffa.",
        "historical_context": "Such hybrid coinage reflects the unusual partnership between Mongol overlords and Italian merchant colonies on the Black Sea.",
    },
    # Armor
    {
        "city_slug": "sygnak", "name": "Lamellar Cuirass Plates",
        "era": "13th – 14th century", "rarity": "rare",
        "description": "Laced iron lamellar plates from a steppe warrior's cuirass, designed for flexibility on horseback.",
        "historical_context": "Lamellar armor was standard among Golden Horde cavalry, balancing protection with the mobility nomadic warfare demanded.",
    },
    {
        "city_slug": "otrar", "name": "Mongol Horseman's Helmet",
        "era": "13th century", "rarity": "legendary",
        "description": "A conical iron helmet with a mail aventail, recovered near Otrar's citadel walls.",
        "historical_context": "This helmet style, adapted from earlier steppe traditions, spread across Eurasia with Mongol conquests.",
    },
    {
        "city_slug": "bolgar", "name": "Chainmail Hauberk Fragment",
        "era": "13th – 14th century", "rarity": "common",
        "description": "A section of riveted chainmail, likely traded north from Golden Horde armories in exchange for furs.",
        "historical_context": "Bolgar's smiths adapted Mongol and Rus' metalworking techniques for the northern frontier market.",
    },
    # Jewelry
    {
        "city_slug": "sarai-batu", "name": "Gold Torque with Granulation",
        "era": "14th century", "rarity": "legendary",
        "description": "An intricately granulated gold neck torque worn by Sarai's nobility, showcasing the city's skilled jewelers.",
        "historical_context": "Sarai's workshops blended Persian, Chinese, and steppe artistic traditions into a distinctive Golden Horde style.",
    },
    {
        "city_slug": "sarayshyk", "name": "Turquoise-Inlaid Earrings",
        "era": "14th – 15th century", "rarity": "rare",
        "description": "A pair of crescent-shaped silver earrings set with turquoise, typical of steppe nomadic adornment.",
        "historical_context": "Turquoise, traded from Central Asian mines, was prized across the Golden Horde for its protective symbolism.",
    },
    {
        "city_slug": "crimea", "name": "Silver Belt Plaques",
        "era": "14th century", "rarity": "rare",
        "description": "Ornamental silver plaques from a ceremonial belt, a key marker of status among Mongol-era elites.",
        "historical_context": "Belt plaques signified military rank and were often gifted by khans to loyal commanders.",
    },
    # Silk
    {
        "city_slug": "sarai-batu", "name": "Chinese Silk Brocade Fragment",
        "era": "14th century", "rarity": "legendary",
        "description": "A fragment of gold-threaded silk brocade (nasij) imported along the Silk Road, likely used in a noble's garment.",
        "historical_context": "Nasij cloth-of-gold was a favored diplomatic gift among Mongol khanates, symbolizing wealth and connection to the Yuan court.",
    },
    {
        "city_slug": "otrar", "name": "Persian Silk Sash",
        "era": "13th – 14th century", "rarity": "rare",
        "description": "A woven silk sash with Persian floral motifs, traded through Otrar's Silk Road markets.",
        "historical_context": "Otrar's position on the Syr Darya made it a key exchange point for Persian and Central Asian textiles.",
    },
    {
        "city_slug": "sygnak", "name": "Embroidered Silk Banner",
        "era": "14th century", "rarity": "common",
        "description": "A remnant of an embroidered ceremonial banner, likely used in a Sygnak court procession.",
        "historical_context": "Banners like this marked the authority of White Horde khans during public ceremonies.",
    },
    # Maps
    {
        "city_slug": "crimea", "name": "Genoese Portolan Chart Fragment",
        "era": "14th century", "rarity": "legendary",
        "description": "A fragment of a nautical portolan chart marking Black Sea ports and the overland route to Sarai.",
        "historical_context": "Genoese cartographers in Kaffa produced some of the most accurate charts of the Golden Horde's trade world.",
    },
    {
        "city_slug": "otrar", "name": "Silk Road Itinerary Scroll",
        "era": "13th century", "rarity": "rare",
        "description": "A merchant's itinerary scroll listing waystations, distances, and caravanserai between Otrar and Samarkand.",
        "historical_context": "Such itineraries were essential tools for merchants navigating the vast distances of the Silk Road.",
    },
    {
        "city_slug": "sarayshyk", "name": "Ural River Waypoint Chart",
        "era": "14th century", "rarity": "common",
        "description": "A hand-drawn chart marking river crossings and caravan stops along the Ural River near Sarayshyk.",
        "historical_context": "Waypoint charts like this helped caravans time their crossings around seasonal flooding.",
    },
    # Letters
    {
        "city_slug": "sarai-batu", "name": "Yarlik Decree Fragment",
        "era": "14th century", "rarity": "legendary",
        "description": "A fragment of a khan's yarlik — an official decree granting tax exemptions to a religious institution.",
        "historical_context": "Yarliks were the Golden Horde's primary instrument of law, famously used to grant privileges to the Russian Orthodox Church.",
    },
    {
        "city_slug": "sarayshyk", "name": "Merchant Correspondence in Uyghur Script",
        "era": "14th century", "rarity": "rare",
        "description": "A merchant's business letter written in the Uyghur script used for Mongol administrative correspondence.",
        "historical_context": "Uyghur script was adopted by the Mongol chancellery for record-keeping across the empire's vast bureaucracy.",
    },
    {
        "city_slug": "crimea", "name": "Diplomatic Letter to Mamluk Egypt",
        "era": "14th century", "rarity": "legendary",
        "description": "A draft of a diplomatic letter proposing an alliance with the Mamluk Sultanate against the Ilkhanate.",
        "historical_context": "The Golden Horde and Mamluk Egypt maintained a long alliance rooted in shared rivalry with the Ilkhanids of Persia.",
    },
    # Weapons
    {
        "city_slug": "sygnak", "name": "Composite Recurve Bow",
        "era": "13th – 14th century", "rarity": "legendary",
        "description": "A laminated horn-and-sinew recurve bow, the signature weapon of Mongol and Kipchak horse archers.",
        "historical_context": "This bow design gave steppe cavalry devastating range and power, a decisive advantage in Mongol conquests.",
    },
    {
        "city_slug": "otrar", "name": "Mongol Saber",
        "era": "13th century", "rarity": "rare",
        "description": "A curved single-edged saber recovered near Otrar's siege works, likely dating to the 1219–1220 conquest.",
        "historical_context": "The curved saber design proved highly effective for mounted combat and spread widely across Eurasia.",
    },
    {
        "city_slug": "bolgar", "name": "Iron-Tipped Lance",
        "era": "13th – 14th century", "rarity": "common",
        "description": "A cavalry lance head from Bolgar's northern garrisons, used to defend the Horde's forest frontier.",
        "historical_context": "Bolgar's garrisons protected the lucrative fur trade routes from raids by northern forest peoples.",
    },
    # Pottery
    {
        "city_slug": "bolgar", "name": "Glazed Bowl with Sufi Calligraphy",
        "era": "14th century", "rarity": "rare",
        "description": "A turquoise-glazed ceramic bowl inscribed with a Sufi poetic verse, reflecting Bolgar's Islamic scholarly culture.",
        "historical_context": "Bolgar was a center of Islamic learning, and its potters often decorated wares with religious and poetic texts.",
    },
    {
        "city_slug": "sarai-batu", "name": "Kashan-Style Tile Fragment",
        "era": "14th century", "rarity": "legendary",
        "description": "A luster-painted tile fragment in the Persian Kashan style, likely used to decorate a palace wall.",
        "historical_context": "Persian craftsmen brought to Sarai by the khans introduced luxurious architectural tilework to the Horde's capital.",
    },
    {
        "city_slug": "otrar", "name": "Blue-Glazed Jug",
        "era": "13th – 14th century", "rarity": "common",
        "description": "A cobalt-blue glazed water jug typical of Central Asian household pottery of the period.",
        "historical_context": "Blue-glazed wares were a hallmark of Central Asian ceramic traditions that flourished under Mongol patronage.",
    },
    # Horse equipment
    {
        "city_slug": "sygnak", "name": "Ornamented Stirrups",
        "era": "13th – 14th century", "rarity": "rare",
        "description": "A pair of bronze stirrups with incised geometric ornament, belonging to a steppe cavalryman.",
        "historical_context": "The stirrup was central to Mongol horsemanship, enabling the stability needed for mounted archery.",
    },
    {
        "city_slug": "sarayshyk", "name": "Bronze Bridle Bit",
        "era": "13th – 14th century", "rarity": "common",
        "description": "A jointed bronze bridle bit from a Sarayshyk waystation stable, worn smooth from daily use.",
        "historical_context": "Reliable horse equipment was essential for the relay stations (yam) that carried messages across the empire.",
    },
    {
        "city_slug": "crimea", "name": "Silver-Inlaid Saddle Plate",
        "era": "14th century", "rarity": "legendary",
        "description": "A ceremonial saddle plate inlaid with silver wire, likely belonging to a high-ranking official in Crimea.",
        "historical_context": "Elaborate saddle fittings signified rank among Golden Horde officials and Genoese trade partners alike.",
    },
    # Books
    {
        "city_slug": "bolgar", "name": "Qur'an Manuscript Page",
        "era": "14th century", "rarity": "legendary",
        "description": "An illuminated page from a hand-copied Qur'an, produced in one of Bolgar's madrasas.",
        "historical_context": "Bolgar's madrasas were centers of Islamic learning that served the Golden Horde's northern Muslim communities.",
    },
    {
        "city_slug": "otrar", "name": "Astronomical Treatise Fragment",
        "era": "13th – 14th century", "rarity": "rare",
        "description": "A fragment of an astronomical treatise, continuing the scholarly tradition associated with Otrar's native son Al-Farabi.",
        "historical_context": "Otrar's intellectual heritage endured through the Mongol period in the region's madrasas and observatories.",
    },
    {
        "city_slug": "sarai-batu", "name": "Chronicle Fragment on Jochid Genealogy",
        "era": "14th century", "rarity": "rare",
        "description": "A fragment of a chronicle recording the genealogy of the Jochid khans descended from Genghis Khan's eldest son.",
        "historical_context": "Genealogical chronicles legitimized a khan's right to rule and were carefully maintained at the Sarai court.",
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# Quests — difficulty tiers scale rewards/cooldown/time consistently
# ─────────────────────────────────────────────────────────────────────────────

_QUEST_TIERS = {
    "easy": {"points": 60, "xp_reward": 75, "coin_reward": 10, "cooldown_hours": 4, "estimated_time_minutes": 8},
    "medium": {"points": 150, "xp_reward": 180, "coin_reward": 25, "cooldown_hours": 18, "estimated_time_minutes": 15},
    "hard": {"points": 320, "xp_reward": 400, "coin_reward": 60, "cooldown_hours": 60, "estimated_time_minutes": 25},
}


def _quest(city_slug: str, title: str, description: str, difficulty: str, category: str) -> dict:
    tier = _QUEST_TIERS[difficulty]
    return {
        "city_slug": city_slug,
        "title": title,
        "description": description,
        "difficulty": difficulty,
        "category": category,
        **tier,
    }


QUESTS = [
    # Sarai Batu
    _quest("sarai-batu", "Walk the Streets of the Capital",
           "Explore the layout of Sarai Batu and identify the quarters where Mongol, Kipchak, Rus', and Italian merchants once lived side by side.",
           "easy", "exploration"),
    _quest("sarai-batu", "The Friar's Account",
           "Read William of Rubruck's 1253 travel account and answer questions about what he observed in the khan's capital.",
           "medium", "knowledge"),
    _quest("sarai-batu", "Mint Your Own Dirham",
           "Learn how the Sarai mint struck silver dirhams and trace the inscriptions back to Öz Beg Khan's reign.",
           "medium", "culture"),
    _quest("sarai-batu", "Ibn Battuta's Route",
           "Retrace the Moroccan traveler Ibn Battuta's 1330s journey through Sarai and the impressions he recorded.",
           "hard", "exploration"),
    _quest("sarai-batu", "Negotiate with the Yarlik",
           "Study a khan's yarlik decree and determine what privileges it granted and to whom.",
           "hard", "diplomacy"),
    _quest("sarai-batu", "Palace Ruins Survey",
           "Help catalog fragments from Sarai's monumental palace complex uncovered by archaeologists.",
           "easy", "exploration"),
    _quest("sarai-batu", "The Fall After Timur",
           "Investigate how Timur's 1395 raid accelerated Sarai's decline as the Horde's capital.",
           "medium", "knowledge"),
    # Sarayshyk
    _quest("sarayshyk", "Cross the Ural",
           "Chart the safest river crossing at Sarayshyk used by caravans moving between Sarai and Khwarezm.",
           "easy", "exploration"),
    _quest("sarayshyk", "Caravanserai Ledger",
           "Review a merchant's ledger recorded at a Sarayshyk waystation and total the goods taxed there.",
           "medium", "trade"),
    _quest("sarayshyk", "From Horde to Khanate",
           "Trace how Sarayshyk transitioned from a Golden Horde waypoint to a capital of the early Kazakh Khanate.",
           "hard", "knowledge"),
    _quest("sarayshyk", "Flood and Rebuild",
           "Examine archaeological layers showing how Sarayshyk was rebuilt after repeated Ural River floods.",
           "medium", "exploration"),
    _quest("sarayshyk", "The Nogai Horde's Seat",
           "Learn how Sarayshyk briefly served as a capital of the Nogai Horde after the Golden Horde's fragmentation.",
           "hard", "diplomacy"),
    _quest("sarayshyk", "Coin Hoard Discovery",
           "Sort a hoard of excavated coins by mint and reign to help date a Sarayshyk household site.",
           "medium", "culture"),
    _quest("sarayshyk", "Waystation Watch",
           "Identify what goods and travelers a Sarayshyk customs post would have processed in a single day.",
           "easy", "trade"),
    # Otrar
    _quest("otrar", "The Fatal Caravan",
           "Investigate the 1219 Otrar incident and understand how it triggered the Mongol invasion of Khwarezm.",
           "hard", "knowledge"),
    _quest("otrar", "Al-Farabi's Hometown",
           "Explore Otrar's legacy as the traditional birthplace of the philosopher Al-Farabi.",
           "easy", "culture"),
    _quest("otrar", "Siege Works Survey",
           "Study the remains of the siege works built around Otrar's citadel during its 1219–1220 conquest.",
           "medium", "exploration"),
    _quest("otrar", "Timur's Last Camp",
           "Uncover the story of Timur's death at Otrar in 1405 while preparing his campaign against Ming China.",
           "medium", "knowledge"),
    _quest("otrar", "Citadel Excavation",
           "Assist in mapping Otrar's excavated citadel, mosques, and bathhouses layer by layer.",
           "hard", "exploration"),
    _quest("otrar", "Silk Road Ledger",
           "Balance a merchant's itinerary scroll listing distances and caravanserai between Otrar and Samarkand.",
           "medium", "trade"),
    _quest("otrar", "Scholars of Otrar",
           "Research the madrasas and observatories that kept Otrar's scholarly tradition alive under Mongol rule.",
           "easy", "knowledge"),
    # Sygnak
    _quest("sygnak", "Coronation on the Syr Darya",
           "Learn how Sygnak served as the coronation seat for White Horde and early Kazakh khans.",
           "medium", "diplomacy"),
    _quest("sygnak", "Capital of the White Horde",
           "Explore how Erzen Khan established Sygnak as the White Horde's capital in the 14th century.",
           "hard", "knowledge"),
    _quest("sygnak", "Bowyer's Craft",
           "Study the construction of a composite recurve bow, the signature weapon of steppe horse archers.",
           "medium", "culture"),
    _quest("sygnak", "River Customs Post",
           "Calculate the tolls a Sygnak customs post would collect from a wool caravan crossing the Syr Darya.",
           "easy", "trade"),
    _quest("sygnak", "Steppe and Settlement",
           "Compare how Sygnak balanced nomadic steppe traditions with the settled life of a river-trade town.",
           "medium", "exploration"),
    _quest("sygnak", "Decline to Sauran",
           "Investigate how the rise of neighboring Sauran drew trade and power away from Sygnak.",
           "hard", "knowledge"),
    _quest("sygnak", "Ruins Near Sozak",
           "Review 19th-century survey notes on Sygnak's ruins near modern Sozak, Kazakhstan.",
           "easy", "exploration"),
    # Bolgar
    _quest("bolgar", "The Small Hajj",
           "Learn why Bolgar's ruins became a place of pilgrimage — the \"Small Hajj\" — for Volga-region Muslims.",
           "easy", "culture"),
    _quest("bolgar", "Mongol Conquest of 1236",
           "Study how Batu Khan's commanders conquered Volga Bulgaria's capital in 1236.",
           "medium", "knowledge"),
    _quest("bolgar", "The White Mosque",
           "Explore the architecture of Bolgar's surviving White Mosque and Great Minaret.",
           "medium", "exploration"),
    _quest("bolgar", "Fur Trade Ledger",
           "Balance a trade record exchanging sable and ermine furs for silver and textiles at Bolgar.",
           "hard", "trade"),
    _quest("bolgar", "Mint of the North",
           "Trace silver dirhams struck at the Bolgar mint to their circulation across the Horde's northern territories.",
           "medium", "culture"),
    _quest("bolgar", "UNESCO Heritage Survey",
           "Review the criteria that earned Bolgar's historical complex UNESCO World Heritage status.",
           "easy", "knowledge"),
    _quest("bolgar", "Madrasa Manuscripts",
           "Examine an illuminated Qur'an page produced in one of Bolgar's Islamic madrasas.",
           "hard", "culture"),
    # Crimea
    _quest("crimea", "Kaffa's Genoese Quarter",
           "Explore the Genoese trading colony of Kaffa and its relationship with the Golden Horde's Crimean province.",
           "medium", "exploration"),
    _quest("crimea", "Mosque of Sultan Uzbek",
           "Study the architecture of the 1314 Mosque of Sultan Uzbek, one of Crimea's oldest Islamic monuments.",
           "easy", "culture"),
    _quest("crimea", "Black Sea Alliance",
           "Investigate the diplomatic alliance between the Golden Horde and Mamluk Egypt against the Ilkhanate.",
           "hard", "diplomacy"),
    _quest("crimea", "Portolan Chart Reading",
           "Read a Genoese portolan chart to plot the sea route between Kaffa and Constantinople.",
           "medium", "knowledge"),
    _quest("crimea", "From Province to Khanate",
           "Trace how the Crimean province gave its name to the later independent Crimean Khanate.",
           "hard", "knowledge"),
    _quest("crimea", "Customs of the Port",
           "Calculate the customs revenue the khan's officials would collect from a shipment of silk passing through Kaffa.",
           "medium", "trade"),
    _quest("crimea", "Multi-Faith Crimea",
           "Explore the multi-confessional community of Mongols, Armenians, Greeks, and Italians who shared the province.",
           "easy", "exploration"),
]

# ─────────────────────────────────────────────────────────────────────────────
# Achievement definitions — 4 tiers x 8 metrics = 32, entirely admin-editable
# ─────────────────────────────────────────────────────────────────────────────

_TIER_LABELS = ["Bronze", "Silver", "Gold", "Platinum"]
_TIER_REWARD_SCALE = [1, 2, 4, 8]  # multiplies the metric's base reward per tier


def _achievement_tiers(
    metric: AchievementMetric,
    noun: str,
    thresholds: list[int],
    base_xp: int,
    base_coins: int,
    icon: str,
    sort_start: int,
) -> list[dict]:
    tiers = []
    for i, threshold in enumerate(thresholds):
        label = _TIER_LABELS[i]
        scale = _TIER_REWARD_SCALE[i]
        tiers.append({
            "key": f"{metric.value}_{label.lower()}",
            "title": f"{label} {noun}",
            "description": f"Reach {threshold:,} {noun.lower()} to earn this badge.",
            "icon_url": icon,
            "metric": metric,
            "threshold": threshold,
            "reward_xp": base_xp * scale,
            "reward_coins": base_coins * scale,
            "sort_order": sort_start + i,
        })
    return tiers


ACHIEVEMENT_DEFINITIONS = [
    *_achievement_tiers(AchievementMetric.XP, "Experience Milestone", [200, 1000, 3000, 8000], 50, 10, "⚜", 0),
    *_achievement_tiers(AchievementMetric.COINS, "Coin Hoard", [100, 500, 1500, 4000], 40, 20, "🪙", 10),
    *_achievement_tiers(AchievementMetric.LEVEL, "Rank", [3, 6, 10, 15], 80, 25, "👑", 20),
    *_achievement_tiers(AchievementMetric.STREAK_DAYS, "Steppe Streak", [3, 7, 14, 30], 60, 15, "🔥", 30),
    *_achievement_tiers(AchievementMetric.QUESTS_COMPLETED, "Quests Completed", [3, 10, 25, 50], 100, 20, "⚡", 40),
    *_achievement_tiers(AchievementMetric.CITIES_VISITED, "Cities Explored", [1, 3, 5, 6], 120, 30, "🗺", 50),
    *_achievement_tiers(AchievementMetric.ARTIFACTS_COLLECTED, "Artifacts Collected", [3, 10, 20, 30], 90, 25, "🏺", 60),
    *_achievement_tiers(AchievementMetric.CERTIFICATES_ISSUED, "Certificates Earned", [1, 2, 3, 5], 150, 40, "📜", 70),
]

# ─────────────────────────────────────────────────────────────────────────────
# Per-city gallery — 4 photo slots per city, each with kk/ru/en captions
# ─────────────────────────────────────────────────────────────────────────────

_GALLERY_SLOTS = [
    {
        "en": ("Panoramic view of the site", "Wide view over the excavated city grounds"),
        "ru": ("Панорамный вид местности", "Широкий вид на территорию раскопок"),
        "kk": ("Алаңның панорамалық көрінісі", "Қазба жүргізілген аумақтың кең көрінісі"),
    },
    {
        "en": ("Archaeological excavation", "Ongoing excavation trench with exposed foundations"),
        "ru": ("Археологические раскопки", "Раскоп с открытыми фундаментами построек"),
        "kk": ("Археологиялық қазба жұмыстары", "Ғимарат іргетастары ашылған қазба орны"),
    },
    {
        "en": ("Museum artifact display", "Recovered artifacts on display in the local museum"),
        "ru": ("Экспозиция музея", "Найденные артефакты на выставке в местном музее"),
        "kk": ("Мұражай экспозициясы", "Табылған жәдігерлер жергілікті мұражайда қойылған"),
    },
    {
        "en": ("Historical reconstruction", "Artist's reconstruction of the city at its height"),
        "ru": ("Историческая реконструкция", "Художественная реконструкция города в период расцвета"),
        "kk": ("Тарихи реконструкция", "Қаланың гүлдену кезеңінің суретшілік қалпына келтірілуі"),
    },
]

LANGUAGE_BY_CODE = {"en": Language.ENGLISH, "ru": Language.RUSSIAN, "kk": Language.KAZAKH}

# ─────────────────────────────────────────────────────────────────────────────
# Suggested AI-historian prompts — 12 per language
# ─────────────────────────────────────────────────────────────────────────────

SUGGESTED_PROMPTS = {
    "en": [
        "Who founded the Golden Horde and when?",
        "Why did Sarai Batu become the Horde's capital?",
        "What caused the Golden Horde to eventually collapse?",
        "How did the Golden Horde and the Mamluk Sultanate become allies?",
        "What role did Islam play in the Golden Horde's later history?",
        "How did Ibn Battuta describe his travels through Sarai?",
        "What goods traveled along the Golden Horde's Silk Road routes?",
        "Why did Genghis Khan invade Khwarezm after the Otrar incident?",
        "How did the Golden Horde govern the Russian principalities?",
        "What was daily life like in a Golden Horde city?",
        "How did the White Horde differ from the Golden Horde?",
        "What legacy did the Golden Horde leave in modern Kazakhstan?",
    ],
    "ru": [
        "Кто и когда основал Золотую Орду?",
        "Почему Сарай-Бату стал столицей Орды?",
        "Что привело к распаду Золотой Орды?",
        "Как Золотая Орда и мамлюкский Египет стали союзниками?",
        "Какую роль играл ислам в поздней истории Золотой Орды?",
        "Как Ибн Баттута описывал свои путешествия по Сараю?",
        "Какие товары перевозились по торговым путям Золотой Орды?",
        "Почему Чингисхан вторгся в Хорезм после инцидента в Отраре?",
        "Как Золотая Орда управляла русскими княжествами?",
        "Какой была повседневная жизнь в городе Золотой Орды?",
        "Чем Белая Орда отличалась от Золотой Орды?",
        "Какое наследие Золотая Орда оставила современному Казахстану?",
    ],
    "kk": [
        "Алтын Орданың негізін кім және қашан қалады?",
        "Неліктен Сарай-Бату Орданың астанасына айналды?",
        "Алтын Орданың құлауына не себеп болды?",
        "Алтын Орда мен Мәмлүк Сұлтандығы қалай одақтас болды?",
        "Ислам Алтын Орданың кейінгі тарихында қандай рөл атқарды?",
        "Ибн Баттута Сарай арқылы саяхатын қалай сипаттады?",
        "Алтын Орданың Жібек жолы бойымен қандай тауарлар тасымалданды?",
        "Отырар оқиғасынан кейін Шыңғыс хан Хорезмге неге басып кірді?",
        "Алтын Орда орыс княздіктерін қалай басқарды?",
        "Алтын Орда қаласындағы күнделікті өмір қандай болды?",
        "Ақ Орда Алтын Ордадан немен ерекшеленді?",
        "Алтын Орда қазіргі Қазақстанға қандай мұра қалдырды?",
    ],
}

# ─────────────────────────────────────────────────────────────────────────────
# Homepage "years of history" stat — admin-editable via the Homepage content page
# ─────────────────────────────────────────────────────────────────────────────

HOMEPAGE_STATS_YEARS = "820"


# ─────────────────────────────────────────────────────────────────────────────
# Seeding logic — each section is skipped if the table already has rows
# ─────────────────────────────────────────────────────────────────────────────


async def seed_cities(session) -> dict[str, uuid.UUID]:
    count = await session.scalar(select(func.count()).select_from(City))
    if count:
        logger.info("Cities already seeded (%d rows) — skipping.", count)
        result = await session.execute(select(City.slug, City.id))
        return {slug: city_id for slug, city_id in result.all()}

    slug_to_id: dict[str, uuid.UUID] = {}
    for data in CITIES:
        city = City(**data)
        session.add(city)
        await session.flush()
        slug_to_id[city.slug] = city.id
    logger.info("Seeded %d cities.", len(CITIES))
    return slug_to_id


async def seed_artifacts(session, city_ids: dict[str, uuid.UUID]) -> None:
    count = await session.scalar(select(func.count()).select_from(Artifact))
    if count:
        logger.info("Artifacts already seeded (%d rows) — skipping.", count)
        return
    for data in ARTIFACTS:
        city_slug = data["city_slug"]
        artifact = Artifact(
            city_id=city_ids[city_slug],
            name=data["name"],
            description=data["description"],
            era=data["era"],
            rarity=data["rarity"],
            historical_context=data["historical_context"],
            image_url=placeholder_image(data["name"], bg="1A1C14", fg="D4AF37", size="600x600"),
        )
        session.add(artifact)
    logger.info("Seeded %d artifacts.", len(ARTIFACTS))


async def seed_gallery(session, city_ids: dict[str, uuid.UUID]) -> None:
    count = await session.scalar(select(func.count()).select_from(GalleryImage))
    if count:
        logger.info("Gallery images already seeded (%d rows) — skipping.", count)
        return

    total = 0
    for data in CITIES:
        slug = data["slug"]
        city_id = city_ids[slug]
        for slot_index, slot in enumerate(_GALLERY_SLOTS):
            group_key = uuid.uuid4()
            image_url = placeholder_image(
                f"{data['name']} - {slot['en'][0]}", bg="0E1018", fg="B7BAC3", size="900x600"
            )
            for code, language in LANGUAGE_BY_CODE.items():
                title, alt_text = slot[code]
                session.add(
                    GalleryImage(
                        title=f"{data['name']} — {title}",
                        description=None,
                        language=language,
                        group_key=group_key,
                        image_url=image_url,
                        alt_text=alt_text,
                        sort_order=slot_index,
                        is_active=True,
                        city_id=city_id,
                    )
                )
                total += 1
    logger.info("Seeded %d gallery image rows (%d photos x 3 languages).", total, total // 3)


async def seed_quests(session, city_ids: dict[str, uuid.UUID]) -> None:
    count = await session.scalar(select(func.count()).select_from(Quest))
    if count:
        logger.info("Quests already seeded (%d rows) — skipping.", count)
        return
    for data in QUESTS:
        quest = Quest(
            city_id=city_ids[data["city_slug"]],
            title=data["title"],
            description=data["description"],
            difficulty=data["difficulty"],
            points=data["points"],
            xp_reward=data["xp_reward"],
            coin_reward=data["coin_reward"],
            cooldown_hours=data["cooldown_hours"],
            estimated_time_minutes=data["estimated_time_minutes"],
            category=data["category"],
        )
        session.add(quest)
    logger.info("Seeded %d quests.", len(QUESTS))


async def seed_achievement_definitions(session) -> None:
    count = await session.scalar(select(func.count()).select_from(AchievementDefinition))
    if count:
        logger.info("Achievement definitions already seeded (%d rows) — skipping.", count)
        return
    for data in ACHIEVEMENT_DEFINITIONS:
        session.add(AchievementDefinition(**data))
    logger.info("Seeded %d achievement definitions.", len(ACHIEVEMENT_DEFINITIONS))


async def seed_suggested_prompts(session) -> None:
    count = await session.scalar(select(func.count()).select_from(SuggestedPrompt))
    if count:
        logger.info("Suggested prompts already seeded (%d rows) — skipping.", count)
        return
    total = 0
    for code, prompts in SUGGESTED_PROMPTS.items():
        language = LANGUAGE_BY_CODE[code]
        for sort_order, prompt_text in enumerate(prompts):
            session.add(
                SuggestedPrompt(
                    prompt_text=prompt_text,
                    language=language,
                    sort_order=sort_order,
                    is_active=True,
                )
            )
            total += 1
    logger.info("Seeded %d suggested prompts.", total)


async def seed_homepage_stats(session) -> None:
    count = await session.scalar(
        select(func.count()).select_from(HomepageContent).where(HomepageContent.section == "stats")
    )
    if count:
        logger.info("Homepage 'stats' content already seeded (%d rows) — skipping.", count)
        return
    group_key = uuid.uuid4()
    for code, language in LANGUAGE_BY_CODE.items():
        session.add(
            HomepageContent(
                section="stats",
                language=language,
                group_key=group_key,
                title=HOMEPAGE_STATS_YEARS,
                body="Years of History",
                sort_order=0,
                is_active=True,
            )
        )
    logger.info("Seeded homepage 'stats' content (years=%s).", HOMEPAGE_STATS_YEARS)


async def main() -> None:
    factory = get_session_factory()
    async with factory() as session:
        city_ids = await seed_cities(session)
        await session.commit()

        await seed_artifacts(session, city_ids)
        await seed_gallery(session, city_ids)
        await seed_quests(session, city_ids)
        await seed_achievement_definitions(session)
        await seed_suggested_prompts(session)
        await seed_homepage_stats(session)
        await session.commit()

    redis = await get_redis_client()
    await redis.delete(CITIES_CACHE_KEY)
    logger.info("Flushed cities cache key %r.", CITIES_CACHE_KEY)

    await close_redis()
    await dispose_engine()
    logger.info("Seed complete.")


if __name__ == "__main__":
    asyncio.run(main())
