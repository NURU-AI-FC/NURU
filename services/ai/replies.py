"""Intent detection, charts, suggested actions and template answers.

Templates quote only numbers from the snapshot, so they double as the safe
fallback when the model is unavailable or its figures do not check out.
Translations are reviewed by the language owners listed in docs/TEAM.md.
"""

import re

INTENTS = [
    ("injectionless_greeting", r"^\s*(hi|hello|hey|good (morning|afternoon|evening)|bawo|ndewo|sannu|kedu)\b"),
    ("business", r"business|sales|profit|payroll|staff|salar(y|ies) for|runway|kemi|vendor|advert|investor"),
    ("loan", r"loan|debt|repay|interest|gbèsè|gbese|ụgwọ|ugwo|bashi"),
    ("subscriptions", r"subscription|netflix|dstv|spotify|showmax|recurring"),
    ("upcoming", r"upcoming|due|reminder|bill(s)? (this|next)|what do i owe"),
    ("forecast", r"forecast|end of (the )?month|will i (have|run)|next 30|predict|enough (money|cash)"),
    ("compare", r"compare|last (3|three) months|trend|versus|vs\.?|than last"),
    ("save", r"save|saving|afford|goal|cut|reduce|fipamọ́|ifowopamo|chekwaa|ajiya"),
    ("invest", r"invest|treasury|stock|pension|mutual fund"),
    ("week", r"this week|weekly|ọ̀sẹ̀|izu|mako"),
    ("balance", r"balance|how much (do i have|is in)|my accounts?|total money"),
    ("spend", r"spen[dt]|where did|expens|ná|inawo|mmefu|kashe|chop"),
]


def intent(message: str) -> str:
    text = message.lower()
    for name, pattern in INTENTS:
        if re.search(pattern, text):
            return "greeting" if name == "injectionless_greeting" else name
    return "general"


def naira(v) -> str:
    try:
        return "₦{:,.0f}".format(float(v))
    except (TypeError, ValueError):
        return "₦0"


def chart(name: str, ctx: dict):
    month = ctx.get("this_month") or {}
    if name in ("spend", "save", "general") and month.get("by_category"):
        cats = month["by_category"][:6]
        return {"type": "donut", "title": "This month by category",
                "labels": [c["category"] for c in cats], "series": [{"name": "Spent", "values": [c["amount"] for c in cats]}]}
    if name == "week" and (ctx.get("this_week") or {}).get("by_category"):
        cats = ctx["this_week"]["by_category"][:6]
        return {"type": "bar", "title": "This week by category",
                "labels": [c["category"] for c in cats], "series": [{"name": "Spent", "values": [c["amount"] for c in cats]}]}
    if name == "compare" and ctx.get("three_months"):
        months = ctx["three_months"]
        return {"type": "bar", "title": "Weekly spending, last 3 months", "labels": ["Week 1", "Week 2", "Week 3", "Week 4"],
                "series": [{"name": m["month"], "values": m["weeks"]} for m in months]}
    if name == "forecast" and (ctx.get("forecast_30_days") or {}).get("points"):
        pts = ctx["forecast_30_days"]["points"]
        return {"type": "line", "title": "Balance, next 30 days", "labels": [p["label"] for p in pts],
                "series": [{"name": "Balance", "values": [p["balance"] for p in pts]}]}
    return None


def actions(name: str, ctx: dict) -> list[dict]:
    out = []
    if name in ("save", "spend", "compare"):
        out.append({"kind": "save", "label": "Move ₦20,000 to savings", "amount": 20000})
    if name == "subscriptions":
        out.append({"kind": "open", "label": "Review subscriptions", "to": "/insights"})
    if name in ("upcoming", "loan"):
        out.append({"kind": "open", "label": "See reminders", "to": "/planner"})
    if name == "business":
        out.append({"kind": "open", "label": "Open business tools", "to": "/business"})
    return out


