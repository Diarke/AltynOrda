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

# Mirrors CityService.CITIES_CACHE_KEY_PREFIX (one cache entry per language) —
# duplicated here (rather than imported) to avoid pulling in the full
# `app.services` package graph from a standalone script.
CITIES_CACHE_KEYS = [f"orda:cities:all:{lang.value}" for lang in Language]

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
        "slug": "sarai-batu",
        "latitude": 47.86,
        "longitude": 46.85,
        "image_url": placeholder_image("Sarai Batu"),
        "name_en": "Sarai Batu", "name_ru": "Сарай-Бату", "name_kk": "Сарай-Бату",
        "historical_period_en": "1240s – 1360s",
        "historical_period_ru": "1240-е – 1360-е годы",
        "historical_period_kk": "1240–1360 жылдар",
        "population_estimate_en": "75,000 – 100,000 at its 14th-century peak",
        "population_estimate_ru": "75 000–100 000 человек в период расцвета в XIV веке",
        "population_estimate_kk": "XIV ғасырдағы гүлдену кезеңінде 75 000–100 000 адам",
        "description_en": (
            "Sarai Batu (\"Old Sarai\") was founded by Batu Khan around 1242 on the "
            "lower Volga (Akhtuba channel) as the first capital of the Ulus of Jochi, "
            "the westernmost khanate of the Mongol Empire. Within a century it grew "
            "into one of the largest cities on Earth, with quarters for Mongol, "
            "Kipchak, Alan, Russian, Armenian, and Italian communities, its own mint, "
            "monumental palaces, mosques, and a network of caravanserais serving "
            "merchants from Cairo to Beijing."
        ),
        "description_ru": (
            "Сарай-Бату («Старый Сарай») был основан Бату-ханом около 1242 года в "
            "низовьях Волги (протока Ахтуба) как первая столица улуса Джучи — самого "
            "западного улуса Монгольской империи. За столетие город вырос в один из "
            "крупнейших городов мира: в нём существовали кварталы монгольской, "
            "кипчакской, аланской, русской, армянской и итальянской общин, действовал "
            "собственный монетный двор, возвышались величественные дворцы и мечети, а "
            "сеть караван-сараев обслуживала купцов от Каира до Пекина."
        ),
        "description_kk": (
            "Сарай-Бату («Ескі Сарай») Бату-хан тарапынан шамамен 1242 жылы Еділдің "
            "төменгі ағысында (Ахтуба саласында) Жошы ұлысының — Моңғол империясының "
            "ең батыстағы ұлысының — алғашқы астанасы ретінде негізделген. Бір ғасыр "
            "ішінде қала әлемдегі ең ірі қалалардың біріне айналды: онда моңғол, "
            "қыпшақ, алан, орыс, армян және итальян қауымдарының тұрғын алаптары "
            "болды, өз ақша сарайы жұмыс істеді, сәулетті сарайлар мен мешіттер бой "
            "көтерді, ал керуен-сарайлар желісі Каирден Бейжіңге дейінгі саудагерлерге "
            "қызмет етті."
        ),
        "significance_en": (
            "As the seat of the khans, Sarai Batu was the political heart of the "
            "Golden Horde and the northern terminus of the Silk Road's steppe route, "
            "where Mongol administration, Islamic scholarship, and Eurasian trade met."
        ),
        "significance_ru": (
            "Как резиденция ханов, Сарай-Бату был политическим сердцем Золотой Орды и "
            "северной конечной точкой степного маршрута Великого шёлкового пути, где "
            "встречались монгольское управление, исламская учёность и евразийская торговля."
        ),
        "significance_kk": (
            "Хандардың ордасы ретінде Сарай-Бату Алтын Орданың саяси жүрегі әрі Ұлы "
            "Жібек жолының дала бағытының солтүстік соңғы нүктесі болды, мұнда моңғол "
            "басқару жүйесі, ислам ғылымы және еуразиялық сауда тоғысты."
        ),
        "historical_facts_en": [
            "Founded c. 1242 by Batu Khan, grandson of Genghis Khan, after his campaigns in Europe.",
            "Visited by the Franciscan friar William of Rubruck (1253) and the Moroccan traveler Ibn Battuta (1330s), both of whom left detailed accounts of its size and diversity.",
            "Minted its own silver and copper coinage, some of the most widely circulated currency in medieval Eurasia.",
            "Housed distinct quarters for different peoples and faiths, reflecting the Golden Horde's religious tolerance under Mongol rule.",
            "Gradually eclipsed by Sarai al-Jadid (\"New Sarai\") downstream in the 14th century before both cities declined after Timur's raids in 1395.",
        ],
        "historical_facts_ru": [
            "Основан около 1242 года Бату-ханом, внуком Чингисхана, после его походов в Европу.",
            "Город посетили францисканский монах Гильом де Рубрук (1253) и марокканский путешественник Ибн Баттута (1330-е годы), оставившие подробные описания его размеров и многообразия.",
            "Чеканил собственную серебряную и медную монету — одну из самых распространённых валют средневековой Евразии.",
            "В городе существовали отдельные кварталы для разных народов и религий, что отражало веротерпимость Золотой Орды при монгольском правлении.",
            "В XIV веке город постепенно уступил значение Сарай аль-Джедиду («Новому Сараю»), расположенному ниже по течению, а после набегов Тимура в 1395 году оба города пришли в упадок.",
        ],
        "historical_facts_kk": [
            "Шамамен 1242 жылы Еуропаға жасаған жорықтарынан кейін Шыңғыс ханның немересі Бату хан негіздеген.",
            "Қалаға францискан монахы Гильом де Рубрук (1253) және марокколық саяхатшы Ибн Баттута (1330-жылдар) келіп, оның көлемі мен әртүрлілігі туралы егжей-тегжейлі жазбалар қалдырған.",
            "Өзінің күміс және мыс теңгелерін соққан, олар ортағасырлық Еуразияда ең кең таралған валюталардың бірі болды.",
            "Қалада әртүрлі халықтар мен діндерге арналған бөлек алаптар болды, бұл моңғол билігі кезіндегі Алтын Орданың діни төзімділігін көрсетті.",
            "XIV ғасырда ағыс бойымен төменде орналасқан Сарай әл-Джедидке («Жаңа Сарай») бірте-бірте орнын беріп, 1395 жылы Темірдің жойқын жорықтарынан кейін екі қала да құлдырады.",
        ],
        "trade_info_en": (
            "Sarai Batu sat at the crossing point of the Volga trade artery and the "
            "steppe roads linking the Black Sea ports to Central Asia and China. "
            "Caravans passing through carried Chinese silk and porcelain, Persian "
            "textiles, Rus' furs and honey, and Central Asian horses, while the city's "
            "mint fed a monetary economy that Genoese and Venetian merchants from Kaffa "
            "and Tana relied on for bullion exchange."
        ),
        "trade_info_ru": (
            "Сарай-Бату находился на пересечении волжской торговой артерии и степных "
            "путей, соединявших порты Чёрного моря со Средней Азией и Китаем. "
            "Проходившие через город караваны везли китайский шёлк и фарфор, персидские "
            "ткани, русские меха и мёд, а также среднеазиатских лошадей, в то время как "
            "городской монетный двор питал денежную экономику, на которую опирались "
            "генуэзские и венецианские купцы из Каффы и Таны для обмена драгоценными "
            "металлами."
        ),
        "trade_info_kk": (
            "Сарай-Бату Еділ сауда артериясы мен Қара теңіз порттарын Орта Азия және "
            "Қытаймен байланыстыратын дала жолдарының қиылысында орналасқан. Қала "
            "арқылы өткен керуендер қытай жібегі мен фарфорын, парсы маталарын, орыс "
            "аң терісі мен балын және орта азиялық жылқыларды тасымалдады, ал қаланың "
            "ақша сарайы Каффа мен Тана генуялық және венециандық саудагерлері бағалы "
            "металдар алмасу үшін сүйенетін ақша экономикасын қамтамасыз етті."
        ),
    },
    {
        "slug": "sarayshyk",
        "latitude": 47.05,
        "longitude": 51.90,
        "image_url": placeholder_image("Sarayshyk"),
        "name_en": "Sarayshyk", "name_ru": "Сарайчик", "name_kk": "Сарайшық",
        "historical_period_en": "1250s – 1580s",
        "historical_period_ru": "1250-е – 1580-е годы",
        "historical_period_kk": "1250–1580 жылдар",
        "population_estimate_en": "10,000 – 15,000",
        "population_estimate_ru": "10 000–15 000 человек",
        "population_estimate_kk": "10 000–15 000 адам",
        "description_en": (
            "Sarayshyk (\"little Sarai\") grew up on the banks of the Ural (Zhaiyq) "
            "River as a waystation between Sarai Batu and the trade routes running "
            "north to the Kama and east toward Central Asia. Smaller than the twin "
            "capitals, it endured far longer than either, later serving as a capital "
            "of the Nogai Horde and the early Kazakh Khanate."
        ),
        "description_ru": (
            "Сарайчик («малый Сарай») вырос на берегах реки Урал (Жайык) как "
            "перевалочный пункт между Сарай-Бату и торговыми путями, ведущими на "
            "север к Каме и на восток в Среднюю Азию. Уступая по размерам двум "
            "столицам, он просуществовал гораздо дольше их обеих, позднее став "
            "столицей Ногайской Орды и раннего Казахского ханства."
        ),
        "description_kk": (
            "Сарайшық («кіші Сарай») Жайық (Орал) өзенінің жағасында Сарай-Бату мен "
            "солтүстікте Қамаға, шығыста Орта Азияға апаратын сауда жолдарының "
            "аралық бекеті ретінде өсіп-өнді. Егіз астаналардан кіші болғанымен, ол "
            "екеуінен де әлдеқайда ұзақ өмір сүрді, кейін Ноғай Ордасы мен ерте "
            "Қазақ хандығының астанасы болды."
        ),
        "significance_en": (
            "Sarayshyk's strength was its position: a reliable river crossing and "
            "caravanserai stop that let it outlive the Golden Horde's great capitals "
            "by over a century, bridging the steppe empires that followed it."
        ),
        "significance_ru": (
            "Сила Сарайчика заключалась в его расположении: надёжная речная переправа "
            "и остановка на караванном пути позволили ему пережить великие столицы "
            "Золотой Орды более чем на столетие, связав между собой степные империи, "
            "пришедшие ей на смену."
        ),
        "significance_kk": (
            "Сарайшықтың күші оның орналасуында болды: сенімді өзен өткелі мен "
            "керуен-сарай аялдамасы оған Алтын Орданың ұлы астаналарынан бір "
            "ғасырдан астам уақыт артық өмір сүруге мүмкіндік берді, осылайша одан "
            "кейінгі дала империяларын жалғастырушы көпір болды."
        ),
        "historical_facts_en": [
            "Served as a key crossing point on the Ural River for caravans moving between the Volga and Central Asia.",
            "Became, in the 15th–16th centuries, an early capital associated with the Nogai Horde and the nascent Kazakh Khanate.",
            "Excavations have uncovered coin hoards, ceramics, and burial sites spanning several centuries of continuous habitation.",
            "Its name — a diminutive of \"Sarai\" — reflects its role as a smaller sister city to the Golden Horde's grand capitals.",
            "Repeatedly rebuilt after river flooding and raids, until it was finally abandoned in the late 16th century.",
        ],
        "historical_facts_ru": [
            "Служил ключевой переправой на реке Урал для караванов, следовавших между Волгой и Средней Азией.",
            "В XV–XVI веках стал одной из ранних столиц, связанных с Ногайской Ордой и зарождающимся Казахским ханством.",
            "Раскопки обнаружили клады монет, керамику и захоронения, охватывающие несколько столетий непрерывного проживания.",
            "Его название — уменьшительная форма от «Сарай» — отражает роль города как меньшей «сестры» великих столиц Золотой Орды.",
            "Неоднократно восстанавливался после речных наводнений и набегов, пока не был окончательно покинут в конце XVI века.",
        ],
        "historical_facts_kk": [
            "Еділ мен Орта Азия арасында жүрген керуендер үшін Жайық өзеніндегі негізгі өткел болды.",
            "XV–XVI ғасырларда Ноғай Ордасы мен жаңадан қалыптасып келе жатқан Қазақ хандығына байланысты алғашқы астаналардың біріне айналды.",
            "Қазба жұмыстары бірнеше ғасыр бойы үзіліссіз қоныстанудың куәсі болған теңге қоймаларын, керамика мен жерлеу орындарын ашты.",
            "Оның атауы — «Сарай» сөзінің кішірейтілген түрі — Алтын Орданың ұлы астаналарының кіші «сіңлісі» рөлін көрсетеді.",
            "Өзен тасқыны мен шапқыншылықтардан кейін бірнеше рет қайта салынып, ақыры XVI ғасырдың соңында тасталып кетті.",
        ],
        "trade_info_en": (
            "Positioned on the Ural River crossing, Sarayshyk taxed and provisioned "
            "caravans carrying furs and honey from the north, livestock and horses "
            "from the steppe, and manufactured goods moving between Sarai and Khwarezm, "
            "making it a modest but steady customs and rest stop on the northern Silk Road."
        ),
        "trade_info_ru": (
            "Расположенный на переправе через реку Урал, Сарайчик облагал пошлиной и "
            "снабжал караваны, везущие меха и мёд с севера, скот и лошадей со степи, а "
            "также товары, перемещавшиеся между Сараем и Хорезмом, — скромный, но "
            "стабильный таможенный и перевалочный пункт на северном Шёлковом пути."
        ),
        "trade_info_kk": (
            "Жайық өзенінің өткелінде орналасқан Сарайшық солтүстіктен келетін аң "
            "терісі мен балды, даладан келетін мал мен жылқыны, сондай-ақ Сарай мен "
            "Хорезм арасында тасымалданатын тауарларды алып жүрген керуендерден баж "
            "алып, оларды жабдықтап отырды — бұл Жібек жолының солтүстік тармағындағы "
            "қарапайым, бірақ тұрақты кеден әрі демалыс бекеті еді."
        ),
    },
    {
        "slug": "otrar",
        "latitude": 42.85,
        "longitude": 68.30,
        "image_url": placeholder_image("Otrar"),
        "name_en": "Otrar", "name_ru": "Отрар", "name_kk": "Отырар",
        "historical_period_en": "9th – 16th centuries (Golden Horde era: 1220s – 1430s)",
        "historical_period_ru": "IX–XVI века (эпоха Золотой Орды: 1220-е – 1430-е годы)",
        "historical_period_kk": "IX–XVI ғасырлар (Алтын Орда дәуірі: 1220–1430 жылдар)",
        "population_estimate_en": "15,000 – 20,000",
        "population_estimate_ru": "15 000–20 000 человек",
        "population_estimate_kk": "15 000–20 000 адам",
        "description_en": (
            "Otrar was an ancient oasis city on the Syr Darya, long a center of "
            "learning and trade before the Mongol era — traditionally held to be the "
            "birthplace of the philosopher Al-Farabi. In 1219, the execution of a "
            "Mongol trade caravan by Otrar's governor gave Genghis Khan his pretext to "
            "invade Khwarezm; the city was besieged and razed, then rebuilt to serve "
            "the Chagatai Khanate and later the Golden Horde as a Syr Darya river-trade hub."
        ),
        "description_ru": (
            "Отрар был древним оазисным городом на Сырдарье, задолго до монгольской "
            "эпохи являвшимся центром учёности и торговли — по преданию, здесь "
            "родился философ Аль-Фараби. В 1219 году казнь монгольского торгового "
            "каравана по приказу правителя Отрара дала Чингисхану повод для "
            "вторжения в Хорезм; город был осаждён и разрушен, а затем восстановлен "
            "и служил Чагатайскому улусу, а позднее Золотой Орде, узлом речной "
            "торговли на Сырдарье."
        ),
        "description_kk": (
            "Отырар — Сырдария бойындағы көне оазис қаласы, моңғол дәуіріне дейін "
            "ғылым мен сауданың орталығы болған, дәстүр бойынша ғұлама Әл-Фараби "
            "осында дүниеге келген деп есептеледі. 1219 жылы Отырар билеушісінің "
            "моңғол сауда керуенін өлтіруі Шыңғыс ханға Хорезмге басып кіруге сылтау "
            "болды; қала қоршауға алынып, қиратылды, кейін Шағатай ұлысына, ал одан "
            "соң Алтын Ордаға Сырдария бойындағы өзен саудасының тораптық қаласы "
            "ретінде қызмет ету үшін қайта салынды."
        ),
        "significance_en": (
            "Otrar's fate changed world history: its governor's fatal decision "
            "triggered the Mongol conquest of Central Asia. Rebuilt, it became a "
            "meeting point of Turkic, Persian, and Mongol culture on the Silk Road."
        ),
        "significance_ru": (
            "Судьба Отрара изменила мировую историю: роковое решение его правителя "
            "спровоцировало монгольское завоевание Средней Азии. Восстановленный "
            "город стал местом встречи тюркской, персидской и монгольской культур на "
            "Шёлковом пути."
        ),
        "significance_kk": (
            "Отырардың тағдыры әлем тарихын өзгертті: оның билеушісінің тағдырлы "
            "шешімі моңғолдардың Орта Азияны жаулап алуына түрткі болды. Қайта "
            "салынған қала Жібек жолындағы түркі, парсы және моңғол мәдениеттерінің "
            "тоғысу нүктесіне айналды."
        ),
        "historical_facts_en": [
            "Traditionally regarded as the birthplace of the 10th-century philosopher and polymath Abu Nasr Al-Farabi.",
            "The 1219 Otrar incident — the killing of a Mongol trade mission — directly provoked Genghis Khan's invasion of the Khwarezmian Empire.",
            "The city was besieged for months and largely destroyed before being rebuilt under Mongol and later Golden Horde rule.",
            "Timur (Tamerlane) died at Otrar in February 1405 while preparing a campaign against Ming China.",
            "Extensive archaeological excavations since the 1970s have revealed a citadel, mosques, bathhouses, and craft workshops.",
        ],
        "historical_facts_ru": [
            "По преданию, здесь родился философ и энциклопедист X века Абу Наср аль-Фараби.",
            "Отрарский инцидент 1219 года — убийство монгольской торговой миссии — стал прямым поводом для вторжения Чингисхана в Хорезмскую империю.",
            "Город несколько месяцев находился в осаде и был в значительной степени разрушен, прежде чем его восстановили при монгольском, а затем ордынском правлении.",
            "Тимур (Тамерлан) скончался в Отраре в феврале 1405 года, готовясь к походу против империи Мин в Китае.",
            "Масштабные археологические раскопки, начатые в 1970-х годах, выявили цитадель, мечети, бани и ремесленные мастерские.",
        ],
        "historical_facts_kk": [
            "Дәстүр бойынша, X ғасыр философы әрі энциклопедист ғалымы Әбу Насыр әл-Фарабидің туған жері болып есептеледі.",
            "1219 жылғы Отырар оқиғасы — моңғол сауда елшілігінің өлтірілуі — Шыңғыс ханның Хорезм империясына басып кіруіне тікелей себеп болды.",
            "Қала бірнеше ай қоршауда болып, айтарлықтай қирады, кейін моңғол, ал одан соң Алтын Орда билігі кезінде қайта салынды.",
            "Темір (Ақсақ Темір) 1405 жылдың ақпанында Мин Қытайына жорыққа дайындалып жатқанда Отырарда қайтыс болды.",
            "1970-жылдардан бастап жүргізілген ауқымды археологиялық қазба жұмыстары цитадель, мешіттер, моншалар мен қолөнер шеберханаларын ашты.",
        ],
        "trade_info_en": (
            "Otrar controlled a key Syr Darya crossing on the Silk Road between "
            "Transoxiana and the Kazakh steppe, taxing caravans carrying textiles, "
            "manuscripts, ceramics, and metalwork moving between Samarkand, Sygnak, "
            "and the cities of the Golden Horde."
        ),
        "trade_info_ru": (
            "Отрар контролировал ключевую переправу через Сырдарью на Шёлковом пути "
            "между Мавераннахром и казахской степью, облагая пошлиной караваны с "
            "тканями, рукописями, керамикой и металлическими изделиями, следовавшие "
            "между Самаркандом, Сыгнаком и городами Золотой Орды."
        ),
        "trade_info_kk": (
            "Отырар Мәуереннаһр мен қазақ даласы арасындағы Жібек жолындағы "
            "Сырдарияның негізгі өткелін бақылап, Самарқанд, Сығанақ және Алтын Орда "
            "қалалары арасында жүрген мата, қолжазба, керамика және металл "
            "бұйымдарын тасымалдаған керуендерден баж алып отырды."
        ),
    },
    {
        "slug": "sygnak",
        "latitude": 44.85,
        "longitude": 66.53,
        "image_url": placeholder_image("Sygnak"),
        "name_en": "Sygnak", "name_ru": "Сыгнак", "name_kk": "Сығанақ",
        "historical_period_en": "11th – 16th centuries (White Horde capital, 1330s – 1420s)",
        "historical_period_ru": "XI–XVI века (столица Белой Орды в 1330-х – 1420-х годах)",
        "historical_period_kk": "XI–XVI ғасырлар (Ақ Орда астанасы: 1330–1420 жылдар)",
        "population_estimate_en": "10,000 – 15,000",
        "population_estimate_ru": "10 000–15 000 человек",
        "population_estimate_kk": "10 000–15 000 адам",
        "description_en": (
            "Sygnak (Signaq) stood on the middle Syr Darya as the principal city of "
            "the Kipchak steppe's Turkic population before becoming, in the 14th "
            "century, the capital of the White Horde (Ak Orda) — the eastern wing of "
            "the Jochid realm from which the Kazakh Khanate would later emerge."
        ),
        "description_ru": (
            "Сыгнак стоял на среднем течении Сырдарьи как главный город тюркского "
            "населения кипчакской степи, прежде чем в XIV веке стать столицей Белой "
            "(Ак) Орды — восточного крыла улуса Джучи, из которого позднее возникло "
            "Казахское ханство."
        ),
        "description_kk": (
            "Сығанақ Қыпшақ даласының түркі тұрғындарының басты қаласы ретінде "
            "Сырдарияның орта ағысында орналасты, ал XIV ғасырда Қазақ хандығы бас "
            "алатын Жошы ұлысының шығыс қанаты — Ақ Орданың астанасына айналды."
        ),
        "significance_en": (
            "As the White Horde's seat, Sygnak was a political bridge between the "
            "nomadic steppe aristocracy and the settled river-trade towns of the Syr "
            "Darya, and a direct ancestor city in Kazakh state formation."
        ),
        "significance_ru": (
            "Как резиденция Белой Орды, Сыгнак служил политическим мостом между "
            "кочевой степной знатью и оседлыми торговыми городами Сырдарьи, а также "
            "стал непосредственным предшественником в формировании казахской "
            "государственности."
        ),
        "significance_kk": (
            "Ақ Орданың ордасы ретінде Сығанақ көшпелі дала ақсүйектері мен "
            "Сырдарияның отырықшы сауда қалалары арасындағы саяси көпір болды әрі "
            "қазақ мемлекеттігінің қалыптасуындағы тікелей ізашар қала болды."
        ),
        "historical_facts_en": [
            "Became the capital of the White Horde (Ak Orda) under Erzen Khan in the early 14th century.",
            "Served as the coronation seat where Abu'l-Khayr Khan and later Kazakh khans were proclaimed rulers.",
            "Functioned as a customs and caravan town controlling river-crossing trade along the Syr Darya.",
            "Its ruins near modern Sozak, Kazakhstan, have been studied since the 19th century.",
            "Declined after the rise of neighboring Sauran and the shifting of trade routes in the 16th century.",
        ],
        "historical_facts_ru": [
            "Стал столицей Белой Орды при хане Эрзене в начале XIV века.",
            "Служил местом коронации, где были провозглашены правителями хан Абулхайр и последующие казахские ханы.",
            "Функционировал как таможенный и караванный город, контролировавший переправочную торговлю вдоль Сырдарьи.",
            "Его руины близ современного посёлка Созак в Казахстане изучаются с XIX века.",
            "Пришёл в упадок после возвышения соседнего Саурана и смещения торговых путей в XVI веке.",
        ],
        "historical_facts_kk": [
            "XIV ғасырдың басында Ерзен хан тұсында Ақ Орданың астанасына айналды.",
            "Әбілқайыр хан және кейінгі қазақ хандары билеуші болып жарияланған тағайындалу орны болды.",
            "Сырдария бойындағы өткел саудасын бақылайтын кеден әрі керуен қаласы қызметін атқарды.",
            "Оның қазіргі Қазақстандағы Созақ поселкесіне жақын орналасқан қирандылары XIX ғасырдан бері зерттелуде.",
            "Көрші Сауран қаласының көтерілуі мен XVI ғасырда сауда жолдарының өзгеруінен кейін құлдырады.",
        ],
        "trade_info_en": (
            "Sygnak taxed and hosted caravans moving wool, livestock, and hides from "
            "the steppe in exchange for grain, textiles, and craft goods from the Syr "
            "Darya oasis towns, anchoring the White Horde's fragile settled-nomadic economy."
        ),
        "trade_info_ru": (
            "Сыгнак облагал пошлиной и принимал караваны, везущие шерсть, скот и "
            "шкуры со степи в обмен на зерно, ткани и ремесленные изделия из "
            "оазисных городов Сырдарьи, скрепляя хрупкую оседло-кочевую экономику "
            "Белой Орды."
        ),
        "trade_info_kk": (
            "Сығанақ даладан келетін жүн, мал және терілерді Сырдария оазис "
            "қалаларының астығы, маталары мен қолөнер бұйымдарына айырбастаған "
            "керуендерден баж алып, оларды қабылдап, Ақ Орданың нәзік отырықшы-"
            "көшпелі экономикасын ұстап тұрды."
        ),
    },
    {
        "slug": "bolgar",
        "latitude": 54.97,
        "longitude": 49.05,
        "image_url": placeholder_image("Bolgar"),
        "name_en": "Bolgar", "name_ru": "Болгар", "name_kk": "Болгар",
        "historical_period_en": "10th – 15th centuries (Golden Horde era: 1240s – 1430s)",
        "historical_period_ru": "X–XV века (эпоха Золотой Орды: 1240-е – 1430-е годы)",
        "historical_period_kk": "X–XV ғасырлар (Алтын Орда дәуірі: 1240–1430 жылдар)",
        "population_estimate_en": "50,000 at its 14th-century peak",
        "population_estimate_ru": "50 000 человек в период расцвета в XIV веке",
        "population_estimate_kk": "XIV ғасырдағы гүлдену кезеңінде 50 000 адам",
        "description_en": (
            "Bolgar (Bulgar) was the historic capital of Volga Bulgaria, an early "
            "Muslim state on the middle Volga. Conquered by the Mongols in 1236, it "
            "was rebuilt as one of the Golden Horde's most important northern cities, "
            "prized for its mosques, mausoleums, and its role as a hub linking the "
            "Horde to the fur-rich forests of the north."
        ),
        "description_ru": (
            "Болгар был исторической столицей Волжской Булгарии — раннего "
            "мусульманского государства на среднем течении Волги. Завоёванный "
            "монголами в 1236 году, он был отстроен заново как один из важнейших "
            "северных городов Золотой Орды, славившийся мечетями, мавзолеями и "
            "ролью узла, связывавшего Орду с богатыми пушниной северными лесами."
        ),
        "description_kk": (
            "Болгар — Еділдің орта ағысындағы ерте мұсылман мемлекеті болған Еділ "
            "Бұлғариясының тарихи астанасы еді. 1236 жылы моңғолдар жаулап "
            "алғаннан кейін, ол Алтын Орданың ең маңызды солтүстік қалаларының "
            "бірі ретінде қайта салынды, мешіттерімен, кесенелерімен және Орданы "
            "аң терісіне бай солтүстік ормандармен байланыстыратын торап рөлімен "
            "танымал болды."
        ),
        "significance_en": (
            "Bolgar was a center of Islamic scholarship and craftsmanship in the "
            "Horde's northern territories, and its ruins remain a place of pilgrimage "
            "— the \"Small Hajj\" — for Volga-region Muslims to this day."
        ),
        "significance_ru": (
            "Болгар был центром исламской учёности и ремесла в северных владениях "
            "Орды, а его руины и по сей день остаются местом паломничества — «Малого "
            "хаджа» — для мусульман Поволжья."
        ),
        "significance_kk": (
            "Болгар Орданың солтүстік аумақтарындағы ислам ғылымы мен қолөнерінің "
            "орталығы болды, оның қирандылары бүгінге дейін Еділ өңірі мұсылмандары "
            "үшін «Кіші қажылық» орны болып қала береді."
        ),
        "historical_facts_en": [
            "Volga Bulgaria formally adopted Islam in 922, making Bolgar one of the earliest Muslim urban centers in Eastern Europe.",
            "Destroyed by Mongol forces under Batu Khan's commanders in 1236, then rebuilt as a Golden Horde administrative city.",
            "Its surviving White Mosque and Great Minaret are among the best-preserved Golden Horde-era monuments anywhere.",
            "Functioned as a mint city producing silver dirhams for the Horde's northern territories.",
            "Recognized by UNESCO as a World Heritage Site (Bolgar Historical and Archaeological Complex) in 2014.",
        ],
        "historical_facts_ru": [
            "Волжская Булгария официально приняла ислам в 922 году, что сделало Болгар одним из самых ранних мусульманских городских центров Восточной Европы.",
            "Разрушен монгольскими войсками под командованием военачальников Бату-хана в 1236 году, затем восстановлен как административный город Золотой Орды.",
            "Сохранившиеся Белая мечеть и Большой минарет — одни из наиболее хорошо сохранившихся памятников эпохи Золотой Орды в мире.",
            "Функционировал как монетный город, чеканивший серебряные дирхемы для северных владений Орды.",
            "В 2014 году признан объектом Всемирного наследия ЮНЕСКО (Болгарский историко-археологический комплекс).",
        ],
        "historical_facts_kk": [
            "Еділ Бұлғариясы 922 жылы исламды ресми түрде қабылдады, бұл Болгарды Шығыс Еуропадағы ең ертедегі мұсылман қалалық орталықтарының біріне айналдырды.",
            "1236 жылы Бату ханның қолбасшылары басқарған моңғол әскерлері қиратқан, кейін Алтын Орданың әкімшілік қаласы ретінде қайта салынған.",
            "Сақталған Ақ мешіт пен Үлкен мұнара — Алтын Орда дәуірінің ең жақсы сақталған ескерткіштерінің қатарында.",
            "Орданың солтүстік аумақтары үшін күміс дирхемдер соғатын ақша сарайы қаласы қызметін атқарды.",
            "2014 жылы ЮНЕСКО-ның Дүниежүзілік мұрасы объектісі (Болгар тарихи-археологиялық кешені) ретінде танылды.",
        ],
        "trade_info_en": (
            "Bolgar was the Golden Horde's gateway to the fur trade of the northern "
            "forests, exchanging sable, ermine, and honey from Rus' and Finno-Ugric "
            "lands for silver, textiles, and manufactured goods flowing up the Volga "
            "from Sarai and beyond."
        ),
        "trade_info_ru": (
            "Болгар был воротами Золотой Орды в пушную торговлю северных лесов, "
            "обменивая соболя, горностая и мёд, поступавшие из русских и "
            "финно-угорских земель, на серебро, ткани и промышленные товары, идущие "
            "вверх по Волге из Сарая и других земель."
        ),
        "trade_info_kk": (
            "Болгар Алтын Орданың солтүстік орман аймақтарының аң терісі саудасына "
            "апаратын қақпасы болды, орыс және фин-угор жерлерінен келетін бұлғын, "
            "ақ құндыз терісі мен балды Сарайдан және басқа жерлерден Еділ бойымен "
            "жоғары көтерілетін күміс, мата және өнеркәсіп бұйымдарына айырбастады."
        ),
    },
    {
        "slug": "crimea",
        "latitude": 45.03,
        "longitude": 35.37,
        "image_url": placeholder_image("Crimea"),
        "name_en": "Crimea", "name_ru": "Крым", "name_kk": "Қырым",
        "historical_period_en": "1260s – 1440s (Golden Horde provincial capital)",
        "historical_period_ru": "1260-е – 1440-е годы (провинциальная столица Золотой Орды)",
        "historical_period_kk": "1260–1440 жылдар (Алтын Орданың облыстық астанасы)",
        "population_estimate_en": "20,000 – 30,000",
        "population_estimate_ru": "20 000–30 000 человек",
        "population_estimate_kk": "20 000–30 000 адам",
        "description_en": (
            "Qirim (modern Staryi Krym, \"Old Crimea\"), which gave its name to the "
            "entire peninsula, served as the Golden Horde's provincial capital on the "
            "Black Sea coast. Its fortunes were intertwined with the nearby Genoese "
            "trading colony of Kaffa, making the province a meeting place of Mongol "
            "administration, Italian merchant capital, and Black Sea commerce."
        ),
        "description_ru": (
            "Кырым (современный Старый Крым), давший имя всему полуострову, служил "
            "провинциальной столицей Золотой Орды на черноморском побережье. Его "
            "судьба была тесно связана с расположенной поблизости генуэзской "
            "торговой колонией Каффа, что превратило провинцию в место встречи "
            "монгольского управления, итальянского купеческого капитала и "
            "черноморской торговли."
        ),
        "description_kk": (
            "Бүкіл түбекке өз атын берген Қырым (қазіргі Ескі Қырым) Алтын Орданың "
            "Қара теңіз жағалауындағы облыстық астанасы болды. Оның тағдыры жақын "
            "маңдағы генуялық сауда отары Каффамен тығыз байланысты болды, бұл "
            "облысты моңғол басқармасы, итальян саудагерлерінің капиталы және Қара "
            "теңіз саудасының тоғысу орнына айналдырды."
        ),
        "significance_en": (
            "Crimea was the Golden Horde's window onto the Mediterranean world, where "
            "khans taxed and protected Genoese and Venetian trading posts in exchange "
            "for a share of the immense wealth flowing through the Black Sea ports."
        ),
        "significance_ru": (
            "Крым был окном Золотой Орды в средиземноморский мир, где ханы облагали "
            "пошлиной и защищали генуэзские и венецианские торговые посты в обмен на "
            "долю огромных богатств, проходивших через черноморские порты."
        ),
        "significance_kk": (
            "Қырым Алтын Орданың Жерорта теңізі әлеміне ашылатын терезесі болды, "
            "мұнда хандар генуялық және венециандық сауда бекеттерінен баж алып, "
            "оларды қорғады, ал орнына Қара теңіз порттары арқылы өтетін орасан "
            "байлықтың үлесін алып отырды."
        ),
        "historical_facts_en": [
            "Gave its name to the entire Crimean peninsula, and later to the independent Crimean Khanate that succeeded Golden Horde rule there.",
            "Governed the province that included the Genoese colony of Kaffa (modern Feodosia), one of the Black Sea's busiest trading ports.",
            "A key node on the Genoese and Venetian trade network linking the Golden Horde to Constantinople and the Mediterranean.",
            "Home to a large multi-confessional population of Mongols, Armenians, Greeks, and Italians.",
            "Its mosque of Sultan Uzbek (built 1314) remains one of the oldest surviving Islamic monuments in Crimea.",
        ],
        "historical_facts_ru": [
            "Дал имя всему Крымскому полуострову, а позднее — независимому Крымскому ханству, пришедшему на смену власти Золотой Орды.",
            "Управлял провинцией, включавшей генуэзскую колонию Каффу (современная Феодосия) — один из самых оживлённых торговых портов Чёрного моря.",
            "Ключевой узел генуэзской и венецианской торговой сети, связывавшей Золотую Орду с Константинополем и Средиземноморьем.",
            "Здесь проживало многочисленное многоконфессиональное население — монголы, армяне, греки и итальянцы.",
            "Мечеть Султана Узбека (построена в 1314 году) остаётся одним из старейших сохранившихся исламских памятников Крыма.",
        ],
        "historical_facts_kk": [
            "Бүкіл Қырым түбегіне, ал кейінірек Алтын Орда билігінің орнын басқан тәуелсіз Қырым хандығына өз атын берді.",
            "Қара теңіздің ең тығыз сауда порттарының бірі болған генуялық Каффа (қазіргі Феодосия) отарын қамтыған облысты басқарды.",
            "Алтын Орданы Константинополь мен Жерорта теңізімен байланыстырған генуялық және венециандық сауда желісінің негізгі торабы болды.",
            "Мұнда моңғолдар, армяндар, гректер мен итальяндардан тұратын көп конфессиялы ірі халық қоныстанды.",
            "1314 жылы салынған Сұлтан Өзбек мешіті Қырымдағы сақталған ең көне ислам ескерткіштерінің бірі болып қала береді.",
        ],
        "trade_info_en": (
            "Through the Genoese port of Kaffa, Crimea channeled Central Asian and "
            "Persian silk, spices, and slaves into Mediterranean markets, while Black "
            "Sea grain, salt, and Italian manufactured goods flowed back into the "
            "Horde — a customs relationship that made Crimea one of the richest "
            "provinces in the entire khanate."
        ),
        "trade_info_ru": (
            "Через генуэзский порт Каффу Крым направлял среднеазиатский и персидский "
            "шёлк, пряности и рабов на средиземноморские рынки, а взамен в Орду "
            "поступали черноморское зерно, соль и итальянские промышленные товары — "
            "таможенные отношения, сделавшие Крым одной из богатейших провинций "
            "всего ханства."
        ),
        "trade_info_kk": (
            "Генуялық Каффа порты арқылы Қырым орта азиялық және парсы жібегін, "
            "дәмдеуіштер мен құлдарды Жерорта теңізі нарықтарына жіберіп отырды, ал "
            "орнына Ордаға Қара теңіз астығы, тұзы мен итальян өнеркәсіп тауарлары "
            "келіп жатты — осы кедендік қатынастар Қырымды бүкіл хандықтың ең бай "
            "облыстарының біріне айналдырды."
        ),
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# Artifacts — 3 per category x 10 categories = 30, spread across the 6 cities
# ─────────────────────────────────────────────────────────────────────────────

def _artifact(city_slug: str, rarity: str, name: dict, era: dict, description: dict, historical_context: dict) -> dict:
    return {
        "city_slug": city_slug,
        "rarity": rarity,
        "name_kk": name["kk"], "name_ru": name["ru"], "name_en": name["en"],
        "era_kk": era["kk"], "era_ru": era["ru"], "era_en": era["en"],
        "description_kk": description["kk"], "description_ru": description["ru"], "description_en": description["en"],
        "historical_context_kk": historical_context["kk"],
        "historical_context_ru": historical_context["ru"],
        "historical_context_en": historical_context["en"],
    }


ARTIFACTS = [
    # Coins
    _artifact("sarai-batu", "rare",
        {"en": "Silver Dirham of Öz Beg Khan", "ru": "Серебряный дирхем Узбек-хана", "kk": "Өзбек ханның күміс дирхемі"},
        {"en": "14th century, reign of Öz Beg Khan", "ru": "XIV век, правление Узбек-хана", "kk": "XIV ғасыр, Өзбек хан билігі"},
        {"en": "A hand-struck silver dirham bearing the khan's tamgha and Arabic minting inscription, struck at the Sarai mint during the Golden Horde's economic and territorial peak.",
         "ru": "Ручной чеканки серебряный дирхем с тамгой хана и арабской чеканной надписью, отчеканенный на сарайском монетном дворе в период экономического и территориального расцвета Золотой Орды.",
         "kk": "Ханның тамғасы мен араб жазуы бар, қолмен соғылған күміс дирхем, Алтын Орданың экономикалық және аумақтық гүлдену кезеңінде Сарай ақша сарайында соғылған."},
        {"en": "Öz Beg Khan's currency reforms standardized coinage across the Horde and financed its 14th-century golden age.",
         "ru": "Денежные реформы Узбек-хана унифицировали чеканку монет по всей Орде и финансировали её золотой век в XIV веке.",
         "kk": "Өзбек ханның ақша реформалары Орда бойынша теңге соғуды біріздендіріп, оның XIV ғасырдағы алтын дәуірін қаржыландырды."}),
    _artifact("sarayshyk", "common",
        {"en": "Copper Pul of Toqta Khan", "ru": "Медный пул Токта-хана", "kk": "Тоқта ханның мыс пұлы"},
        {"en": "Late 13th – early 14th century", "ru": "конец XIII – начало XIV века", "kk": "XIII ғ. соңы – XIV ғ. басы"},
        {"en": "A small copper coin used for everyday transactions at the Sarayshyk river crossing, worth a fraction of a silver dirham.",
         "ru": "Небольшая медная монета, использовавшаяся для повседневных расчётов на переправе у Сарайчика, стоившая долю серебряного дирхема.",
         "kk": "Сарайшық өткелінде күнделікті есеп айырысу үшін қолданылған, күміс дирхемнің үлесіне тең тұратын шағын мыс теңге."},
        {"en": "Copper pul coinage supported local trade while silver dirhams handled larger, long-distance exchanges.",
         "ru": "Медные пулы обслуживали местную торговлю, тогда как серебряные дирхемы использовались для крупных дальних сделок.",
         "kk": "Мыс пұлдар жергілікті сауданы қамтамасыз етсе, күміс дирхемдер ірі және қашықтағы мәмілелерде қолданылды."}),
    _artifact("crimea", "legendary",
        {"en": "Genoese-Tatar Trade Dinar", "ru": "Генуэзско-татарский торговый динар", "kk": "Генуя-татар сауда динары"},
        {"en": "14th century", "ru": "XIV век", "kk": "XIV ғасыр"},
        {"en": "A rare gold coin combining Mongol tamgha markings with Genoese minting techniques, evidence of the close commercial ties between Qirim and Kaffa.",
         "ru": "Редкая золотая монета, сочетающая монгольские тамговые знаки с генуэзской техникой чеканки — свидетельство тесных торговых связей между Кырымом и Каффой.",
         "kk": "Моңғол тамға белгілерін генуялық соғу техникасымен үйлестірген сирек кездесетін алтын теңге — Қырым мен Каффа арасындағы тығыз сауда байланысының дәлелі."},
        {"en": "Such hybrid coinage reflects the unusual partnership between Mongol overlords and Italian merchant colonies on the Black Sea.",
         "ru": "Такая гибридная чеканка отражает необычное партнёрство между монгольскими правителями и итальянскими торговыми колониями на Чёрном море.",
         "kk": "Мұндай аралас теңгелер моңғол билеушілері мен Қара теңіздегі итальян сауда отарлары арасындағы ерекше серіктестікті көрсетеді."}),
    # Armor
    _artifact("sygnak", "rare",
        {"en": "Lamellar Cuirass Plates", "ru": "Пластины ламеллярного доспеха", "kk": "Ламеллярлы сауыт пластиналары"},
        {"en": "13th – 14th century", "ru": "XIII–XIV века", "kk": "XIII–XIV ғасырлар"},
        {"en": "Laced iron lamellar plates from a steppe warrior's cuirass, designed for flexibility on horseback.",
         "ru": "Скреплённые шнуром железные ламеллярные пластины от доспеха степного воина, созданные для гибкости при верховой езде.",
         "kk": "Атқа отырғанда икемділік үшін жасалған, баумен бекітілген, дала жауынгерінің сауытынан алынған темір ламелла пластиналары."},
        {"en": "Lamellar armor was standard among Golden Horde cavalry, balancing protection with the mobility nomadic warfare demanded.",
         "ru": "Ламеллярный доспех был стандартным снаряжением конницы Золотой Орды, сочетая защиту с подвижностью, необходимой для кочевой войны.",
         "kk": "Ламеллярлы сауыт Алтын Орда атты әскерінің стандартты жабдығы болды, ол қорғанысты көшпелі соғысқа қажетті қозғалғыштықпен ұштастырды."}),
    _artifact("otrar", "legendary",
        {"en": "Mongol Horseman's Helmet", "ru": "Шлем монгольского всадника", "kk": "Моңғол атты жауынгерінің дулығасы"},
        {"en": "13th century", "ru": "XIII век", "kk": "XIII ғасыр"},
        {"en": "A conical iron helmet with a mail aventail, recovered near Otrar's citadel walls.",
         "ru": "Конический железный шлем с кольчужной бармицей, найденный близ крепостных стен Отрара.",
         "kk": "Отырар цитаделінің қабырғалары маңынан табылған, шынжырлы желкелігі бар конус тәрізді темір дулыға."},
        {"en": "This helmet style, adapted from earlier steppe traditions, spread across Eurasia with Mongol conquests.",
         "ru": "Этот тип шлема, восходящий к более ранним степным традициям, распространился по всей Евразии вместе с монгольскими завоеваниями.",
         "kk": "Ертедегі дала дәстүрлерінен бастау алған бұл дулыға түрі моңғол жаулап алуларымен бірге бүкіл Еуразияға тарады."}),
    _artifact("bolgar", "common",
        {"en": "Chainmail Hauberk Fragment", "ru": "Фрагмент кольчужной рубахи", "kk": "Шынжырлы көйлек фрагменті"},
        {"en": "13th – 14th century", "ru": "XIII–XIV века", "kk": "XIII–XIV ғасырлар"},
        {"en": "A section of riveted chainmail, likely traded north from Golden Horde armories in exchange for furs.",
         "ru": "Часть клёпаной кольчуги, вероятно, поступившая с севера из оружейных мастерских Золотой Орды в обмен на пушнину.",
         "kk": "Алтын Орда қару шеберханаларынан аң терісіне айырбасталып, солтүстікке жеткізілген шынжырлы сауыттың бөлігі."},
        {"en": "Bolgar's smiths adapted Mongol and Rus' metalworking techniques for the northern frontier market.",
         "ru": "Мастера Болгара адаптировали монгольские и русские металлургические приёмы для северного пограничного рынка.",
         "kk": "Болгар зергерлері моңғол және орыс металл өңдеу тәсілдерін солтүстік шекара нарығына бейімдеді."}),
    # Jewelry
    _artifact("sarai-batu", "legendary",
        {"en": "Gold Torque with Granulation", "ru": "Золотая гривна с зернью", "kk": "Дәнек өрнекті алтын алқа"},
        {"en": "14th century", "ru": "XIV век", "kk": "XIV ғасыр"},
        {"en": "An intricately granulated gold neck torque worn by Sarai's nobility, showcasing the city's skilled jewelers.",
         "ru": "Изысканно украшенная зернью золотая шейная гривна, которую носила сарайская знать, демонстрирующая мастерство местных ювелиров.",
         "kk": "Сарай ақсүйектері таққан, дәнек өрнегімен әдемі безендірілген алтын мойын алқасы, қала зергерлерінің шеберлігін көрсетеді."},
        {"en": "Sarai's workshops blended Persian, Chinese, and steppe artistic traditions into a distinctive Golden Horde style.",
         "ru": "Мастерские Сарая соединяли персидские, китайские и степные художественные традиции в самобытный ордынский стиль.",
         "kk": "Сарай шеберханалары парсы, қытай және дала өнер дәстүрлерін өзіндік Алтын Орда стиліне біріктірді."}),
    _artifact("sarayshyk", "rare",
        {"en": "Turquoise-Inlaid Earrings", "ru": "Серьги с бирюзовой инкрустацией", "kk": "Фирузамен өрнектелген сырғалар"},
        {"en": "14th – 15th century", "ru": "XIV–XV века", "kk": "XIV–XV ғасырлар"},
        {"en": "A pair of crescent-shaped silver earrings set with turquoise, typical of steppe nomadic adornment.",
         "ru": "Пара серебряных серёг в форме полумесяца с бирюзовыми вставками, типичных для украшений степных кочевников.",
         "kk": "Дала көшпенділеріне тән, фируза тастары салынған жарты ай тәрізді күміс сырғалар жұбы."},
        {"en": "Turquoise, traded from Central Asian mines, was prized across the Golden Horde for its protective symbolism.",
         "ru": "Бирюза, привозимая из среднеазиатских рудников, высоко ценилась в Золотой Орде за свой защитный символизм.",
         "kk": "Орта Азия кеніштерінен әкелінген фируза Алтын Ордада қорғаныш символикасы үшін жоғары бағаланды."}),
    _artifact("crimea", "rare",
        {"en": "Silver Belt Plaques", "ru": "Серебряные поясные бляшки", "kk": "Күміс белдік тоғалары"},
        {"en": "14th century", "ru": "XIV век", "kk": "XIV ғасыр"},
        {"en": "Ornamental silver plaques from a ceremonial belt, a key marker of status among Mongol-era elites.",
         "ru": "Декоративные серебряные бляшки от церемониального пояса — важный знак статуса среди монгольской элиты.",
         "kk": "Моңғол дәуірінің ақсүйектері арасында мәртебенің маңызды белгісі болған салтанатты белдіктің әшекейлі күміс тоғалары."},
        {"en": "Belt plaques signified military rank and were often gifted by khans to loyal commanders.",
         "ru": "Поясные бляшки обозначали военный чин и часто дарились ханами преданным военачальникам.",
         "kk": "Белдік тоғалары әскери дәрежені білдіріп, оларды хандар адал қолбасшыларына сыйға тартатын."}),
    # Silk
    _artifact("sarai-batu", "legendary",
        {"en": "Chinese Silk Brocade Fragment", "ru": "Фрагмент китайской шёлковой парчи", "kk": "Қытай жібек парчасының фрагменті"},
        {"en": "14th century", "ru": "XIV век", "kk": "XIV ғасыр"},
        {"en": "A fragment of gold-threaded silk brocade (nasij) imported along the Silk Road, likely used in a noble's garment.",
         "ru": "Фрагмент парчи насидж с золотой нитью, привезённой по Шёлковому пути, вероятно, использовавшейся в одежде знати.",
         "kk": "Жібек жолымен әкелінген, алтын жіппен тоқылған насидж парчасының фрагменті, ақсүйек киімінде қолданылған болуы мүмкін."},
        {"en": "Nasij cloth-of-gold was a favored diplomatic gift among Mongol khanates, symbolizing wealth and connection to the Yuan court.",
         "ru": "Ткань насидж (золотая парча) была излюбленным дипломатическим подарком среди монгольских ханств, символизируя богатство и связь с двором Юань.",
         "kk": "Насидж матасы (алтын парча) моңғол хандықтары арасында сүйікті дипломатиялық сый болды, байлық пен Юань сарайымен байланысты білдірді."}),
    _artifact("otrar", "rare",
        {"en": "Persian Silk Sash", "ru": "Персидский шёлковый пояс", "kk": "Парсы жібек белдігі"},
        {"en": "13th – 14th century", "ru": "XIII–XIV века", "kk": "XIII–XIV ғасырлар"},
        {"en": "A woven silk sash with Persian floral motifs, traded through Otrar's Silk Road markets.",
         "ru": "Тканый шёлковый пояс с персидским растительным орнаментом, продававшийся на шёлковых рынках Отрара.",
         "kk": "Отырардың жібек жолы базарларында сатылған, парсы гүлді өрнегі бар тоқыма жібек белдік."},
        {"en": "Otrar's position on the Syr Darya made it a key exchange point for Persian and Central Asian textiles.",
         "ru": "Положение Отрара на Сырдарье делало его ключевым пунктом обмена персидских и среднеазиатских тканей.",
         "kk": "Отырардың Сырдария бойындағы орны оны парсы және орта азиялық маталар алмасатын негізгі нүктеге айналдырды."}),
    _artifact("sygnak", "common",
        {"en": "Embroidered Silk Banner", "ru": "Вышитое шёлковое знамя", "kk": "Кестелі жібек ту"},
        {"en": "14th century", "ru": "XIV век", "kk": "XIV ғасыр"},
        {"en": "A remnant of an embroidered ceremonial banner, likely used in a Sygnak court procession.",
         "ru": "Остаток вышитого церемониального знамени, вероятно, использовавшегося в придворной процессии Сыгнака.",
         "kk": "Сығанақ сарай рәсімінде қолданылған болуы мүмкін, кестеленген салтанатты тудың қалдығы."},
        {"en": "Banners like this marked the authority of White Horde khans during public ceremonies.",
         "ru": "Подобные знамёна символизировали власть ханов Белой Орды во время публичных церемоний.",
         "kk": "Мұндай тулар халыққа арналған салтанатты рәсімдерде Ақ Орда хандарының билігін білдірді."}),
    # Maps
    _artifact("crimea", "legendary",
        {"en": "Genoese Portolan Chart Fragment", "ru": "Фрагмент генуэзской портоланной карты", "kk": "Генуялық портолан картасының фрагменті"},
        {"en": "14th century", "ru": "XIV век", "kk": "XIV ғасыр"},
        {"en": "A fragment of a nautical portolan chart marking Black Sea ports and the overland route to Sarai.",
         "ru": "Фрагмент морской портоланной карты с обозначением черноморских портов и сухопутного пути к Сараю.",
         "kk": "Қара теңіз порттары мен Сарайға баратын құрлық жолын белгілейтін теңіз портолан картасының фрагменті."},
        {"en": "Genoese cartographers in Kaffa produced some of the most accurate charts of the Golden Horde's trade world.",
         "ru": "Генуэзские картографы Каффы создавали одни из самых точных карт торгового мира Золотой Орды.",
         "kk": "Каффадағы генуялық картографтар Алтын Орда сауда әлемінің ең дәл карталарының бірін жасады."}),
    _artifact("otrar", "rare",
        {"en": "Silk Road Itinerary Scroll", "ru": "Свиток маршрута Шёлкового пути", "kk": "Жібек жолы бағыты жазылған шиыршық"},
        {"en": "13th century", "ru": "XIII век", "kk": "XIII ғасыр"},
        {"en": "A merchant's itinerary scroll listing waystations, distances, and caravanserai between Otrar and Samarkand.",
         "ru": "Купеческий свиток-путеводитель с перечнем стоянок, расстояний и караван-сараев между Отраром и Самаркандом.",
         "kk": "Отырар мен Самарқанд арасындағы аялдамалар, қашықтықтар мен керуен-сарайлар тізімі жазылған саудагердің бағыт-жол шиыршығы."},
        {"en": "Such itineraries were essential tools for merchants navigating the vast distances of the Silk Road.",
         "ru": "Подобные путеводители были незаменимым инструментом для купцов, преодолевавших огромные расстояния Шёлкового пути.",
         "kk": "Мұндай бағыттамалар Жібек жолының ұлан-ғайыр қашықтығын жүріп өтетін саудагерлер үшін таптырмас құрал болды."}),
    _artifact("sarayshyk", "common",
        {"en": "Ural River Waypoint Chart", "ru": "Карта переправ реки Урал", "kk": "Жайық өзені өткелдерінің картасы"},
        {"en": "14th century", "ru": "XIV век", "kk": "XIV ғасыр"},
        {"en": "A hand-drawn chart marking river crossings and caravan stops along the Ural River near Sarayshyk.",
         "ru": "Рукописная карта, отмечающая речные переправы и стоянки караванов вдоль Урала близ Сарайчика.",
         "kk": "Сарайшық маңындағы Жайық өзені бойындағы өткелдер мен керуен аялдамаларын белгілейтін қолжазба карта."},
        {"en": "Waypoint charts like this helped caravans time their crossings around seasonal flooding.",
         "ru": "Подобные карты помогали караванам рассчитывать время переправ с учётом сезонных паводков.",
         "kk": "Мұндай карталар керуендерге маусымдық су тасқынын ескере отырып, өткел уақытын есептеуге көмектесті."}),
    # Letters
    _artifact("sarai-batu", "legendary",
        {"en": "Yarlik Decree Fragment", "ru": "Фрагмент ярлыка-указа", "kk": "Жарлықнама фрагменті"},
        {"en": "14th century", "ru": "XIV век", "kk": "XIV ғасыр"},
        {"en": "A fragment of a khan's yarlik — an official decree granting tax exemptions to a religious institution.",
         "ru": "Фрагмент ханского ярлыка — официального указа, освобождавшего религиозное учреждение от налогов.",
         "kk": "Хан жарлығының фрагменті — діни мекемені салықтан босататын ресми жарлықнама."},
        {"en": "Yarliks were the Golden Horde's primary instrument of law, famously used to grant privileges to the Russian Orthodox Church.",
         "ru": "Ярлыки были главным правовым инструментом Золотой Орды, широко известным по грамотам, дававшим привилегии Русской православной церкви.",
         "kk": "Жарлықтар Алтын Орданың негізгі құқықтық құралы болды, әсіресе Орыс православие шіркеуіне артықшылық берген грамоталарымен танымал."}),
    _artifact("sarayshyk", "rare",
        {"en": "Merchant Correspondence in Uyghur Script", "ru": "Купеческая переписка уйгурским письмом", "kk": "Ұйғыр жазуымен жазылған сауда хат-хабары"},
        {"en": "14th century", "ru": "XIV век", "kk": "XIV ғасыр"},
        {"en": "A merchant's business letter written in the Uyghur script used for Mongol administrative correspondence.",
         "ru": "Деловое письмо купца, написанное уйгурским письмом, использовавшимся в монгольском делопроизводстве.",
         "kk": "Моңғол іс қағаздарында қолданылған ұйғыр жазуымен жазылған саудагердің іскери хаты."},
        {"en": "Uyghur script was adopted by the Mongol chancellery for record-keeping across the empire's vast bureaucracy.",
         "ru": "Уйгурское письмо было принято монгольской канцелярией для ведения записей в огромной бюрократии империи.",
         "kk": "Ұйғыр жазуын моңғол канцеляриясы империяның үлкен бюрократиялық жүйесінде жазба жүргізу үшін қабылдаған."}),
    _artifact("crimea", "legendary",
        {"en": "Diplomatic Letter to Mamluk Egypt", "ru": "Дипломатическое письмо мамлюкскому Египту", "kk": "Мәмлүк Мысырына жолданған дипломатиялық хат"},
        {"en": "14th century", "ru": "XIV век", "kk": "XIV ғасыр"},
        {"en": "A draft of a diplomatic letter proposing an alliance with the Mamluk Sultanate against the Ilkhanate.",
         "ru": "Черновик дипломатического письма, предлагающего союз с мамлюкским султанатом против Ильханата.",
         "kk": "Ильханатқа қарсы мәмлүк сұлтандығымен одақ құруды ұсынған дипломатиялық хаттың жобасы."},
        {"en": "The Golden Horde and Mamluk Egypt maintained a long alliance rooted in shared rivalry with the Ilkhanids of Persia.",
         "ru": "Золотая Орда и мамлюкский Египет поддерживали долгий союз, основанный на общем соперничестве с ильханами Персии.",
         "kk": "Алтын Орда мен мәмлүк Мысыры Парсы ильхандарына деген ортақ қарсыластыққа негізделген ұзақ одақты сақтады."}),
    # Weapons
    _artifact("sygnak", "legendary",
        {"en": "Composite Recurve Bow", "ru": "Составной изогнутый лук", "kk": "Құрама доғал садақ"},
        {"en": "13th – 14th century", "ru": "XIII–XIV века", "kk": "XIII–XIV ғасырлар"},
        {"en": "A laminated horn-and-sinew recurve bow, the signature weapon of Mongol and Kipchak horse archers.",
         "ru": "Слоистый лук из рога и сухожилий — фирменное оружие монгольских и кипчакских конных лучников.",
         "kk": "Мүйіз бен сіңірден қабатталып жасалған, моңғол және қыпшақ атты садақшыларының басты қаруы болған садақ."},
        {"en": "This bow design gave steppe cavalry devastating range and power, a decisive advantage in Mongol conquests.",
         "ru": "Конструкция этого лука давала степной коннице разрушительную дальность и мощь — решающее преимущество в монгольских завоеваниях.",
         "kk": "Бұл садақтың құрылымы дала атты әскеріне алыс қашықтық пен қуат берді — моңғол жаулап алуларындағы шешуші басымдық."}),
    _artifact("otrar", "rare",
        {"en": "Mongol Saber", "ru": "Монгольская сабля", "kk": "Моңғол қылышы"},
        {"en": "13th century", "ru": "XIII век", "kk": "XIII ғасыр"},
        {"en": "A curved single-edged saber recovered near Otrar's siege works, likely dating to the 1219–1220 conquest.",
         "ru": "Изогнутая однолезвийная сабля, найденная у осадных сооружений Отрара, вероятно, датируемая завоеванием 1219–1220 годов.",
         "kk": "Отырар қоршау құрылыстары маңынан табылған, 1219–1220 жылдардағы жаулап алу кезеңіне жататын болуы мүмкін, бір жүзді қисық қылыш."},
        {"en": "The curved saber design proved highly effective for mounted combat and spread widely across Eurasia.",
         "ru": "Изогнутая форма сабли оказалась чрезвычайно эффективной в конном бою и широко распространилась по Евразии.",
         "kk": "Қылыштың қисық пішіні атты жекпе-жекте өте тиімді болып, бүкіл Еуразияға кеңінен таралды."}),
    _artifact("bolgar", "common",
        {"en": "Iron-Tipped Lance", "ru": "Копьё с железным наконечником", "kk": "Темір ұшты найза"},
        {"en": "13th – 14th century", "ru": "XIII–XIV века", "kk": "XIII–XIV ғасырлар"},
        {"en": "A cavalry lance head from Bolgar's northern garrisons, used to defend the Horde's forest frontier.",
         "ru": "Наконечник кавалерийского копья из северных гарнизонов Болгара, служивший для защиты лесной границы Орды.",
         "kk": "Болгардың солтүстік гарнизондарынан алынған, Орданың орман шекарасын қорғауға қызмет еткен атты әскер найзасының ұшы."},
        {"en": "Bolgar's garrisons protected the lucrative fur trade routes from raids by northern forest peoples.",
         "ru": "Гарнизоны Болгара охраняли прибыльные пути пушной торговли от набегов северных лесных племён.",
         "kk": "Болгар гарнизондары табысты аң терісі сауда жолдарын солтүстік орман тайпаларының шабуылдарынан қорғады."}),
    # Pottery
    _artifact("bolgar", "rare",
        {"en": "Glazed Bowl with Sufi Calligraphy", "ru": "Глазурованная чаша с суфийской каллиграфией", "kk": "Сопылық каллиграфиясы бар глазурьленген тостаған"},
        {"en": "14th century", "ru": "XIV век", "kk": "XIV ғасыр"},
        {"en": "A turquoise-glazed ceramic bowl inscribed with a Sufi poetic verse, reflecting Bolgar's Islamic scholarly culture.",
         "ru": "Керамическая чаша с бирюзовой глазурью, украшенная суфийским поэтическим стихом, отражающая исламскую учёную культуру Болгара.",
         "kk": "Болгардың ислам ғылыми мәдениетін көрсететін, сопылық поэтикалық өлеңмен безендірілген, фируза түсті глазурьленген керамикалық тостаған."},
        {"en": "Bolgar was a center of Islamic learning, and its potters often decorated wares with religious and poetic texts.",
         "ru": "Болгар был центром исламской учёности, и его гончары часто украшали изделия религиозными и поэтическими текстами.",
         "kk": "Болгар ислам ғылымының орталығы болды, оның құмырашылары бұйымдарды жиі діни және поэтикалық мәтіндермен безендірді."}),
    _artifact("sarai-batu", "legendary",
        {"en": "Kashan-Style Tile Fragment", "ru": "Фрагмент изразца в кашанском стиле", "kk": "Кашан стиліндегі кафель фрагменті"},
        {"en": "14th century", "ru": "XIV век", "kk": "XIV ғасыр"},
        {"en": "A luster-painted tile fragment in the Persian Kashan style, likely used to decorate a palace wall.",
         "ru": "Фрагмент люстрового изразца в персидском кашанском стиле, вероятно, украшавшего стену дворца.",
         "kk": "Сарай қабырғасын безендірген болуы мүмкін, парсылық Кашан стиліндегі жалтыр кафель фрагменті."},
        {"en": "Persian craftsmen brought to Sarai by the khans introduced luxurious architectural tilework to the Horde's capital.",
         "ru": "Персидские мастера, приглашённые ханами в Сарай, привнесли роскошную архитектурную плитку в столицу Орды.",
         "kk": "Хандар Сарайға шақырған парсы шеберлері Орда астанасына сәулет кафелінің салтанатты өнерін әкелді."}),
    _artifact("otrar", "common",
        {"en": "Blue-Glazed Jug", "ru": "Кувшин с синей глазурью", "kk": "Көк глазурьлі құмыра"},
        {"en": "13th – 14th century", "ru": "XIII–XIV века", "kk": "XIII–XIV ғасырлар"},
        {"en": "A cobalt-blue glazed water jug typical of Central Asian household pottery of the period.",
         "ru": "Кувшин для воды с кобальтовой глазурью, типичный для среднеазиатской бытовой керамики того периода.",
         "kk": "Сол дәуірдегі орта азиялық тұрмыстық керамикаға тән, кобальт глазурьлі су құмырасы."},
        {"en": "Blue-glazed wares were a hallmark of Central Asian ceramic traditions that flourished under Mongol patronage.",
         "ru": "Изделия с синей глазурью были характерной чертой среднеазиатских керамических традиций, процветавших под покровительством монголов.",
         "kk": "Көк глазурьлі бұйымдар моңғолдардың қамқорлығымен гүлденген орта азиялық керамика дәстүрінің айрықша белгісі болды."}),
    # Horse equipment
    _artifact("sygnak", "rare",
        {"en": "Ornamented Stirrups", "ru": "Украшенные стремена", "kk": "Өрнектелген үзеңгілер"},
        {"en": "13th – 14th century", "ru": "XIII–XIV века", "kk": "XIII–XIV ғасырлар"},
        {"en": "A pair of bronze stirrups with incised geometric ornament, belonging to a steppe cavalryman.",
         "ru": "Пара бронзовых стремян с гравированным геометрическим орнаментом, принадлежавших степному всаднику.",
         "kk": "Дала атты жауынгеріне тиесілі, геометриялық өрнекпен ойылған қола үзеңгілер жұбы."},
        {"en": "The stirrup was central to Mongol horsemanship, enabling the stability needed for mounted archery.",
         "ru": "Стремя играло центральную роль в монгольском верховом искусстве, обеспечивая устойчивость, необходимую для конной стрельбы из лука.",
         "kk": "Үзеңгі моңғол атқа міну өнерінде басты рөл атқарып, атты садақ атуға қажетті тұрақтылықты қамтамасыз етті."}),
    _artifact("sarayshyk", "common",
        {"en": "Bronze Bridle Bit", "ru": "Бронзовые удила", "kk": "Қола ауыздық"},
        {"en": "13th – 14th century", "ru": "XIII–XIV века", "kk": "XIII–XIV ғасырлар"},
        {"en": "A jointed bronze bridle bit from a Sarayshyk waystation stable, worn smooth from daily use.",
         "ru": "Шарнирные бронзовые удила из конюшни Сарайчика, отполированные ежедневным использованием.",
         "kk": "Сарайшық аттахана-стансасынан алынған, күнделікті пайдаланудан жылтыраған буынды қола ауыздық."},
        {"en": "Reliable horse equipment was essential for the relay stations (yam) that carried messages across the empire.",
         "ru": "Надёжное конское снаряжение было незаменимо для станций ямской службы, передававших сообщения по всей империи.",
         "kk": "Сенімді ат әбзелі империя бойынша хабар тасымалдайтын ям стансаларына таптырмас болды."}),
    _artifact("crimea", "legendary",
        {"en": "Silver-Inlaid Saddle Plate", "ru": "Седельная пластина с серебряной инкрустацией", "kk": "Күміспен әшекейленген ер тоқымы тақтасы"},
        {"en": "14th century", "ru": "XIV век", "kk": "XIV ғасыр"},
        {"en": "A ceremonial saddle plate inlaid with silver wire, likely belonging to a high-ranking official in Crimea.",
         "ru": "Церемониальная седельная пластина с серебряной проволочной инкрустацией, вероятно, принадлежавшая высокопоставленному чиновнику Крыма.",
         "kk": "Қырымдағы жоғары лауазымды шенеунікке тиесілі болуы мүмкін, күміс сыммен әшекейленген салтанатты ер тоқымы тақтасы."},
        {"en": "Elaborate saddle fittings signified rank among Golden Horde officials and Genoese trade partners alike.",
         "ru": "Роскошное седельное убранство обозначало ранг среди ордынских чиновников и генуэзских торговых партнёров.",
         "kk": "Салтанатты ер-тұрман әбзелдері Орда шенеуніктері мен генуялық сауда серіктестері арасында дәрежені білдірді."}),
    # Books
    _artifact("bolgar", "legendary",
        {"en": "Qur'an Manuscript Page", "ru": "Страница рукописного Корана", "kk": "Қолжазба Құран парағы"},
        {"en": "14th century", "ru": "XIV век", "kk": "XIV ғасыр"},
        {"en": "An illuminated page from a hand-copied Qur'an, produced in one of Bolgar's madrasas.",
         "ru": "Иллюминированная страница рукописного Корана, созданная в одном из медресе Болгара.",
         "kk": "Болгардың медреселерінің бірінде жасалған, безендірілген қолжазба Құран парағы."},
        {"en": "Bolgar's madrasas were centers of Islamic learning that served the Golden Horde's northern Muslim communities.",
         "ru": "Медресе Болгара были центрами исламского образования, служившими северным мусульманским общинам Золотой Орды.",
         "kk": "Болгар медреселері Алтын Орданың солтүстік мұсылман қауымдарына қызмет еткен ислам білімінің орталықтары болды."}),
    _artifact("otrar", "rare",
        {"en": "Astronomical Treatise Fragment", "ru": "Фрагмент астрономического трактата", "kk": "Астрономиялық трактат фрагменті"},
        {"en": "13th – 14th century", "ru": "XIII–XIV века", "kk": "XIII–XIV ғасырлар"},
        {"en": "A fragment of an astronomical treatise, continuing the scholarly tradition associated with Otrar's native son Al-Farabi.",
         "ru": "Фрагмент астрономического трактата, продолжающий научную традицию, связанную с уроженцем Отрара Аль-Фараби.",
         "kk": "Отырардың перзенті Әл-Фарабимен байланысты ғылыми дәстүрді жалғастырған астрономиялық трактат фрагменті."},
        {"en": "Otrar's intellectual heritage endured through the Mongol period in the region's madrasas and observatories.",
         "ru": "Интеллектуальное наследие Отрара сохранялось в монгольскую эпоху в медресе и обсерваториях региона.",
         "kk": "Отырардың зияткерлік мұрасы моңғол дәуірінде өңірдегі медреселер мен обсерваторияларда сақталып отырды."}),
    _artifact("sarai-batu", "rare",
        {"en": "Chronicle Fragment on Jochid Genealogy", "ru": "Фрагмент хроники о родословной Джучидов", "kk": "Жошылықтардың шежіресі туралы хроника фрагменті"},
        {"en": "14th century", "ru": "XIV век", "kk": "XIV ғасыр"},
        {"en": "A fragment of a chronicle recording the genealogy of the Jochid khans descended from Genghis Khan's eldest son.",
         "ru": "Фрагмент хроники, фиксирующей родословную ханов-Джучидов, потомков старшего сына Чингисхана.",
         "kk": "Шыңғыс ханның үлкен ұлынан тарайтын Жошылық хандардың шежіресін тіркейтін хроника фрагменті."},
        {"en": "Genealogical chronicles legitimized a khan's right to rule and were carefully maintained at the Sarai court.",
         "ru": "Генеалогические хроники легитимировали право хана на власть и тщательно велись при сарайском дворе.",
         "kk": "Шежірелік хроникалар ханның билікке құқығын заңдастырып, Сарай сарайында мұқият жүргізілді."}),
]

# ─────────────────────────────────────────────────────────────────────────────
# Quests — difficulty tiers scale rewards/cooldown/time consistently
# ─────────────────────────────────────────────────────────────────────────────

_QUEST_TIERS = {
    "easy": {"points": 60, "xp_reward": 75, "coin_reward": 10, "cooldown_hours": 4, "estimated_time_minutes": 8},
    "medium": {"points": 150, "xp_reward": 180, "coin_reward": 25, "cooldown_hours": 18, "estimated_time_minutes": 15},
    "hard": {"points": 320, "xp_reward": 400, "coin_reward": 60, "cooldown_hours": 60, "estimated_time_minutes": 25},
}


def _quest(city_slug: str, title: dict, description: dict, difficulty: str, category: str) -> dict:
    tier = _QUEST_TIERS[difficulty]
    return {
        "city_slug": city_slug,
        "title_kk": title["kk"], "title_ru": title["ru"], "title_en": title["en"],
        "description_kk": description["kk"], "description_ru": description["ru"], "description_en": description["en"],
        "difficulty": difficulty,
        "category": category,
        **tier,
    }


QUESTS = [
    # Sarai Batu
    _quest("sarai-batu",
           {"en": "Walk the Streets of the Capital", "ru": "Прогулка по улицам столицы", "kk": "Астана көшелерімен серуен"},
           {"en": "Explore the layout of Sarai Batu and identify the quarters where Mongol, Kipchak, Rus', and Italian merchants once lived side by side.",
            "ru": "Исследуйте планировку Сарай-Бату и определите кварталы, где бок о бок жили монгольские, кипчакские, русские и итальянские купцы.",
            "kk": "Сарай-Бату жоспарлауын зерттеп, моңғол, қыпшақ, орыс және итальян саудагерлері қатар өмір сүрген алаптарды анықтаңыз."},
           "easy", "exploration"),
    _quest("sarai-batu",
           {"en": "The Friar's Account", "ru": "Записки монаха", "kk": "Монахтың жазбалары"},
           {"en": "Read William of Rubruck's 1253 travel account and answer questions about what he observed in the khan's capital.",
            "ru": "Прочитайте путевые записки Гильома де Рубрука 1253 года и ответьте на вопросы о том, что он увидел в ханской столице.",
            "kk": "Гильом де Рубруктің 1253 жылғы саяхат жазбаларын оқып, оның хан астанасында көрген-білгендері туралы сұрақтарға жауап беріңіз."},
           "medium", "knowledge"),
    _quest("sarai-batu",
           {"en": "Mint Your Own Dirham", "ru": "Отчеканьте свой дирхем", "kk": "Өз дирхеміңізді соғыңыз"},
           {"en": "Learn how the Sarai mint struck silver dirhams and trace the inscriptions back to Öz Beg Khan's reign.",
            "ru": "Узнайте, как сарайский монетный двор чеканил серебряные дирхемы, и проследите надписи до времён правления Узбек-хана.",
            "kk": "Сарай ақша сарайының күміс дирхемдерді қалай соққанын біліп, жазуларды Өзбек хан билігіне дейін бақылаңыз."},
           "medium", "culture"),
    _quest("sarai-batu",
           {"en": "Ibn Battuta's Route", "ru": "Маршрут Ибн Баттуты", "kk": "Ибн Баттута бағыты"},
           {"en": "Retrace the Moroccan traveler Ibn Battuta's 1330s journey through Sarai and the impressions he recorded.",
            "ru": "Пройдите маршрут марокканского путешественника Ибн Баттуты через Сарай в 1330-х годах и его записанные впечатления.",
            "kk": "Марокколық саяхатшы Ибн Баттутаның 1330-жылдардағы Сарай арқылы өткен жолын және оның жазып қалдырған әсерлерін қайта өтіп шығыңыз."},
           "hard", "exploration"),
    _quest("sarai-batu",
           {"en": "Negotiate with the Yarlik", "ru": "Переговоры с ярлыком", "kk": "Жарлықпен келіссөз"},
           {"en": "Study a khan's yarlik decree and determine what privileges it granted and to whom.",
            "ru": "Изучите ханский ярлык-указ и определите, какие привилегии и кому он предоставлял.",
            "kk": "Хан жарлығын зерттеп, ол қандай артықшылықтарды және кімге бергенін анықтаңыз."},
           "hard", "diplomacy"),
    _quest("sarai-batu",
           {"en": "Palace Ruins Survey", "ru": "Обследование руин дворца", "kk": "Сарай қирандыларын зерттеу"},
           {"en": "Help catalog fragments from Sarai's monumental palace complex uncovered by archaeologists.",
            "ru": "Помогите каталогизировать фрагменты монументального дворцового комплекса Сарая, обнаруженные археологами.",
            "kk": "Археологтар тапқан Сарайдың сәулетті сарай кешенінің фрагменттерін каталогтауға көмектесіңіз."},
           "easy", "exploration"),
    _quest("sarai-batu",
           {"en": "The Fall After Timur", "ru": "Падение после Тимура", "kk": "Темірден кейінгі құлдырау"},
           {"en": "Investigate how Timur's 1395 raid accelerated Sarai's decline as the Horde's capital.",
            "ru": "Исследуйте, как набег Тимура в 1395 году ускорил упадок Сарая как столицы Орды.",
            "kk": "1395 жылғы Темірдің жорығы Сарайдың Орда астанасы ретіндегі құлдырауын қалай жеделдеткенін зерттеңіз."},
           "medium", "knowledge"),
    # Sarayshyk
    _quest("sarayshyk",
           {"en": "Cross the Ural", "ru": "Переправа через Урал", "kk": "Жайықтан өту"},
           {"en": "Chart the safest river crossing at Sarayshyk used by caravans moving between Sarai and Khwarezm.",
            "ru": "Определите самую безопасную речную переправу у Сарайчика, которой пользовались караваны между Сараем и Хорезмом.",
            "kk": "Сарай мен Хорезм арасында жүрген керуендер пайдаланған Сарайшықтағы ең қауіпсіз өзен өткелін анықтаңыз."},
           "easy", "exploration"),
    _quest("sarayshyk",
           {"en": "Caravanserai Ledger", "ru": "Книга караван-сарая", "kk": "Керуен-сарай кітабы"},
           {"en": "Review a merchant's ledger recorded at a Sarayshyk waystation and total the goods taxed there.",
            "ru": "Изучите купеческую бухгалтерскую книгу, составленную на стоянке Сарайчика, и подсчитайте обложенные пошлиной товары.",
            "kk": "Сарайшық аялдамасында жазылған саудагердің есеп кітабын қарап, баж салынған тауарларды жинақтаңыз."},
           "medium", "trade"),
    _quest("sarayshyk",
           {"en": "From Horde to Khanate", "ru": "От Орды к ханству", "kk": "Ордадан хандыққа"},
           {"en": "Trace how Sarayshyk transitioned from a Golden Horde waypoint to a capital of the early Kazakh Khanate.",
            "ru": "Проследите, как Сарайчик превратился из перевалочного пункта Золотой Орды в столицу раннего Казахского ханства.",
            "kk": "Сарайшықтың Алтын Орда бекетінен ерте Қазақ хандығының астанасына айналу жолын бақылаңыз."},
           "hard", "knowledge"),
    _quest("sarayshyk",
           {"en": "Flood and Rebuild", "ru": "Наводнение и восстановление", "kk": "Тасқын және қайта салу"},
           {"en": "Examine archaeological layers showing how Sarayshyk was rebuilt after repeated Ural River floods.",
            "ru": "Изучите археологические слои, показывающие, как Сарайчик восстанавливался после многократных наводнений реки Урал.",
            "kk": "Жайық өзенінің қайталанған тасқындарынан кейін Сарайшықтың қалай қайта салынғанын көрсететін археологиялық қабаттарды зерттеңіз."},
           "medium", "exploration"),
    _quest("sarayshyk",
           {"en": "The Nogai Horde's Seat", "ru": "Резиденция Ногайской Орды", "kk": "Ноғай Ордасының ордасы"},
           {"en": "Learn how Sarayshyk briefly served as a capital of the Nogai Horde after the Golden Horde's fragmentation.",
            "ru": "Узнайте, как Сарайчик недолго служил столицей Ногайской Орды после распада Золотой Орды.",
            "kk": "Алтын Орда ыдырағаннан кейін Сарайшықтың қалай қысқа мерзімге Ноғай Ордасының астанасы болғанын біліңіз."},
           "hard", "diplomacy"),
    _quest("sarayshyk",
           {"en": "Coin Hoard Discovery", "ru": "Обнаружение клада монет", "kk": "Теңге қоймасын табу"},
           {"en": "Sort a hoard of excavated coins by mint and reign to help date a Sarayshyk household site.",
            "ru": "Рассортируйте найденный клад монет по монетному двору и правлению, чтобы датировать усадьбу в Сарайчике.",
            "kk": "Сарайшықтағы тұрғын үй орнын күнін анықтауға көмектесу үшін табылған теңгелерді ақша сарайы мен билік кезеңіне қарай сұрыптаңыз."},
           "medium", "culture"),
    _quest("sarayshyk",
           {"en": "Waystation Watch", "ru": "Дежурство на заставе", "kk": "Бекеттегі кезекшілік"},
           {"en": "Identify what goods and travelers a Sarayshyk customs post would have processed in a single day.",
            "ru": "Определите, какие товары и путешественники проходили через таможенный пост Сарайчика за один день.",
            "kk": "Сарайшық кеден бекеті бір күнде қандай тауарлар мен саяхатшыларды өткізетінін анықтаңыз."},
           "easy", "trade"),
    # Otrar
    _quest("otrar",
           {"en": "The Fatal Caravan", "ru": "Роковой караван", "kk": "Тағдырлы керуен"},
           {"en": "Investigate the 1219 Otrar incident and understand how it triggered the Mongol invasion of Khwarezm.",
            "ru": "Исследуйте Отрарский инцидент 1219 года и поймите, как он спровоцировал монгольское вторжение в Хорезм.",
            "kk": "1219 жылғы Отырар оқиғасын зерттеп, оның моңғолдардың Хорезмге басып кіруіне қалай түрткі болғанын түсініңіз."},
           "hard", "knowledge"),
    _quest("otrar",
           {"en": "Al-Farabi's Hometown", "ru": "Родина Аль-Фараби", "kk": "Әл-Фарабидің туған жері"},
           {"en": "Explore Otrar's legacy as the traditional birthplace of the philosopher Al-Farabi.",
            "ru": "Исследуйте наследие Отрара как традиционного места рождения философа Аль-Фараби.",
            "kk": "Отырардың философ Әл-Фарабидің дәстүрлі туған жері ретіндегі мұрасын зерттеңіз."},
           "easy", "culture"),
    _quest("otrar",
           {"en": "Siege Works Survey", "ru": "Осмотр осадных сооружений", "kk": "Қоршау құрылыстарын зерттеу"},
           {"en": "Study the remains of the siege works built around Otrar's citadel during its 1219–1220 conquest.",
            "ru": "Изучите остатки осадных сооружений, возведённых вокруг цитадели Отрара во время завоевания 1219–1220 годов.",
            "kk": "1219–1220 жылдардағы жаулап алу кезінде Отырар цитаделі айналасында салынған қоршау құрылыстарының қалдықтарын зерттеңіз."},
           "medium", "exploration"),
    _quest("otrar",
           {"en": "Timur's Last Camp", "ru": "Последняя стоянка Тимура", "kk": "Темірдің соңғы тұрағы"},
           {"en": "Uncover the story of Timur's death at Otrar in 1405 while preparing his campaign against Ming China.",
            "ru": "Раскройте историю смерти Тимура в Отраре в 1405 году во время подготовки похода против империи Мин.",
            "kk": "Темірдің Мин Қытайына жорыққа дайындалып жатқанда 1405 жылы Отырарда қайтыс болу тарихын ашыңыз."},
           "medium", "knowledge"),
    _quest("otrar",
           {"en": "Citadel Excavation", "ru": "Раскопки цитадели", "kk": "Цитадельді қазу"},
           {"en": "Assist in mapping Otrar's excavated citadel, mosques, and bathhouses layer by layer.",
            "ru": "Помогите послойно картировать раскопанную цитадель, мечети и бани Отрара.",
            "kk": "Отырардың қазылған цитаделін, мешіттері мен моншаларын қабат-қабат карталауға көмектесіңіз."},
           "hard", "exploration"),
    _quest("otrar",
           {"en": "Silk Road Ledger", "ru": "Гроссбух Шёлкового пути", "kk": "Жібек жолы кітабы"},
           {"en": "Balance a merchant's itinerary scroll listing distances and caravanserai between Otrar and Samarkand.",
            "ru": "Сверьте купеческий свиток-путеводитель с расстояниями и караван-сараями между Отраром и Самаркандом.",
            "kk": "Отырар мен Самарқанд арасындағы қашықтықтар мен керуен-сарайлар жазылған саудагердің жол шиыршығын тексеріңіз."},
           "medium", "trade"),
    _quest("otrar",
           {"en": "Scholars of Otrar", "ru": "Учёные Отрара", "kk": "Отырар ғалымдары"},
           {"en": "Research the madrasas and observatories that kept Otrar's scholarly tradition alive under Mongol rule.",
            "ru": "Изучите медресе и обсерватории, сохранявшие научную традицию Отрара во времена монгольского владычества.",
            "kk": "Моңғол билігі кезінде Отырардың ғылыми дәстүрін сақтап қалған медреселер мен обсерваторияларды зерттеңіз."},
           "easy", "knowledge"),
    # Sygnak
    _quest("sygnak",
           {"en": "Coronation on the Syr Darya", "ru": "Коронация на Сырдарье", "kk": "Сырдария бойындағы тағайындалу"},
           {"en": "Learn how Sygnak served as the coronation seat for White Horde and early Kazakh khans.",
            "ru": "Узнайте, как Сыгнак служил местом коронации ханов Белой Орды и ранних казахских ханов.",
            "kk": "Сығанақтың Ақ Орда мен ерте қазақ хандарының тағайындалу орны болғанын біліңіз."},
           "medium", "diplomacy"),
    _quest("sygnak",
           {"en": "Capital of the White Horde", "ru": "Столица Белой Орды", "kk": "Ақ Орда астанасы"},
           {"en": "Explore how Erzen Khan established Sygnak as the White Horde's capital in the 14th century.",
            "ru": "Исследуйте, как хан Эрзен сделал Сыгнак столицей Белой Орды в XIV веке.",
            "kk": "Ерзен ханның XIV ғасырда Сығанақты Ақ Орда астанасы етіп орнатуын зерттеңіз."},
           "hard", "knowledge"),
    _quest("sygnak",
           {"en": "Bowyer's Craft", "ru": "Ремесло лучника", "kk": "Садақ жасау өнері"},
           {"en": "Study the construction of a composite recurve bow, the signature weapon of steppe horse archers.",
            "ru": "Изучите конструкцию составного изогнутого лука — фирменного оружия степных конных лучников.",
            "kk": "Дала атты садақшыларының басты қаруы болған құрама доғал садақтың құрылымын зерттеңіз."},
           "medium", "culture"),
    _quest("sygnak",
           {"en": "River Customs Post", "ru": "Речная таможня", "kk": "Өзен кеден бекеті"},
           {"en": "Calculate the tolls a Sygnak customs post would collect from a wool caravan crossing the Syr Darya.",
            "ru": "Рассчитайте пошлины, которые таможенный пост Сыгнака взимал бы с каравана шерсти, пересекающего Сырдарью.",
            "kk": "Сырдариядан өтетін жүн керуенінен Сығанақ кеден бекеті алатын бажды есептеңіз."},
           "easy", "trade"),
    _quest("sygnak",
           {"en": "Steppe and Settlement", "ru": "Степь и оседлость", "kk": "Дала мен отырықшылық"},
           {"en": "Compare how Sygnak balanced nomadic steppe traditions with the settled life of a river-trade town.",
            "ru": "Сравните, как Сыгнак сочетал кочевые степные традиции с оседлой жизнью торгового города на реке.",
            "kk": "Сығанақтың көшпелі дала дәстүрлерін өзен сауда қаласының отырықшы өмірімен қалай ұштастырғанын салыстырыңыз."},
           "medium", "exploration"),
    _quest("sygnak",
           {"en": "Decline to Sauran", "ru": "Упадок в пользу Саурана", "kk": "Сауранға ауысу"},
           {"en": "Investigate how the rise of neighboring Sauran drew trade and power away from Sygnak.",
            "ru": "Исследуйте, как возвышение соседнего Саурана оттянуло торговлю и власть от Сыгнака.",
            "kk": "Көрші Сауранның көтерілуі сауда мен билікті Сығанақтан қалай алшақтатқанын зерттеңіз."},
           "hard", "knowledge"),
    _quest("sygnak",
           {"en": "Ruins Near Sozak", "ru": "Руины у Созака", "kk": "Созақ маңындағы қирандылар"},
           {"en": "Review 19th-century survey notes on Sygnak's ruins near modern Sozak, Kazakhstan.",
            "ru": "Изучите записи обследований XIX века о руинах Сыгнака близ современного Созака в Казахстане.",
            "kk": "Қазіргі Қазақстандағы Созақ маңындағы Сығанақ қирандылары туралы XIX ғасырдағы зерттеу жазбаларын қараңыз."},
           "easy", "exploration"),
    # Bolgar
    _quest("bolgar",
           {"en": "The Small Hajj", "ru": "Малый хадж", "kk": "Кіші қажылық"},
           {"en": "Learn why Bolgar's ruins became a place of pilgrimage — the \"Small Hajj\" — for Volga-region Muslims.",
            "ru": "Узнайте, почему руины Болгара стали местом паломничества — «Малым хаджем» — для мусульман Поволжья.",
            "kk": "Болгар қирандыларының неге Еділ өңірі мұсылмандары үшін қажылық орны — «Кіші қажылыққа» айналғанын біліңіз."},
           "easy", "culture"),
    _quest("bolgar",
           {"en": "Mongol Conquest of 1236", "ru": "Монгольское завоевание 1236 года", "kk": "1236 жылғы моңғол жаулап алуы"},
           {"en": "Study how Batu Khan's commanders conquered Volga Bulgaria's capital in 1236.",
            "ru": "Изучите, как военачальники Бату-хана завоевали столицу Волжской Булгарии в 1236 году.",
            "kk": "Бату ханның қолбасшыларының 1236 жылы Еділ Бұлғариясының астанасын қалай жаулап алғанын зерттеңіз."},
           "medium", "knowledge"),
    _quest("bolgar",
           {"en": "The White Mosque", "ru": "Белая мечеть", "kk": "Ақ мешіт"},
           {"en": "Explore the architecture of Bolgar's surviving White Mosque and Great Minaret.",
            "ru": "Исследуйте архитектуру сохранившихся Белой мечети и Большого минарета Болгара.",
            "kk": "Болгардың сақталған Ақ мешіті мен Үлкен мұнарасының сәулетін зерттеңіз."},
           "medium", "exploration"),
    _quest("bolgar",
           {"en": "Fur Trade Ledger", "ru": "Гроссбух пушной торговли", "kk": "Аң терісі сауда кітабы"},
           {"en": "Balance a trade record exchanging sable and ermine furs for silver and textiles at Bolgar.",
            "ru": "Сверьте торговую запись обмена соболиных и горностаевых мехов на серебро и ткани в Болгаре.",
            "kk": "Болгарда бұлғын мен ақ құндыз терісін күміс пен матаға айырбастау жазбасын тексеріңіз."},
           "hard", "trade"),
    _quest("bolgar",
           {"en": "Mint of the North", "ru": "Монетный двор Севера", "kk": "Солтүстіктің ақша сарайы"},
           {"en": "Trace silver dirhams struck at the Bolgar mint to their circulation across the Horde's northern territories.",
            "ru": "Проследите путь серебряных дирхемов, отчеканенных на болгарском монетном дворе, по северным владениям Орды.",
            "kk": "Болгар ақша сарайында соғылған күміс дирхемдердің Орданың солтүстік аумақтарында айналысын бақылаңыз."},
           "medium", "culture"),
    _quest("bolgar",
           {"en": "UNESCO Heritage Survey", "ru": "Обзор наследия ЮНЕСКО", "kk": "ЮНЕСКО мұрасын шолу"},
           {"en": "Review the criteria that earned Bolgar's historical complex UNESCO World Heritage status.",
            "ru": "Изучите критерии, по которым исторический комплекс Болгара получил статус Всемирного наследия ЮНЕСКО.",
            "kk": "Болгар тарихи кешенінің ЮНЕСКО Дүниежүзілік мұрасы мәртебесін алу критерийлерін қараңыз."},
           "easy", "knowledge"),
    _quest("bolgar",
           {"en": "Madrasa Manuscripts", "ru": "Рукописи медресе", "kk": "Медресе қолжазбалары"},
           {"en": "Examine an illuminated Qur'an page produced in one of Bolgar's Islamic madrasas.",
            "ru": "Изучите иллюминированную страницу Корана, созданную в одном из исламских медресе Болгара.",
            "kk": "Болгардың ислам медреселерінің бірінде жасалған безендірілген Құран парағын зерттеңіз."},
           "hard", "culture"),
    # Crimea
    _quest("crimea",
           {"en": "Kaffa's Genoese Quarter", "ru": "Генуэзский квартал Каффы", "kk": "Каффаның генуялық алабы"},
           {"en": "Explore the Genoese trading colony of Kaffa and its relationship with the Golden Horde's Crimean province.",
            "ru": "Исследуйте генуэзскую торговую колонию Каффу и её отношения с крымской провинцией Золотой Орды.",
            "kk": "Генуялық сауда отары Каффаны және оның Алтын Орданың Қырым облысымен қарым-қатынасын зерттеңіз."},
           "medium", "exploration"),
    _quest("crimea",
           {"en": "Mosque of Sultan Uzbek", "ru": "Мечеть Султана Узбека", "kk": "Сұлтан Өзбек мешіті"},
           {"en": "Study the architecture of the 1314 Mosque of Sultan Uzbek, one of Crimea's oldest Islamic monuments.",
            "ru": "Изучите архитектуру мечети Султана Узбека 1314 года — одного из старейших исламских памятников Крыма.",
            "kk": "Қырымдағы ең көне ислам ескерткіштерінің бірі болған 1314 жылғы Сұлтан Өзбек мешітінің сәулетін зерттеңіз."},
           "easy", "culture"),
    _quest("crimea",
           {"en": "Black Sea Alliance", "ru": "Черноморский союз", "kk": "Қара теңіз одағы"},
           {"en": "Investigate the diplomatic alliance between the Golden Horde and Mamluk Egypt against the Ilkhanate.",
            "ru": "Исследуйте дипломатический союз между Золотой Ордой и мамлюкским Египтом против Ильханата.",
            "kk": "Алтын Орда мен мәмлүк Мысыры арасындағы Ильханатқа қарсы дипломатиялық одақты зерттеңіз."},
           "hard", "diplomacy"),
    _quest("crimea",
           {"en": "Portolan Chart Reading", "ru": "Чтение портоланной карты", "kk": "Портолан картасын оқу"},
           {"en": "Read a Genoese portolan chart to plot the sea route between Kaffa and Constantinople.",
            "ru": "Прочитайте генуэзскую портоланную карту, чтобы проложить морской путь между Каффой и Константинополем.",
            "kk": "Каффа мен Константинополь арасындағы теңіз жолын белгілеу үшін генуялық портолан картасын оқыңыз."},
           "medium", "knowledge"),
    _quest("crimea",
           {"en": "From Province to Khanate", "ru": "От провинции к ханству", "kk": "Облыстан хандыққа"},
           {"en": "Trace how the Crimean province gave its name to the later independent Crimean Khanate.",
            "ru": "Проследите, как крымская провинция дала своё имя позднейшему независимому Крымскому ханству.",
            "kk": "Қырым облысының кейінгі тәуелсіз Қырым хандығына атын қалай бергенін бақылаңыз."},
           "hard", "knowledge"),
    _quest("crimea",
           {"en": "Customs of the Port", "ru": "Портовая таможня", "kk": "Порт кедені"},
           {"en": "Calculate the customs revenue the khan's officials would collect from a shipment of silk passing through Kaffa.",
            "ru": "Рассчитайте таможенный доход, который чиновники хана получали бы от партии шёлка, проходящей через Каффу.",
            "kk": "Каффа арқылы өтетін жібек жүктемесінен хан шенеуніктері алатын кеден кірісін есептеңіз."},
           "medium", "trade"),
    _quest("crimea",
           {"en": "Multi-Faith Crimea", "ru": "Многоконфессиональный Крым", "kk": "Көп конфессиялы Қырым"},
           {"en": "Explore the multi-confessional community of Mongols, Armenians, Greeks, and Italians who shared the province.",
            "ru": "Исследуйте многоконфессиональное сообщество монголов, армян, греков и итальянцев, живших в этой провинции.",
            "kk": "Осы облысты бөлісіп өмір сүрген моңғолдар, армяндар, гректер мен итальяндардың көп конфессиялы қауымдастығын зерттеңіз."},
           "easy", "exploration"),
]

# ─────────────────────────────────────────────────────────────────────────────
# Achievement definitions — 4 tiers x 8 metrics = 32, entirely admin-editable
# ─────────────────────────────────────────────────────────────────────────────

_TIER_LABELS = {
    "en": ["Bronze", "Silver", "Gold", "Platinum"],
    "ru": ["Бронзовый", "Серебряный", "Золотой", "Платиновый"],
    "kk": ["Қола", "Күміс", "Алтын", "Платина"],
}
_TIER_REWARD_SCALE = [1, 2, 4, 8]  # multiplies the metric's base reward per tier

# noun (title-case, used after the tier label) + a description template taking {threshold}
_ACHIEVEMENT_COPY: dict[AchievementMetric, dict] = {
    AchievementMetric.XP: {
        "noun": {"en": "Experience Milestone", "ru": "рубеж опыта", "kk": "тәжірибе межесі"},
        "desc": {
            "en": "Reach {threshold} experience milestone to earn this badge.",
            "ru": "Наберите {threshold} очков опыта (XP), чтобы получить этот значок.",
            "kk": "Осы төсбелгіні алу үшін {threshold} тәжірибе ұпайына (XP) жетіңіз.",
        },
    },
    AchievementMetric.COINS: {
        "noun": {"en": "Coin Hoard", "ru": "клад монет", "kk": "монета қоры"},
        "desc": {
            "en": "Reach {threshold} coin hoard to earn this badge.",
            "ru": "Накопите {threshold} монет, чтобы получить этот значок.",
            "kk": "Осы төсбелгіні алу үшін {threshold} монета жинаңыз.",
        },
    },
    AchievementMetric.LEVEL: {
        "noun": {"en": "Rank", "ru": "ранг", "kk": "дәреже"},
        "desc": {
            "en": "Reach level {threshold} to earn this badge.",
            "ru": "Достигните {threshold} уровня, чтобы получить этот значок.",
            "kk": "Осы төсбелгіні алу үшін {threshold}-деңгейге жетіңіз.",
        },
    },
    AchievementMetric.STREAK_DAYS: {
        "noun": {"en": "Steppe Streak", "ru": "степная серия", "kk": "дала сериясы"},
        "desc": {
            "en": "Log in {threshold} days in a row to earn this badge.",
            "ru": "Заходите {threshold} дней подряд, чтобы получить этот значок.",
            "kk": "Осы төсбелгіні алу үшін {threshold} күн қатарынан кіріңіз.",
        },
    },
    AchievementMetric.QUESTS_COMPLETED: {
        "noun": {"en": "Quests Completed", "ru": "выполненные задания", "kk": "орындалған тапсырмалар"},
        "desc": {
            "en": "Complete {threshold} quests to earn this badge.",
            "ru": "Выполните {threshold} заданий, чтобы получить этот значок.",
            "kk": "Осы төсбелгіні алу үшін {threshold} тапсырманы орындаңыз.",
        },
    },
    AchievementMetric.CITIES_VISITED: {
        "noun": {"en": "Cities Explored", "ru": "исследованные города", "kk": "зерттелген қалалар"},
        "desc": {
            "en": "Explore {threshold} cities to earn this badge.",
            "ru": "Исследуйте {threshold} городов, чтобы получить этот значок.",
            "kk": "Осы төсбелгіні алу үшін {threshold} қаланы зерттеңіз.",
        },
    },
    AchievementMetric.ARTIFACTS_COLLECTED: {
        "noun": {"en": "Artifacts Collected", "ru": "собранные артефакты", "kk": "жиналған артефактілер"},
        "desc": {
            "en": "Collect {threshold} artifacts to earn this badge.",
            "ru": "Соберите {threshold} артефактов, чтобы получить этот значок.",
            "kk": "Осы төсбелгіні алу үшін {threshold} артефакт жинаңыз.",
        },
    },
    AchievementMetric.CERTIFICATES_ISSUED: {
        "noun": {"en": "Certificates Earned", "ru": "полученные сертификаты", "kk": "алынған сертификаттар"},
        "desc": {
            "en": "Earn {threshold} certificates to earn this badge.",
            "ru": "Получите {threshold} сертификатов, чтобы получить этот значок.",
            "kk": "Осы төсбелгіні алу үшін {threshold} сертификат алыңыз.",
        },
    },
}


def _achievement_tiers(
    metric: AchievementMetric,
    thresholds: list[int],
    base_xp: int,
    base_coins: int,
    icon: str,
    sort_start: int,
) -> list[dict]:
    copy = _ACHIEVEMENT_COPY[metric]
    tiers = []
    for i, threshold in enumerate(thresholds):
        scale = _TIER_REWARD_SCALE[i]
        entry = {
            "key": f"{metric.value}_{_TIER_LABELS['en'][i].lower()}",
            "icon_url": icon,
            "metric": metric,
            "threshold": threshold,
            "reward_xp": base_xp * scale,
            "reward_coins": base_coins * scale,
            "sort_order": sort_start + i,
        }
        for lang in ("kk", "ru", "en"):
            tier_label = _TIER_LABELS[lang][i]
            noun = copy["noun"][lang]
            entry[f"title_{lang}"] = f"{tier_label} {noun}"
            # kk/ru use a space as the thousands separator; English keeps the comma.
            threshold_str = f"{threshold:,}" if lang == "en" else f"{threshold:,}".replace(",", " ")
            entry[f"description_{lang}"] = copy["desc"][lang].format(threshold=threshold_str)
        tiers.append(entry)
    return tiers


ACHIEVEMENT_DEFINITIONS = [
    *_achievement_tiers(AchievementMetric.XP, [200, 1000, 3000, 8000], 50, 10, "⚜", 0),
    *_achievement_tiers(AchievementMetric.COINS, [100, 500, 1500, 4000], 40, 20, "🪙", 10),
    *_achievement_tiers(AchievementMetric.LEVEL, [3, 6, 10, 15], 80, 25, "👑", 20),
    *_achievement_tiers(AchievementMetric.STREAK_DAYS, [3, 7, 14, 30], 60, 15, "🔥", 30),
    *_achievement_tiers(AchievementMetric.QUESTS_COMPLETED, [3, 10, 25, 50], 100, 20, "⚡", 40),
    *_achievement_tiers(AchievementMetric.CITIES_VISITED, [1, 3, 5, 6], 120, 30, "🗺", 50),
    *_achievement_tiers(AchievementMetric.ARTIFACTS_COLLECTED, [3, 10, 20, 30], 90, 25, "🏺", 60),
    *_achievement_tiers(AchievementMetric.CERTIFICATES_ISSUED, [1, 2, 3, 5], 150, 40, "📜", 70),
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
HOMEPAGE_STATS_LABEL = {
    "en": "Years of History",
    "ru": "Лет истории",
    "kk": "Тарих жылдары",
}


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
            name_kk=data["name_kk"], name_ru=data["name_ru"], name_en=data["name_en"],
            description_kk=data["description_kk"], description_ru=data["description_ru"], description_en=data["description_en"],
            era_kk=data["era_kk"], era_ru=data["era_ru"], era_en=data["era_en"],
            rarity=data["rarity"],
            historical_context_kk=data["historical_context_kk"],
            historical_context_ru=data["historical_context_ru"],
            historical_context_en=data["historical_context_en"],
            image_url=placeholder_image(data["name_en"], bg="1A1C14", fg="D4AF37", size="600x600"),
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
                f"{data['name_en']} - {slot['en'][0]}", bg="0E1018", fg="B7BAC3", size="900x600"
            )
            for code, language in LANGUAGE_BY_CODE.items():
                title, alt_text = slot[code]
                session.add(
                    GalleryImage(
                        title=f"{data[f'name_{code}']} — {title}",
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
            title_kk=data["title_kk"], title_ru=data["title_ru"], title_en=data["title_en"],
            description_kk=data["description_kk"], description_ru=data["description_ru"], description_en=data["description_en"],
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
                body=HOMEPAGE_STATS_LABEL[code],
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
    await redis.delete(*CITIES_CACHE_KEYS)
    logger.info("Flushed cities cache keys %r.", CITIES_CACHE_KEYS)

    await close_redis()
    await dispose_engine()
    logger.info("Seed complete.")


if __name__ == "__main__":
    asyncio.run(main())
