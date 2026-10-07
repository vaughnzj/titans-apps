#!/usr/bin/env python3
"""Build the Excel fixtures the admin suites upload.

They are built to look like a real program's file rather than a clean export:
title rows above the header, columns in the wrong order, a stray blank row, a
class written as a number, a name with a comma in it.
"""
import os
import openpyxl

OUT = "pgtest/fixtures"
os.makedirs(OUT, exist_ok=True)


def save(wb, name):
    p = os.path.join(OUT, name)
    wb.save(p)
    print("wrote", p)


# A program roster: two title rows, a blank row, columns out of order, a class
# as a number, a comma inside a name, and a trailing blank row.
wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Pitchers"
for r, row in enumerate([
        ["LEGEND TITANS BASEBALL"],
        ["2027 Winter Program"],
        [],
        ["Throws", "Player", "Bats", "Class", "Jersey"],
        ["R", "Hasche", "L", "Junior", "17"],
        ["L", "Combest, J", "L", 10, None],
        ["R", "Dieker", "R", None, None],
        [],
], start=1):
    for c, v in enumerate(row, start=1):
        ws.cell(r, c, v)
save(wb, "program.xlsx")

# Same thing as a macro workbook — openpyxl can't write real VBA, and it doesn't
# need to: the point is that the .xlsm extension is accepted and read.
wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Roster"
for r, row in enumerate([["Name", "Class", "Throws"], ["Macro Kid", "Sr", "R"]], start=1):
    for c, v in enumerate(row, start=1):
        ws.cell(r, c, v)
save(wb, "macro.xlsm")

# Two sheets that both look like a roster, so the tool has to ask which one.
wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Hitters"
for r, row in enumerate([["Name", "Class", "Bats"], ["Alvarez", "Sr", "L"]], start=1):
    for c, v in enumerate(row, start=1):
        ws.cell(r, c, v)
ws2 = wb.create_sheet("Arms")
for r, row in enumerate([["Name", "Class", "Throws"],
                         ["Pistoris", "Sr", "R"], ["Glen", "Fr", "L"]], start=1):
    for c, v in enumerate(row, start=1):
        ws2.cell(r, c, v)
save(wb, "two-sheets.xlsx")

# No header at all — read positionally, name first, the rest sniffed.
wb = openpyxl.Workbook()
ws = wb.active
for r, row in enumerate([["Swigart", "Jr", "R"], ["Fuller", "So", "L"]], start=1):
    for c, v in enumerate(row, start=1):
        ws.cell(r, c, v)
save(wb, "bare.xlsx")

# A spring jersey file: last, first, jersey and NOTHING ELSE. The point of the
# partial-updates suite is that a file which says nothing about class must not wipe
# the class years already typed in.
wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Jerseys"
ws.append(["LEGEND TITANS \u2014 SPRING 2027 JERSEYS"])
ws.append([])
ws.append(["Last Name", "First Name", "Jersey"])
for row in [("Andrews", "Liam", "13"), ("Bader", "Chase", "8"),
            ("Brown", "Nolan", "9"), ("Brown", "Titus", "10"),
            ("Lythgoe", "Landon", "12"), ("Lythgoe", "Beckett", "05"),
            ("Zadigian", "Drew", "1")]:
    ws.append(list(row))
save(wb, "spring-jerseys.xlsx")

print("\nThe two template fixtures are built from Titans-Roster-Template.xlsx:")
print("  tmpl2-asis.xlsx    a straight copy, example rows left in")
print("  tmpl2-filled.xlsx  example rows deleted, four real players typed in,")
print("                     two of whom share a last name")