T = {
    "off_topic": {
        "en": "I can only help with your money: spending, savings, bills, loans, investments and your business. Try asking where your money went this month.",
        "yo": "Ọ̀rọ̀ owó nìkan ni mo lè bá ọ sọ: ìnáwó, ìfowópamọ́, owó-iná, gbèsè, ìdókòwò àti iṣẹ́ rẹ. Bi mí pé ibo ni owó rẹ lọ lóṣù yìí.",
        "ig": "Naanị ihe gbasara ego gị ka m nwere ike inyere gị aka: mmefu, nchekwa, ụgwọ, mbinye ego, itinye ego na azụmahịa gị. Jụọ m ebe ego gị gara n'ọnwa a.",
        "ha": "Zan iya taimaka maka da kuɗinka kawai: kashe kuɗi, ajiya, kuɗin wuta, bashi, saka hannun jari da kasuwancinka. Tambaye ni ina kuɗinka ya tafi a wannan wata.",
    },
    "injection": {
        "en": "I can't do that. I only answer questions about your own finances, and my instructions stay private. What would you like to know about your money?",
        "yo": "Mi ò lè ṣe bẹ́ẹ̀. Ìbéèrè nípa owó tìrẹ nìkan ni mo ń dáhùn, àwọn ìlànà mi sì jẹ́ àṣírí. Kí lo fẹ́ mọ̀ nípa owó rẹ?",
        "ig": "Enweghị m ike ime nke ahụ. Naanị ajụjụ gbasara ego gị ka m na-aza, ntuziaka m bụkwa nzuzo. Gịnị ka ị chọrọ ịma maka ego gị?",
        "ha": "Ba zan iya yin hakan ba. Tambayoyi game da kuɗinka kawai nake amsawa, kuma umarnina sirri ne. Me kake so ka sani game da kuɗinka?",
    },
    "greeting": {
        "en": "Hi {name}. Ask me where your money went, what is due soon, or how much you can save this month.",
        "yo": "Ẹ n lẹ́ o {name}. Bi mí pé ibo ni owó rẹ lọ, kí ló kù sí dé, tàbí iye tí o lè fipamọ́ lóṣù yìí.",
        "ig": "Ndewo {name}. Jụọ m ebe ego gị gara, ihe ga-eru n'oge na-adịghị anya, ma ọ bụ ego ole ị nwere ike ichekwa n'ọnwa a.",
        "ha": "Sannu {name}. Tambaye ni ina kuɗinka ya tafi, me ke zuwa nan ba da daɗewa ba, ko nawa za ka iya ajiyewa a wannan wata.",
    },
    "spend": {
        "en": "You have spent {out} so far this month. The biggest category is {top} at {top_amt}. By this point last month you had spent {prev}.",
        "yo": "O ti ná {out} lóṣù yìí. {top} ló gbà jù, {top_amt}. Ní àkókò yìí lóṣù tó kọjá, o ti ná {prev}.",
        "ig": "Ị mefuola {out} n'ọnwa a. {top} bụ nke kachasị, {top_amt}. N'oge a n'ọnwa gara aga, ị mefuru {prev}.",
        "ha": "Ka kashe {out} a wannan wata. {top} ne mafi yawa, {top_amt}. A wannan lokaci a watan da ya wuce, ka kashe {prev}.",
    },
    "week": {
        "en": "This week you have spent {wout} and received {win}. Most of it went on {wtop}.",
        "yo": "Ọ̀sẹ̀ yìí o ti ná {wout}, o sì gba {win}. {wtop} ló gbà jù.",
        "ig": "N'izu a ị mefuola {wout} ma nata {win}. Ọtụtụ ya gara na {wtop}.",
        "ha": "A wannan mako ka kashe {wout}, ka karɓi {win}. Mafi yawa ya tafi kan {wtop}.",
    },
    "balance": {
        "en": "You have {total} across {n} accounts. {accts}.",
        "yo": "O ní {total} nínú àkáǹtì {n}. {accts}.",
        "ig": "Ị nwere {total} n'akaụntụ {n}. {accts}.",
        "ha": "Kana da {total} a asusu {n}. {accts}.",
    },
    "compare": {
        "en": "{m1}: {t1}, {m2}: {t2}, and {m3} so far: {t3}. Your heaviest week in the last three months cost {peak}.",
        "yo": "{m1}: {t1}, {m2}: {t2}, {m3} títí di báyìí: {t3}. Ọ̀sẹ̀ tí o ná jù ní oṣù mẹ́ta sẹ́yìn jẹ́ {peak}.",
        "ig": "{m1}: {t1}, {m2}: {t2}, {m3} ruo ugbu a: {t3}. Izu i mefuru nke kachasị n'ọnwa atọ gara aga bụ {peak}.",
        "ha": "{m1}: {t1}, {m2}: {t2}, {m3} zuwa yanzu: {t3}. Makon da ka fi kashewa a watanni uku da suka wuce shi ne {peak}.",
    },
    "forecast": {
        "en": "At about {daily} a day, your balance should be near {end} in 30 days. The lowest point is about {low}, just before your next salary.",
        "yo": "Bí o bá ń ná nǹkan bí {daily} lójoojúmọ́, owó rẹ yóò tó {end} ní ọgbọ̀n ọjọ́. Ibi tó kéré jù ni {low}, kí owó-oṣù tó dé.",
        "ig": "Ọ bụrụ na ị na-emefu ihe dị ka {daily} kwa ụbọchị, ego gị ga-adị ihe dị ka {end} n'ụbọchị 30. Ebe kachasị ala bụ {low}, tupu ụgwọ ọnwa gị abịa.",
        "ha": "Idan kana kashe kusan {daily} a rana, kuɗinka zai kai kusan {end} cikin kwanaki 30. Mafi ƙasƙanci shi ne {low}, kafin albashinka ya zo.",
    },
    "save": {
        "en": "{tip} Moving ₦20,000 to savings each month keeps you on track without touching bills.",
        "yo": "{tip} Fífi ₦20,000 pamọ́ lóṣooṣù yóò jẹ́ kí o wà lójú ọ̀nà láì fọwọ́ kan owó-iná.",
        "ig": "{tip} Itinye ₦20,000 na nchekwa kwa ọnwa ga-eme ka ị nọrọ n'ụzọ n'emetụghị ụgwọ gị aka.",
        "ha": "{tip} Ajiye ₦20,000 kowane wata zai sa ka ci gaba ba tare da taɓa kuɗin biyan bukatu ba.",
    },
    "subscriptions": {
        "en": "{subs}",
        "yo": "{subs}",
        "ig": "{subs}",
        "ha": "{subs}",
    },
    "loan": {
        "en": "Your {lender} has {bal} left. You pay {monthly} a month at {rate}% and the next payment is due {due}.",
        "yo": "Gbèsè {lender} rẹ ṣẹ́ kù {bal}. O ń san {monthly} lóṣooṣù ní {rate}%, ìsanwó tó kàn yóò jẹ́ {due}.",
        "ig": "Mbinye ego {lender} gị fọdụrụ {bal}. Ị na-akwụ {monthly} kwa ọnwa na {rate}%, ịkwụ ụgwọ ọzọ bụ {due}.",
        "ha": "Bashin {lender} naka ya rage {bal}. Kana biyan {monthly} kowane wata a {rate}%, biya na gaba a {due}.",
    },
    "no_loan": {
        "en": "You have no active loans. Good place to be.",
        "yo": "O ò ní gbèsè kankan lọ́wọ́. Ó dára bẹ́ẹ̀.",
        "ig": "Ị nweghị mbinye ego ọ bụla ugbu a. Nke ahụ dị mma.",
        "ha": "Ba ka da wani bashi a yanzu. Wannan yana da kyau.",
    },
    "upcoming": {
        "en": "Coming up: {items}.",
        "yo": "Ohun tó ń bọ̀: {items}.",
        "ig": "Ihe na-abịa: {items}.",
        "ha": "Abubuwan da ke zuwa: {items}.",
    },
    "business": {
        "en": "{biz} took in {bin} and spent {bout} this month on the business account. Open Business for payroll, tax and runway.",
        "yo": "{biz} gba {bin}, ó sì ná {bout} lóṣù yìí. Ṣí Business fún owó-oṣù òṣìṣẹ́, owó-orí àti ìgbà tí owó yóò fi tó.",
        "ig": "{biz} nwetara {bin} ma mefuo {bout} n'ọnwa a. Mepee Business maka ụgwọ ndị ọrụ, ụtụ isi na oge ego ga-adị.",
        "ha": "{biz} ta samu {bin} ta kashe {bout} a wannan wata. Buɗe Business don albashi, haraji da tsawon lokacin kuɗi.",
    },
    "invest": {
        "en": "I can show how your investments are growing on the Loans and savings page. For a big investment decision, a Zenith relationship manager can advise you properly.",
        "yo": "Mo lè fi bí ìdókòwò rẹ ṣe ń dàgbà hàn ọ́ ní ojú-ìwé Loans and savings. Fún ìpinnu ńlá, bá olùtọ́jú Zenith sọ̀rọ̀.",
        "ig": "Enwere m ike igosi otu itinye ego gị si eto na peeji Loans and savings. Maka mkpebi buru ibu, kpọtụrụ onye njikwa Zenith.",
        "ha": "Zan iya nuna yadda jarinka ke girma a shafin Loans and savings. Don babban yanke shawara, ka tuntuɓi manajan Zenith.",
    },
}


