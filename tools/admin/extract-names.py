#!/usr/bin/env python3
"""Pull every name out of the two source workbooks into one deduped list.

Two things make this more than a copy-paste:

1. The same player appears on several sheets — Hudson Lincoln is on Varsity, JV
   AND Sophomore. Those merge on an exact (last, first) match.

2. Some players are spelled differently in different places. Those are NOT merged
   automatically: each one is listed in VARIANTS below with the spelling chosen and
   why, and every merge is reported so Jim can check it. Silently guessing that two
   spellings are one kid is exactly the identity bug the split was meant to stop —
   except in reverse.
"""
import io
import re
import unicodedata
import openpyxl

UP = "/root/.claude/uploads/4c3e240e-fb17-5305-80df-89ee76eb8793/"
SPRING = UP + "4bf65f9e-Legend_Consolidated_Spring_Stats_2026.xlsx"
FALL = UP + "9505fb5f-2026_Fall_Baseball_Roster_-_Team_Assignments.xlsx"


def clean(v):
    """Trim, collapse inner whitespace, strip non-breaking spaces."""
    if v is None:
        return ""
    s = unicodedata.normalize("NFKC", str(v)).replace(" ", " ")
    return re.sub(r"\s+", " ", s).strip()


def key(last, first):
    return (last.lower(), first.lower())


# ─────────────────── known spelling variants ───────────────────
# (last, first) as written  ->  (last, first) to keep, and the reason.
# Every one of these is reported in the output so Jim can overrule it.
VARIANTS = {
    ("pistorious", "brody"): ("Pistorius", "Brody",
                              "Varsity says Pistorious; JV and the fall pitching plan both say Pistorius"),
    ("mcculough", "rylen"):  ("McCullough", "Rylen",
                              "Sophomore says McCulough; Freshmen says McCullough"),
    ("zadigan", "drew"):     ("Zadigian", "Drew",
                              "JV says Zadigan, Sophomore says Zadigian — NO TIEBREAK, please check"),
    ("holt", "b"):           ("Holt", "Brayden",
                              "JV has him as Holt, B; Sophomore has Holt, Brayden"),
}

rows = {}      # key -> dict
order = []     # keys, in the order first seen
merges = []    # things worth telling Jim about
variant_hits = []


def add(last, first, source):
    last, first = clean(last), clean(first)
    if not last and not first:
        return
    k = key(last, first)
    if k in VARIANTS:
        canon_l, canon_f, why = VARIANTS[k]
        variant_hits.append("%s, %s  ->  %s, %s  (%s)" % (last, first, canon_l, canon_f, why))
        last, first = canon_l, canon_f
        k = key(last, first)
    if k in rows:
        if source not in rows[k]["src"]:
            rows[k]["src"].append(source)
        return
    rows[k] = {"last": last, "first": first, "src": [source]}
    order.append(k)


# ─────────────────── spring stats: four team sheets ───────────────────
# Columns are Number | Last | First | ... . Stop at the Totals row.
wb = openpyxl.load_workbook(SPRING, data_only=True)
for sheet in ("Varsity", "JV", "Sophomore", "Freshmen"):
    ws = wb[sheet]
    for r in range(3, ws.max_row + 1):
        num = ws.cell(r, 1).value
        if clean(num).lower() in ("totals", "glossary"):
            break
        add(ws.cell(r, 2).value, ws.cell(r, 3).value, "Spring 26 " + sheet)

# ─────────────────── fall roster: has an explicit grade ───────────────────
wb2 = openpyxl.load_workbook(FALL, data_only=True)
ws = wb2["Full Team"]
GRADE_NOTE = {9: "gr 9", 10: "gr 10"}
for r in range(2, ws.max_row + 1):
    last, first = ws.cell(r, 1).value, ws.cell(r, 2).value
    if not clean(last):
        continue
    grade = ws.cell(r, 3).value
    team = clean(ws.cell(r, 4).value)
    bits = ["Fall 26"]
    if grade in GRADE_NOTE:
        bits.append(GRADE_NOTE[grade])
    if team:
        bits.append(team.replace(" Titans", ""))
    add(last, first, " ".join(bits))

# ─────────────────── report ───────────────────
print("%d distinct players" % len(order))

no_first = [rows[k] for k in order if not rows[k]["first"]]
multi = [rows[k] for k in order if len(rows[k]["src"]) > 1]

print("\nSPELLING VARIANTS COLLAPSED (%d):" % len(variant_hits))
for v in variant_hits:
    print("  " + v)

print("\nNO FIRST NAME (%d) — a last name alone cannot be told apart from a brother:" % len(no_first))
for p in no_first:
    print("  %-14s  %s" % (p["last"], ", ".join(p["src"])))

print("\nAPPEARED ON MORE THAN ONE SHEET (%d), merged on an exact name match:" % len(multi))
for p in multi:
    print("  %-14s %-11s %s" % (p["last"], p["first"], " / ".join(p["src"])))

# Same last name, different first — fine, but worth printing: these are the ones
# the apps will show with an initial.
bylast = {}
for k in order:
    bylast.setdefault(rows[k]["last"].lower(), []).append(rows[k])
shared = {L: v for L, v in bylast.items() if len(v) > 1}
print("\nSHARED LAST NAMES (%d) — these will show as \"Last, I\" on the iPads:" % len(shared))
for L in sorted(shared):
    print("  %-14s %s" % (shared[L][0]["last"],
                          ", ".join(p["first"] or "(no first)" for p in shared[L])))

io.open("/home/claude/roster_names.tsv", "w", encoding="utf-8").write(
    "".join("%s\t%s\t%s\n" % (rows[k]["last"], rows[k]["first"], "; ".join(rows[k]["src"]))
            for k in sorted(order, key=lambda k: (rows[k]["last"].lower(), rows[k]["first"].lower()))))
print("\nwrote /home/claude/roster_names.tsv")
