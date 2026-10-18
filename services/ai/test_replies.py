from datetime import date

import replies

TODAY = date(2026, 10, 18)  # a Sunday
CTX = {
    "accounts": [{"name": "Zenith Savings", "number": "•••• 4417", "balance": 500000}],
    "upcoming": [{"title": "Loan repayment, Zenith", "amount": 140400, "due": "27 Oct"}, {"title": "DStv renewal", "amount": 25000, "due": "20 Oct"}],
    "payees": ["Tunde Bakare"],
}


def test_reminder_intent_beats_transfer():
    assert replies.intent("Remind me to pay DStv ₦25,000 on 20 Oct") == "reminder"
    assert replies.intent("Send ₦25,000 to Tunde") == "transfer"
    assert replies.intent("What reminders do I have?") == "upcoming"


def test_parse_reminder():
    r = replies.parse_reminder("Remind me to pay DStv ₦25,000 on 20 Oct", CTX, TODAY)
    assert r == {"title": "DStv", "amount": 25000, "due": "2026-10-20"}
    r = replies.parse_reminder("Remind me 3 days before my loan repayment", CTX, TODAY)
    assert r["title"] == "Loan repayment" and r["amount"] == 140400 and r["due"] == "2026-10-24"
    assert replies.parse_reminder("remind me to pay rent tomorrow", {}, TODAY)["due"] == "2026-10-19"
    assert replies.parse_reminder("remind me about school fees next friday", {}, TODAY)["due"] == "2026-10-23"
    assert replies.parse_reminder("remind me to call the bank", {}, TODAY)["due"] == "2026-10-21"


def test_parse_date_rolls_forward():
    assert replies.parse_date("on 2 Jan", TODAY) == date(2027, 1, 2)
    assert replies.parse_date("on the 5th", TODAY) == date(2026, 11, 5)
    assert replies.parse_date("in 2 weeks", TODAY) == date(2026, 11, 1)


def test_reminder_action_and_template():
    a = replies.actions("reminder", CTX, "Remind me to pay DStv ₦25,000 on 20 Oct")
    assert a[0]["kind"] == "reminder" and a[0]["title"] == "DStv"
    assert "DStv" in replies.template("reminder", CTX, "en", "Remind me to pay DStv ₦25,000 on 20 Oct")
    assert "DStv" in replies.template("reminder", CTX, "yo", "Remind me to pay DStv ₦25,000 on 20 Oct")


def test_sources():
    s = replies.sources("balance", CTX)
    assert s[0]["type"] == "accounts" and "Zenith Savings •••• 4417" in s[0]["detail"]
    assert [x["type"] for x in replies.sources("spend", CTX)] == ["transactions", "accounts"]
    assert replies.sources("greeting", CTX) == []


def test_advice_offers_to_send():
    acts = replies.actions("save", {}, "how much should I save?")
    assert acts[0]["kind"] == "offer" and acts[0]["amount"] == 20000


def test_new_payee_is_collected_in_chat():
    acts = replies.actions("transfer", {"payees": ["Tunde Bakare"]}, "send ₦75,000 to my landlord for rent")
    assert acts[0]["kind"] == "transfer" and acts[0]["new"] and acts[0]["amount"] == 75000 and acts[0]["note"] == "rent"
