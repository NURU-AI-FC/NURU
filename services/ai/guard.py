"""Input and output checks that run around every model call.

NURU only talks about the customer's money. Anything else is politely
declined, and attempts to rewrite NURU's instructions are refused and logged
by the API as security events.
"""

import re
import unicodedata

# Phrases people use to hijack an assistant. Matched on a normalised copy of
# the message so tricks like full-width letters or zero-width spaces fail.
INJECTION = [
    r"ignore (all |any |the |your |my )?(of )?(your |the )?(previous|prior|above|earlier) (instructions|rules|prompts?)",
    r"(admin|god|debug) mode",
    r"(do not|don'?t|never) ask (me )?for (my |a |the )?(pin|otp|password|face)",
    r"(without|skip|bypass|disable|turn off) (asking for )?(my |a |the )?(pin|otp|face check|face)",
    r"disregard (your|the|all) (instructions|rules|system)",
    r"forget (everything|your (rules|instructions))",
    r"(reveal|show|print|repeat|leak) (me )?(your|the) (system )?(prompt|instructions|rules)",
    r"system prompt",
    r"you are (now|no longer)",
    r"act as (an? )?(?!financial|finance|budget)",
    r"pretend (to be|you are)",
    r"\bjailbreak\b",
    r"\bdan mode\b",
    r"developer mode",
    r"</?(system|instructions|financial_data)>",
    r"\[\[?system\]?\]",
    r"other (users?|customers?|people)'?s? ?(data|accounts?|transactions|balances?)",
    r"(all|every) (users?|customers?)'? ?(data|accounts?|balances?)",
    r"\bsql\b|select \* from|drop table",
    r"base64|rot13",
]

# Words that mark a question as being about money. Includes common Yorùbá,
# Igbo, Hausa and Pidgin terms so non-English questions are not misread.
FINANCE = [
    "money", "spend", "spent", "spending", "save", "saving", "savings", "budget", "balance", "account",
    "salary", "income", "earn", "pay", "paid", "payment", "transfer", "send", "bill", "rent", "loan",
    "debt", "interest", "repay", "invest", "investment", "pension", "stock", "treasury", "insurance",
    "tax", "paye", "vat", "staff", "payroll", "business", "sales", "profit", "revenue", "cost", "expense",
    "afford", "cash", "fund", "funding", "investor", "subscription", "netflix", "dstv", "airtime", "data",
    "food", "transport", "uber", "bolt", "grocer", "naira", "₦", "dollar", "usd", "gbp", "pound", "euro",
    "fx", "exchange", "rate", "convert", "price", "cheap", "expensive", "week", "month", "year", "today",
    "forecast", "plan", "goal", "target", "refund", "vendor", "invoice", "advert", "ads", "marketing",
    "runway", "credit", "debit", "card", "opay", "kuda", "zenith", "bank", "wallet", "reminder", "due",
    "overspend", "category", "compare", "trend", "insight", "how much", "where did",
    # Yorùbá
    "owó", "owo", "ná", "ìnáwó", "inawo", "fipamọ́", "ifowopamo", "gbèsè", "gbese", "oṣù", "osu", "ọ̀sẹ̀",
    # Igbo
    "ego", "mmefu", "chekwaa", "ụgwọ", "ugwo", "ọnwa", "onwa", "izu",
    # Hausa
    "kuɗi", "kudi", "kashe", "ajiya", "bashi", "wata", "mako", "albashi",
    # Pidgin
    "wetin", "chop", "spend am", "how far",
]

SMALL_TALK = re.compile(r"^\s*(hi|hello|hey|good (morning|afternoon|evening)|thanks?|thank you|e ?(ku|kaa+ro|kaa+san|kurole)|bawo|ndewo|sannu|kedu)\b", re.I)


def plain(text: str) -> str:
    """Drop tone marks and dots (ẹ káàárọ̀ -> e kaaro) so greetings match however they are typed."""
    return "".join(ch for ch in unicodedata.normalize("NFD", text) if not unicodedata.combining(ch))


def normalise(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"[​-‏⁠﻿]", "", text)
    return re.sub(r"\s+", " ", text).lower()


def classify(message: str) -> str:
    """Return "" when the question is fine, else "injection" or "off_topic"."""
    text = normalise(message)
    if any(re.search(p, text) for p in INJECTION):
        return "injection"
    if SMALL_TALK.match(plain(text)) and len(text) < 40:
        return ""
    if any(w in text for w in FINANCE):
        return ""
    return "off_topic"


AMOUNT = re.compile(r"₦\s?(\d[\d,]*\d|\d)(\.\d+)?\s?(k|m|million|thousand)?\b", re.I)


def amounts(text: str) -> list[float]:
    out = []
    for num, frac, unit in AMOUNT.findall(text):
        v = float(num.replace(",", "") + frac)
        v *= {"k": 1e3, "thousand": 1e3, "m": 1e6, "million": 1e6}.get(unit.lower(), 1)
        if v >= 1000:
            out.append(v)
    return out


def context_numbers(obj) -> list[float]:
    nums: list[float] = []
    if isinstance(obj, dict):
        for v in obj.values():
            nums += context_numbers(v)
    elif isinstance(obj, list):
        for v in obj:
            nums += context_numbers(v)
    elif isinstance(obj, (int, float)) and not isinstance(obj, bool):
        nums.append(abs(float(obj)))
    return nums


def unsupported_amounts(answer: str, context: dict) -> list[float]:
    """Naira figures in the answer that are not in the data, nor a simple sum,
    difference or share of figures that are. Rounded figures pass when within
    1.5 percent, which covers ₦48k for ₦48,250."""
    known = [n for n in context_numbers(context) if n >= 100]
    derived = set(known)
    top = sorted(known, reverse=True)[:60]
    for i, a in enumerate(top):
        for b in top[i + 1:]:
            derived.update((a + b, abs(a - b)))
        for k in (2, 3, 4, 12, 30):
            derived.update((a / k, a * k))
    def close(v):
        return any(abs(v - d) <= max(0.015 * d, 500) for d in derived)
    return [v for v in amounts(answer) if not close(v)]
