"""Intent detection, charts, suggested actions and template answers.

Templates quote only numbers from the snapshot, so they double as the safe
fallback when the model is unavailable or its figures do not check out.
Translations are reviewed by the language owners listed in docs/TEAM.md.
"""

import re

from lang import LANGS

INTENTS = [
    ("transfer", r"(?=.*(\b(send|transfer|pay|give|ziga|zipu|kwụọ|kwuo|aika|tura|biya)\b|ránṣẹ́|ranse|sanwó))(?=.*(₦|\d+\s?k\b|\d{3,}))"),
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


AMT = re.compile(r"(?:₦|\bn)?\s?(\d[\d,]*(?:\.\d+)?)\s?(k|m|thousand|million)?\b", re.I)


def parse_transfer(message: str, ctx: dict) -> dict:
    """Pull the amount and payee out of "send ₦25,000 to Tunde for rent".
    Only payees already saved in the app can be matched, so the model or a
    crafted message can never introduce a new account number."""
    amount = 0.0
    for num, unit in AMT.findall(message):
        v = float(num.replace(",", ""))
        v *= {"k": 1e3, "thousand": 1e3, "m": 1e6, "million": 1e6}.get(unit.lower(), 1)
        if v >= 100:
            amount = v
            break
    text = message.lower()
    payee = ""
    for p in ctx.get("payees") or []:
        words = [w for w in re.split(r"[\s,]+", p.lower()) if len(w) > 2]
        if p.lower() in text or any(re.search(r"\b" + re.escape(w) + r"\b", text) for w in words):
            payee = p
            break
    note = ""
    m = re.search(r"\bfor (.+)$", message, re.I)
    if m:
        note = m.group(1).strip(" .")[:60]
    return {"payee": payee, "amount": amount, "note": note}


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


def actions(name: str, ctx: dict, message: str = "") -> list[dict]:
    out = []
    if name == "transfer":
        t = parse_transfer(message, ctx)
        if t["payee"] and t["amount"]:
            return [{"kind": "transfer", "label": "Confirm and send", **t}]
        return [{"kind": "open", "label": "Add a new payee", "to": "/pay"}]
    if name in ("save", "spend", "compare"):
        out.append({"kind": "save", "label": "Move ₦20,000 to savings", "amount": 20000})
    if name == "subscriptions":
        out.append({"kind": "open", "label": "Review subscriptions", "to": "/insights"})
    if name in ("upcoming", "loan"):
        out.append({"kind": "open", "label": "See reminders", "to": "/planner"})
    if name == "business":
        out.append({"kind": "open", "label": "Open business tools", "to": "/business"})
    return out


# Templates live in lang/<code>.py, one file per language.
T = {name: {code: d[name] for code, d in LANGS.items() if name in d} for name in LANGS["en"]}


def refusal(kind: str, lang: str) -> str:
    return T[kind].get(lang, T[kind]["en"])


def template(name: str, ctx: dict, lang: str, message: str = "") -> str:
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

    if name == "transfer":
        t = parse_transfer(message, ctx)
        if not (t["payee"] and t["amount"]):
            v["list"] = ", ".join(ctx.get("payees") or []) or "-"
            name = "no_payee"
        else:
            personal = sum(a["balance"] for a in ctx.get("accounts") or [] if "Ltd" not in a["name"])
            v.update(amt=naira(t["amount"]), payee=t["payee"], left=naira(personal - t["amount"]))
    elif name == "balance":
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