def refusal(kind: str, lang: str) -> str:
    return T[kind].get(lang, T[kind]["en"])


def template(name: str, ctx: dict, lang: str) -> str:
    month = ctx.get("this_month") or {}
    week = ctx.get("this_week") or {}
    cats = month.get("by_category") or []
    wcats = week.get("by_category") or []
    v = {
        "name": ctx.get("first_name") or "",
        "out": naira(month.get("out")), "prev": naira(month.get("last_month_same_days_out")),
        "top": cats[0]["category"] if cats else "-", "top_amt": naira(cats[0]["amount"]) if cats else "₦0",
        "wout": naira(week.get("out")), "win": naira(week.get("in")), "wtop": wcats[0]["category"] if wcats else "-",
    }

    if name == "balance":
        accts = ctx.get("accounts") or []
        v.update(total=naira(sum(a["balance"] for a in accts)), n=len(accts),
                 accts=", ".join(f"{a['name']} {naira(a['balance'])}" for a in accts))
    elif name == "compare":
        m = (ctx.get("three_months") or [])[-3:]
        if len(m) < 3:
            name = "spend"
        else:
            v.update(m1=m[0]["month"], t1=naira(m[0]["total"]), m2=m[1]["month"], t2=naira(m[1]["total"]),
                     m3=m[2]["month"], t3=naira(m[2]["total"]), peak=naira(max(w for x in m for w in x["weeks"])))
    elif name == "forecast":
        f = ctx.get("forecast_30_days") or {}
        v.update(daily=naira(f.get("daily_spend")), end=naira(f.get("end")), low=naira(f.get("lowest")))
    elif name == "save":
        over = [i for i in ctx.get("insights") or [] if i.get("kind") == "over"]
        v["tip"] = over[0]["body"] if over else template("spend", ctx, "en")
        if lang != "en":
            v["tip"] = template("spend", ctx, lang)
    elif name == "subscriptions":
        subs = [i for i in ctx.get("insights") or [] if i.get("kind") == "subscriptions"]
        if not subs:
            return template("spend", ctx, lang)
        v["subs"] = subs[0]["body"]
    elif name == "loan":
        loans = ctx.get("loans") or []
        if not loans:
            name = "no_loan"
        else:
            l = loans[0]
            v.update(lender=l["lender"], bal=naira(l["balance"]), monthly=naira(l["monthly"]), rate=f"{l['rate_pct']:g}", due=l["next_due"])
    elif name == "upcoming":
        up = ctx.get("upcoming") or []
        v["items"] = "; ".join(f"{u['title']} {naira(u['amount'])} on {u['due']}" for u in up[:4]) or "-"
    elif name == "business":
        if not ctx.get("business"):
            name = "spend"
        else:
            b = ctx.get("business_month") or {}
            v.update(biz=ctx["business"], bin=naira(b.get("in")), bout=naira(b.get("out")))
    elif name in ("general",):
        name = "spend"

    text = T[name].get(lang, T[name]["en"])
    return text.format(**v)
