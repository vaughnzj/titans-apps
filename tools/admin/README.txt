ROSTER MANAGER TEST SUITES

These test "Titans Roster Manager.html", which lives one folder up from this repo
and is NOT part of it. They need a small harness first, because the Manager loads
SheetJS from cdnjs and the sandbox these run in blocks that host:

  1. mkdir -p pgtest/admin pgtest/fixtures
  2. npm install xlsx@0.18.5 --no-save
     cp node_modules/xlsx/dist/xlsx.full.min.js pgtest/admin/
  3. Copy the Manager to pgtest/admin/index.html, replacing the cdnjs URL in its
     <script src> with just "xlsx.full.min.js".
  4. python3 make-fixtures.py        (writes pgtest/fixtures/*.xlsx)
  5. cd pgtest && python3 -m http.server 8808 &
  6. node ../titans-apps/tools/admin/roster-manager.js
     node ../titans-apps/tools/admin/excel-uploads.js
     node ../titans-apps/tools/admin/template-roundtrip.js
     node ../titans-apps/tools/admin/partial-updates.js

WHAT EACH ONE COVERS

  roster-manager.js       Loading a released roster.js, merging a spreadsheet,
                          ID preservation, the duplicate guards, the class bump
                          (including that it graduates seniors and that removing
                          them BEFORE bumping is what keeps this year's juniors),
                          the generated file, and a round trip.

  excel-uploads.js        Real workbooks: title rows above the header, columns in
                          the wrong order, a stray blank row, a class written as a
                          number, two candidate sheets, a sheet with no header at
                          all, .xlsm, and a quoted comma inside a name.

  template-roundtrip.js   Titans-Roster-Template.xlsx, filled and blank. The one
                          that matters: two players sharing a last name must come
                          out as TWO people with two IDs, shown as "Dieker, T" and
                          "Dieker, J". That used to silently merge into one.

  partial-updates.js      Names now, jerseys later - the real season workflow.
                          A later upload must keep EVERY id, and a column the file
                          does not contain must be left alone: a jersey-only file
                          cannot wipe the class years typed in between. Needs
                          pgtest/fixtures/jim2627.xlsx, a copy of the live
                          "Titans Roster 2026-2027.xlsx".

Every suite has had its key checks proved to fail by reintroducing the bug they
cover. A check that cannot fail is not a check.
