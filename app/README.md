# PWH Part Warehouse (Module 1: Data management)

Open `index.html` in Chrome or Edge. No server or install is needed; SheetJS is bundled in `vendor/`.
Data is stored in the browser (IndexedDB) on that computer. Firebase comes in Step 8 (shared data between PCs).

## Files
- `js/labels.js`     English text for every label. Do not edit.
- `js/labels.th.js`  Thai text. Type each translation by hand; a blank key shows the English text.
- `js/db.js`         Storage layer. The only file that touches IndexedDB; a Firebase adapter replaces it later.
- `js/parsers.js`    Reads the four Excel types and checks each file on upload.
- `js/checks.js`     Cross-file checks and BOM explosion (product -> parts), reused by Modules 3 and 4.
- `js/app.js`        Screens.

## Data model (what is stored)
files   : id, type (bom | matloc | monthly | daily), name, uploadedAt, rows, planDate / month, issues[], stats[]
chunks  : parsed rows in blocks of 5,000 (compact arrays; layouts are documented at the top of parsers.js)
blobs   : the original .xlsx, so it can be downloaded again
meta    : settings (plant order)

## Which file is "in use"
- BOM and Material-Location: the newest upload.
- Monthly plan: the newest upload for each month.
- Daily plan: the newest upload for each plan date. Delete the newest and the previous one is used again.
Every upload is kept until you delete it.

## Reading the files
- BOM: sheets ZBOM and SBOM are merged; the same component listed twice under one parent is added up.
- Material-Location: rows with material "<<empty>>" are kept as empty bins.
- Daily plan: plan date comes from "DATE : dd/mm/yyyy" (Buddhist year converted), falling back to the file name.
- Monthly plan: the SAP job order export (Job_Order.XLSX); the month is the most common start month.
