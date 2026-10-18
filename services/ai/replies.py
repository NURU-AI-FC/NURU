"""Intent detection, charts, suggested actions and template answers.

Templates quote only numbers from the snapshot, so they double as the safe
fallback when the model is unavailable or its figures do not check out.
Translations are reviewed by the language owners listed in docs/TEAM.md.
"""

import re
from datetime import date, timedelta

from lang import LANGS

INTENTS = [
    ("reminder", r"\bremind( me)?\b|\bset (a |up a )?reminder\b|\bdon'?t let me forget\b"),
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


MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


def parse_date(text: str, today: date) -> date | None:
    """Read "on 20 Oct", "October 20th", "the 28th", "tomorrow", "next
    Friday" or "in 3 days". Dates already past roll into the next period."""
    t = text.lower()
    if "tomorrow" in t:
        return today + timedelta(days=1)
    if re.search(r"\btoday\b|\btonight\b", t):
        return today
    m = re.search(r"\bin (\d{1,2}) (day|week)s?\b", t)
    if m:
        return today + timedelta(days=int(m.group(1)) * (7 if m.group(2) == "week" else 1))
    mon = r"(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*"
    m = re.search(r"\b(\d{1,2})(?:st|nd|rd|th)?(?: of)? " + mon + r"\b", t) or re.search(r"\b" + mon + r" (\d{1,2})(?:st|nd|rd|th)?\b", t)
    if m:
        a, b = m.groups()
        day, month = (int(a), MONTHS.index(b[:3]) + 1) if a.isdigit() else (int(b), MONTHS.index(a[:3]) + 1)
        try:
            d = date(today.year, month, day)
        except ValueError:
            return None
        return d if d >= today else d.replace(year=today.year + 1)
    for i, name in enumerate(DAYS):
        if re.search(r"\b" + name[:3] + r"(" + name[3:] + r")?\b", t):
            ahead = (i - today.weekday()) % 7 or 7
            return today + timedelta(days=ahead)
    m = re.search(r"\b(?:on )?the (\d{1,2})(?:st|nd|rd|th)\b", t)
    if m:
        day = int(m.group(1))
        y, mo = today.year, today.month
        if day < today.day:
            y, mo = (y + 1, 1) if mo == 12 else (y, mo + 1)
        try:
            return date(y, mo, day)
        except ValueError:
            return None
    return None


def parse_reminder(message: str, ctx: dict, today: date | None = None) -> dict:
    """Pull a title, amount and date out of "remind me to pay DStv ₦25,000
    on 20 Oct". Without a date it suggests three days from today."""
    today = today or date.today()
    amount = 0.0
    for num, unit in AMT.findall(message):
        v = float(num.replace(",", ""))
        v *= {"k": 1e3, "thousand": 1e3, "m": 1e6, "million": 1e6}.get(unit.lower(), 1)
        if v >= 100:
            amount = v
            break
    title = re.sub(r"^.*?\bremind(?: me)?\b\s*(?:to |about |of )?", "", message, flags=re.I)
    title = re.sub(r"^.*?\bset (?:a |up a )?reminder\b\s*(?:to |for |about )?", "", title, flags=re.I)
    title = re.sub(r"(₦|\bn)\s?\d[\d,]*(\.\d+)?\s?(k|m|thousand|million)?\b", "", title, flags=re.I)
    before = re.match(r"\s*(\d{1,2}|a|one|two|three) (day|week)s? before (.+)$", title, re.I)
    if before:
        title = before.group(3)
    title = re.sub(r"\b(on|by|next|this|tomorrow|today|tonight|in \d+ \w+)\b.*$", "", title, flags=re.I)
    title = re.sub(r"^(pay|my|the)\s+", "", re.sub(r"\s+", " ", title).strip(" .,"), flags=re.I)
    title = re.sub(r"^(my|the)\s+", "", title, flags=re.I)
    title = (title[:1].upper() + title[1:])[:60] or "Payment reminder"
    due = parse_date(message, today)
    match = None
    for u in ctx.get("upcoming") or []:
        if any(w in u.get("title", "").lower() for w in title.lower().split() if len(w) > 3):
            match = u
            break
    if match and not amount:
        amount = float(match.get("amount") or 0)
    if before and match and not due:
        lead = {"a": 1, "one": 1, "two": 2, "three": 3}.get(before.group(1).lower()) or int(before.group(1))
        lead *= 7 if before.group(2).lower() == "week" else 1
        found = parse_date("on " + str(match.get("due", "")), today)
        if found:
            due = max(today, found - timedelta(days=lead))
    due = due or today + timedelta(days=3)
    return {"title": title, "amount": amount, "due": due.isoformat()}


def sources(name: str, ctx: dict) -> list[dict]:
    """The parts of the snapshot an answer drew on, shown under the reply."""
    month = date.today().strftime("%B")
    accts = ctx.get("accounts") or []
    names = ", ".join(f"{a['name']} {a.get('number', '')}".strip() for a in accts[:3])
    acc = {"type": "accounts", "label": "Accounts", "detail": names} if names else None
    tx = {"type": "transactions", "label": "Transactions", "detail": f"{month} transactions"}
    out: list[dict | None] = []
    if name in ("spend", "save", "general", "subscriptions"):
        out = [tx, acc]
    elif name == "week":
        out = [{"type": "transactions", "label": "Transactions", "detail": "This week's transactions"}, acc]
    elif name == "balance":
        out = [acc]
    elif name == "compare":
        out = [{"type": "transactions", "label": "Transactions", "detail": "Last 3 months of transactions"}]
    elif name == "forecast":
        out = [acc, {"type": "forecast", "label": "Forecast", "detail": "Daily spending and bills, next 30 days"}]
    elif name in ("loan",):
        loans = ctx.get("loans") or []
        out = [{"type": "loans", "label": "Loans", "detail": ", ".join(l["lender"] for l in loans) or "No active loans"}]
    elif name in ("upcoming", "reminder"):
        out = [{"type": "bills", "label": "Bills and reminders", "detail": f"{len(ctx.get('upcoming') or [])} upcoming"}]
    elif name == "business" and ctx.get("business"):
        out = [{"type": "business", "label": "Business", "detail": f"{ctx['business']}, {month} business account"}]
    elif name == "transfer":
        out = [{"type": "payees", "label": "Payees", "detail": "Saved payees"}, acc]
    return [s for s in out if s]


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
    if name == "reminder":
        return [{"kind": "reminder", "label": "Set reminder", **parse_reminder(message, ctx)}]
    if name == "transfer":
        t = parse_transfer(message, ctx)
        if t["payee"] and t["amount"]:
            return [{"kind": "transfer", "label": "Confirm and send", **t}]
        # Someone new: the app collects the bank and account number in the chat.
        return [{"kind": "transfer", "label": "Send to someone new", **t, "new": True}]
    if name in ("save", "spend", "compare"):
        out.append({"kind": "save", "label": "Move ₦20,000 to savings", "amount": 20000})
    if name == "subscriptions":
        out.append({"kind": "open", "label": "Review subscriptions", "to": "/insights"})
    if name in ("upcoming", "loan"):
        out.append({"kind": "open", "label": "See reminders", "to": "/planner"})
    if name == "business":
        out.append({"kind": "open", "label": "Open business tools", "to": "/business"})
    if name in OFFER:
        out.insert(0, {"kind": "offer", "label": "Yes, send it for me", "amount": offer_amount(name, ctx)})
    return out


# After advice that ends in moving money, NURU offers to send it. Nothing moves
# until the customer fills in the details and passes the PIN and face check.
OFFER = ("save", "upcoming", "loan", "business", "forecast")


def offer_amount(name: str, ctx: dict) -> float:
    if name == "upcoming":
        due = [u for u in ctx.get("upcoming") or [] if u.get("amount")]
        return float(due[0]["amount"]) if due else 0
    if name == "loan":
        loans = ctx.get("loans") or []
        return float(loans[0]["monthly"]) if loans else 0
    if name == "save":
        return 20000
    return 0


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
    elif name == "reminder":
        r = parse_reminder(message, ctx)
        d = date.fromisoformat(r["due"])
        v.update(title=r["title"], amt=f" ({naira(r['amount'])})" if r["amount"] else "", date=f"{d.day} {d.strftime('%b')}")
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
