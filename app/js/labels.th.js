/* Thai text for the screen (first draft written by Claude, to be checked and edited by the factory team). Edit any text between the quotes.
 * A key left as '' falls back to the English text shown after //.
 * Keep {n}, {name}, {rows} ... exactly as they are; the app fills them in. */
(function (g) {
  var PWH = (g.PWH = g.PWH || {});
  PWH.th = {
  "app.name": "ระบบจัดการคลัง Part",   // Part Warehouse
  "app.sub": "PWH",   // PWH
  "nav.m1": "ข้อมูล",   // Data
  "nav.m2": "ผังคลัง",   // Warehouse layout
  "nav.m3": "เส้นทางหยิบ",   // Pick navigation
  "nav.m4": "ความถี่และการย้าย",   // Frequency & relocation
  "nav.m5": "กฎการย้าย",   // Relocation rules
  "nav.m6": "แดชบอร์ด",   // Dashboard
  "nav.soon": "เร็ว ๆ นี้",   // Planned
  "nav.storage_mem": "ข้อมูลถูกเก็บไว้ในหน่วยความจำชั่วคราวเท่านั้น และจะหายเมื่อปิดหน้านี้",   // Data is kept in memory only; it is lost when this page closes.
  "m1.title": "จัดการข้อมูล",   // Data management
  "m1.intro": "อัปโหลดข้อมูล 4 ชุด ระบบจะตรวจไฟล์ทุกครั้งที่อัปโหลด และตรวจข้อมูลทั้งชุดร่วมกันด้านล่าง",   // Upload the four data sets. Each file is checked on upload; the whole set is checked together below.
  "tab.bom": "BOM",   // BOM
  "tab.matloc": "Material–Location",   // Material–Location
  "tab.monthly": "แผนรายเดือน",   // Monthly plan
  "tab.daily": "แผนรายวัน",   // Daily plan
  "help.bom": "ไฟล์ BOM จาก SAP ที่มีชีต ZBOM (สินค้าสำเร็จรูป) และ SBOM (ชิ้นส่วนประกอบย่อย) ระบบใช้ไฟล์ที่อัปโหลดล่าสุด",   // SAP BOM export with sheets ZBOM (finished goods) and SBOM (sub-assemblies). The newest upload is used.
  "help.matloc": "รายการสต็อกตาม Bin จาก SAP: Material ไหนอยู่ใน Bin ไหน ระบบใช้ไฟล์ที่อัปโหลดล่าสุด",   // SAP storage bin stock list: which material sits in which bin. The newest upload is used.
  "help.monthly": "รายการ Job Order ของ SAP สำหรับ 1 เดือน คุณเลือกเดือนเองตอนอัปโหลด แต่ละเดือนใช้ไฟล์ที่อัปโหลดล่าสุด ระบบนี้ใช้ไฟล์นี้เพื่อหา Plant ของ JOB จากเลข Order เท่านั้น",   // SAP job order list for one month. You choose the month when you upload. For each month, the newest upload is used. In this system it is used only to find the plant of a JOB from its Order number.
  "help.daily": "รายงานแผนผลิตรายวัน (PLAN_KORAT) คุณเลือกวันที่ของแผนเองตอนอัปโหลด ระบบเก็บแผนไว้ทุกวัน หากอัปโหลดวันที่เดิมซ้ำ จะใช้ไฟล์ล่าสุดของวันนั้น",   // Daily production report (PLAN_KORAT). You choose the plan date when you upload. Plans are kept for every date; when a date is uploaded again, the newest file for that date is used.
  "upload.drop": "ลากไฟล์ .xlsx มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์",   // Drop .xlsx files here, or click to choose
  "upload.drop_multi": "เลือกได้หลายไฟล์พร้อมกัน",   // You can select several files at once.
  "upload.reading": "กำลังอ่าน {name}…",   // Reading {name}…
  "upload.saving": "กำลังบันทึก {name}…",   // Saving {name}…
  "upload.ok": "อัปโหลด {name} แล้ว ({rows} แถว)",   // {name} uploaded ({rows} rows).
  "upload.ok_replace": "อัปโหลด {name} แล้ว ({rows} แถว) ไฟล์นี้ใช้แทนไฟล์เดิมของ {key}",   // {name} uploaded ({rows} rows). It replaces the earlier file for {key}.
  "upload.older": "อัปโหลด {name} แล้ว ({rows} แถว) แต่มีไฟล์ของ {key} ที่ใหม่กว่าอยู่แล้ว ไฟล์นี้จึงถูกเก็บไว้แต่ไม่ถูกใช้",   // {name} uploaded ({rows} rows). A newer file for {key} already exists, so this one is kept but not used.
  "upload.rejected": "ไม่ได้บันทึก {name} {reason}",   // {name} was not saved. {reason}
  "upload.wrongtype": "ไฟล์นี้ดูเหมือน {type} กรุณาอัปโหลดที่แท็บ {type}",   // This file looks like {type}. Upload it in the {type} tab.
  "upload.unknown": "ไฟล์นี้ไม่ใช่ BOM, Material–Location, แผนรายเดือน หรือแผนรายวัน",   // The file is not a BOM, Material–Location list, monthly plan or daily plan.
  "upload.readerr": "อ่านไฟล์นี้เป็นสมุดงาน Excel ไม่ได้",   // The file could not be read as an Excel workbook.
  "upload.dismiss": "ปิด",   // Dismiss
  "fatal.columns": "ชีต \"{sheet}\" ไม่มีคอลัมน์: {cols}",   // Sheet "{sheet}" is missing the columns: {cols}.
  "fatal.no_rows": "ไม่พบแถวข้อมูลที่ใช้ได้",   // No usable data rows were found.
  "fatal.no_date": "ไม่พบวันที่ในไฟล์",   // No date was found in the file.
  "fatal.type": "ไม่รู้จักประเภทไฟล์",   // Unknown file type.
  "files.title": "ไฟล์",   // Files
  "files.of": "ไฟล์{t}",   // {t} files
  "mod.cap": "โมดูล {n}",   // Module {n}
  "m1.cap": "โมดูล 1",   // Module 1
  "m1.intro2": "อัปโหลดไฟล์จาก SAP ที่นี่ ระบบตรวจไฟล์ทุกครั้งที่อัปโหลด และใช้ไฟล์ล่าสุดเสมอ",   // Upload the SAP files here. Each file is checked when it is uploaded, and the newest one is used.
  "v1.files": "ไฟล์ข้อมูล",   // Data files
  "v1.checks": "ตรวจข้อมูลทั้งชุด",   // Check all data together
  "v1.lookup": "ค้นหา Product",   // Look up a Product
  "tile.empty": "คลิกเพื่ออัปโหลด",   // Click to upload
  "tile.none": "ยังไม่มีไฟล์",   // No file yet
  "tile.ok2": "ผ่าน",   // Passed
  "tile.files": "{n} ไฟล์",   // {n} files
  "frow.sub": "อัปโหลด {when} · {n} แถว",   // Uploaded {when} · {n} rows
  "files.empty2": "ยังไม่มีไฟล์ กดปุ่ม อัปโหลดไฟล์ หรือลากไฟล์ .xlsx มาวางในกล่องนี้",   // No file yet. Click Upload file or drop a .xlsx file onto this box.
  "upload.btn": "อัปโหลดไฟล์",   // Upload file
  "upload.hint": "ลากไฟล์ .xlsx มาวางในกล่องนี้ได้ เลือกได้หลายไฟล์พร้อมกัน",   // You can also drop .xlsx files onto this box, several at once.
  "detail.cap": "รายละเอียดไฟล์",   // File details
  "detail.none": "ยังไม่ได้เลือกไฟล์",   // No file selected
  "upload.hint2": "หรือลากไฟล์ .xlsx มาวางบนการ์ดนี้",   // or drop .xlsx files on this card
  "ul.title": "JOB ตาม U-line",   // JOBs per U-line
  "ul.sum": "{n} ไลน์ · รวม {j} JOB",   // {n} lines · {j} JOB
  "cal.week": "จ,อ,พ,พฤ,ศ,ส,อา",   // Mon,Tue,Wed,Thu,Fri,Sat,Sun
  "cal.has": "อัปโหลดแล้ว {n} วัน",   // Uploaded {n} days
  "cal.miss": "ยังไม่มีแผน {n} วัน",   // Missing {n} days
  "cal.miss_tip": "",   // Mon–Sat up to today with no daily plan uploaded
  "sum.err": "มีแถวถูกตัด {n} เรื่อง",   // {n} with dropped rows
  "sum.warn": "คำเตือน {n} เรื่อง",   // {n} warnings
  "sum.info": "หมายเหตุ {n} เรื่อง",   // {n} notes
  "sum.open": "ดูรายละเอียด",   // Show details
  "bq.cap": "ค้นหา BOM",   // BOM search
  "bq.title": "ค้นหารหัสใน BOM นี้",   // Find a code in this BOM
  "bq.help": "พิมพ์รหัส Product เพื่อดูว่าใช้ Part อะไร จำนวนเท่าไหร่ (เฉพาะชั้นแรก) หรือพิมพ์รหัส Part เพื่อดูว่าใช้ใน Product ไหน",   // Type a Product code to see the Parts it uses (first level only), or a Part code to see where it is used.
  "bq.ph": "พิมพ์รหัส Product หรือ Part",   // Type a Product or Part code
  "bq.pick": "พบ {n} รหัสที่ตรงกัน เลือกหนึ่งรหัส:",   // {n} codes match. Pick one:
  "bq.more": "และอีก {n} รหัส พิมพ์รหัสให้ยาวขึ้น",   // and {n} more, type more of the code
  "bq.none": "ไม่พบรหัสนี้ใน BOM",   // No code in this BOM matches.
  "bq.is_parent": "ใช้ {n} Part",   // Uses {n} Parts
  "bq.is_comp": "ถูกใช้ใน {n} ที่",   // Used in {n} places
  "bq.uses": "Part ที่ใช้ · Plant {plant} ({n} รายการ)",   // Parts used · Plant {plant} ({n} items)
  "bq.c.part": "Part",   // Part
  "bq.c.name": "ชื่อ Part",   // Part name
  "bq.c.qty": "จำนวนต่อชิ้น",   // Qty per piece
  "bq.c.unit": "หน่วย",   // Unit
  "bq.c.bin": "Bin",   // Bin
  "bq.c.stock": "สต็อก",   // Stock
  "bq.subasm": "Sub-assembly",   // Sub-assembly
  "bq.nobin": "ไม่มีตำแหน่งเก็บ",   // No bin
  "bq.usedin": "ถูกใช้ใน ({n})",   // Used in ({n})
  "bq.c.parent": "ใช้ใน",   // Used in
  "bq.c.kind": "ประเภท",   // Type
  "bq.c.plant": "Plant",   // Plant
  "bq.kind.z": "Product (ZBOM)",   // Product (ZBOM)
  "bq.kind.s": "Sub-assembly (SBOM)",   // Sub-assembly (SBOM)
  "raw.cap": "ข้อมูลดิบ",   // Raw data
  "raw.title": "ข้อมูลในไฟล์นี้",   // Data in this file
  "raw.help": "แสดงเฉพาะคอลัมน์ที่ระบบใช้ ด้วยชื่อคอลัมน์เดิมจาก SAP",   // Only the columns the system uses, with the SAP column names.
  "raw.ph.bom": "ค้นหา Material, Component หรือชื่อ",   // Search Material, Component or text
  "raw.ph.matloc": "ค้นหา Bin หรือ Material",   // Search Bin or Material
  "raw.ph.daily": "ค้นหา JOB, Product หรือ U-line",   // Search JOB, Product or U-line
  "raw.ph.monthly": "ค้นหา JOB (Order), Material หรือสถานะ",   // Search JOB (Order), Material or status
  "raw.onlybad": "เฉพาะแถวที่มีปัญหา",   // Only rows with problems
  "raw.count": "{n} จาก {t} แถว",   // {n} of {t} rows
  "raw.badcount": "แถวที่มีปัญหา {n} แถว",   // {n} rows with problems
  "raw.no": "#",   // #
  "raw.empty": "ไม่มีแถวที่ตรงกัน",   // No rows match.
  "mf.label": "เดือน",   // Month
  "mf.all": "ทุกเดือน",   // All months
  "mf.prev": "เดือนก่อนหน้า",   // Earlier month
  "mf.next": "เดือนถัดไป",   // Later month
  "mf.clear": "แสดงทุกเดือน",   // Show all months
  "mf.note_off": "แสดงไฟล์ของทุกเดือน",   // Showing files from every month.
  "mf.note_on": "ทุกแท็บแสดงเฉพาะ {m}",   // Showing only {m} in every tab.
  "mf.empty": "แท็บนี้ไม่มีไฟล์ของ {m}",   // No file for {m} in this tab.
  "mf.in_use": "ไฟล์ที่ใช้อยู่ตอนนี้คือ {name} (อัปโหลด {m})",   // The file in use now is {name} (uploaded {m}).
  "mf.by.bom": "กรองตามเดือนที่อัปโหลดไฟล์",   // Filtered by the month the file was uploaded.
  "mf.by.matloc": "กรองตามเดือนที่อัปโหลดไฟล์",   // Filtered by the month the file was uploaded.
  "mf.by.daily": "กรองตามวันที่แผน",   // Filtered by the plan date.
  "mf.by.monthly": "กรองตามเดือนของแผน",   // Filtered by the plan month.
  "mf.rows.monthly": "เฉพาะ Order ที่เริ่มหรือเสร็จใน {m}",   // Only orders that start or finish in {m}
  "mf.rows.daily": "เฉพาะ JOB ที่เสร็จใน {m}",   // Only JOBs that finish in {m}
  "files.empty": "ยังไม่มีไฟล์ อัปโหลดได้ด้านบน",   // No file yet. Upload one above.
  "col.name": "ไฟล์",   // File
  "col.planDate": "วันที่ของแผน",   // Plan date
  "col.month": "เดือน",   // Month
  "col.uploaded": "อัปโหลดเมื่อ",   // Uploaded
  "col.rows": "แถว",   // Rows
  "col.status": "ผลตรวจ",   // Check
  "col.use": "การใช้งาน",   // Use
  "col.actions": "",   // 
  "status.ok": "ผ่าน",   // Passed
  "status.warn": "มีคำเตือน",   // Warnings
  "status.error": "ข้ามบางแถว",   // Rows skipped
  "use.active": "กำลังใช้",   // In use
  "use.replaced": "ถูกแทนที่",   // Replaced
  "act.view": "ดู",   // View
  "act.download": "ดาวน์โหลด",   // Download
  "act.delete": "ลบ",   // Delete
  "act.confirm": "คลิกอีกครั้งเพื่อลบ",   // Click again to delete
  "detail.empty": "เลือกไฟล์เพื่อดูผลตรวจและข้อมูล",   // Select a file to see its check results and data.
  "detail.facts": "สรุป",   // Summary
  "detail.checks": "ผลการตรวจ",   // Check results
  "detail.clean": "ไม่พบปัญหาในไฟล์นี้",   // No problems found in this file.
  "detail.preview": "ข้อมูล",   // Data
  "detail.filter": "กรองแถว",   // Filter rows
  "detail.showing": "{from}–{to} จาก {total}",   // {from}–{to} of {total}
  "detail.prev": "ก่อนหน้า",   // Previous
  "detail.next": "ถัดไป",   // Next
  "detail.loading": "กำลังโหลดแถว…",   // Loading rows…
  "detail.samples": "ตัวอย่าง",   // Examples
  "level.error": "ข้ามแถว",   // Skipped
  "level.warning": "คำเตือน",   // Warning
  "level.info": "หมายเหตุ",   // Note
  "daily.dates": "แผนแยกตามวันที่",   // Plan by date
  "daily.dates_help": "ไฟล์ที่ขึ้นว่า กำลังใช้ คือไฟล์ที่ระบบอ่านสำหรับวันนั้น",   // The file marked In use is the one the system reads for that date.
  "daily.versions": "{n} ฉบับ",   // {n} versions
  "daily.version": "1 ฉบับ",   // 1 version
  "ready.title": "ความพร้อมของข้อมูล",   // Data readiness
  "ready.none": "ยังไม่อัปโหลด",   // Not uploaded
  "ready.files": "{n} ไฟล์",   // {n} files
  "ready.dates": "จำนวนวัน: {n}",   // Dates: {n}
  "ready.months": "จำนวนเดือน: {n}",   // Months: {n}
  "ready.rows": "{n} แถว",   // {n} rows
  "ready.checking": "กำลังตรวจไฟล์ทั้งหมดร่วมกัน…",   // Checking all files together…
  "ready.checks": "ตรวจข้ามไฟล์",   // Cross-file checks
  "ready.settings": "ลำดับ Plant",   // Plant order
  "ready.settings_help": "เมื่อ Product มี BOM ทั้งสอง Plant จะใช้ Plant ที่อยู่ก่อน",   // When a product has a BOM in both plants, the first plant listed is used.
  "ready.need_more": "อัปโหลด BOM และ Material–Location อย่างน้อยเพื่อให้ตรวจข้ามไฟล์ได้",   // Upload at least a BOM and Material–Location to run the cross-file checks.
  "check.ok": "ผ่าน",   // Passed
  "check.warning": "ควรตรวจสอบ",   // Needs attention
  "check.error": "มีปัญหา",   // Problem
  "check.info": "หมายเหตุ",   // Note
  "check.pending": "รอข้อมูล",   // Waiting
  "check.plan_not_in_bom.title": "Product ในแผนที่ไม่มีใน BOM",   // Plan products that are missing from the BOM
  "check.plan_not_in_bom.ok": "Product ในแผนทั้ง {total} รายการมี BOM ครบ",   // All {total} products in the plans have a BOM.
  "check.plan_not_in_bom.bad": "Product ในแผน {n} จาก {total} รายการไม่มี BOM จึงหา Part ที่ต้องใช้ไม่ได้",   // {n} of {total} products in the plans have no BOM, so their parts cannot be worked out.
  "check.part_not_in_ml.title": "Part ที่แผนต้องใช้แต่ไม่มีตำแหน่งเก็บ",   // Parts the plans need that have no storage location
  "check.part_not_in_ml.ok": "Part ที่แผนต้องใช้ทั้ง {total} รายการอยู่ใน Material–Location แล้ว",   // All {total} parts the plans need are in Material–Location.
  "check.part_not_in_ml.bad": "Part {n} จาก {total} รายการไม่มีแถวใน Material–Location (คิดเป็น {pct}% ของปริมาณ Part ที่ต้องใช้ทั้งหมด) จึงถูกตัดออกจากเส้นทางและการวิเคราะห์",   // {n} of {total} parts have no row in Material–Location ({pct}% of the total part demand). They are left out of routes and analysis.
  "check.plant_both.title": "Product ที่มี BOM ในทั้งสอง Plant",   // Products with a BOM in both plants
  "check.plant_both.desc": "Product ในแผน {n} จาก {total} รายการมี BOM ทั้งสอง Plant ลำดับ Plant ที่ใช้: {order}",   // {n} of {total} products in the plans have a BOM in both plants. Plant order used: {order}.
  "check.ml_not_in_bom.title": "Material ที่เก็บอยู่แต่ไม่มี BOM ใดใช้",   // Stored materials that no BOM uses
  "check.ml_not_in_bom.ok": "Material ที่เก็บอยู่ทุกรายการเป็น Component ใน BOM",   // Every stored material is a component in the BOM.
  "check.ml_not_in_bom.bad": "Material ใน Material–Location {n} จาก {total} รายการไม่เป็น Component ใน BOM ใดเลย",   // {n} of {total} materials in Material–Location are not a component in any BOM.
  "check.ml_is_assembly.title": "Material ที่เก็บอยู่และเป็นชิ้นประกอบด้วย",   // Stored materials that are also assemblies
  "check.ml_is_assembly.ok": "ไม่มี Material ที่เก็บอยู่ตัวใดมี BOM ของตัวเอง ทุก Part จึงหยิบที่ระดับเดียวกับที่เก็บ",   // No stored material has its own BOM, so every part is picked at the level it is stored.
  "check.ml_is_assembly.bad": "Material ที่เก็บอยู่ {n} รายการมี BOM ของตัวเองด้วย ต้องตัดสินใจว่าจะหยิบทั้งชิ้นหรือหยิบตาม Part ย่อย",   // {n} stored materials also have their own BOM. Decide whether to pick them whole or by their parts.
  "check.ml_multi_bin.title": "Part ที่เก็บมากกว่า 1 Bin",   // Parts stored in more than one bin
  "check.ml_multi_bin.desc": "Material {n} จาก {total} รายการอยู่ใน 2 Bin ขึ้นไป เส้นทางหยิบจะแสดงทุก Bin ให้ผู้หยิบเลือกเอง",   // {n} of {total} materials sit in two or more bins. Pick navigation needs a rule for choosing the bin.
  "check.daily_gaps.title": "วันที่ขาดระหว่างแผนรายวัน",   // Dates missing between daily plans
  "check.daily_gaps.ok": "แผนรายวันครบทุกวันตั้งแต่วันแรกถึงวันสุดท้าย",   // Daily plans cover every date from the first to the last.
  "check.daily_gaps.bad": "มี {n} วันระหว่างแผนรายวันวันแรกและวันสุดท้ายที่ไม่มีไฟล์",   // {n} dates between the first and last daily plan have no file.
  "check.layout_pending.title": "Bin บนผังคลัง",   // Bins on the warehouse layout
  "check.layout_pending.desc": "มี {n} Bin ที่มีสต็อกใน Material–Location ระบบจะจับคู่กับผังเมื่อนำเข้าผังใน Module 2 แล้ว",   // {n} bins hold stock in Material–Location. They are matched to the layout once it is imported in Module 2.
  "issue.key_empty": "ข้าม {n} แถวที่ไม่มีรหัสหลัก",   // {n} rows with a missing key were skipped.
  "issue.self_ref": "ข้าม {n} แถวที่ Material ระบุตัวเองเป็น Component ของตัวเอง",   // {n} rows where a material lists itself as its own component were skipped.
  "issue.qty_invalid": "ข้าม {n} แถวที่ไม่มีจำนวน หรือจำนวนเป็นศูนย์หรือติดลบ",   // {n} rows with a missing, zero or negative quantity were skipped.
  "issue.dup_row": "มี {n} แถวซ้ำ (Parent, Component และ Plant เดียวกัน) เมื่อใช้งานจะรวมจำนวนเข้าด้วยกัน",   // {n} duplicate rows (same parent, component and plant). Their quantities are added together when used.
  "issue.dup_row_ml": "มี {n} แถวซ้ำ (Bin, Material และ Plant เดียวกัน)",   // {n} duplicate rows (same bin, material and plant).
  "issue.cycle": "มี {n} Material ที่วนลูป (Part ที่มีตัวเองเป็นส่วนประกอบ) ระบบจะตัดลูปทิ้งเมื่อคำนวณ Part",   // {n} materials sit in a loop (a part that contains itself). The loop is cut when parts are worked out.
  "issue.unit_other": "มี {n} Component ที่ใช้หน่วยอื่นที่ไม่ใช่ PCS",   // {n} components use a unit other than PCS.
  "issue.sheet_ignored": "ข้ามชีตที่ไม่มีคอลัมน์ของ BOM",   // A sheet without BOM columns was ignored.
  "issue.bin_empty": "ข้าม {n} แถวที่ไม่มี Bin",   // {n} rows without a bin were skipped.
  "issue.stock_negative": "มี {n} แถวที่สต็อกติดลบ",   // {n} rows have a negative stock or pick quantity.
  "issue.bin_special": "มี {n} ชื่อ Bin ที่ไม่ตรงรูปแบบ ชั้น-ระดับ (เช่น PRINTER หรือ NEW) ยังเก็บไว้เป็น Bin",   // {n} bin names do not follow the rack-level pattern (for example PRINTER or NEW). They are kept as bins.
  "issue.mat_multi_bin": "มี {n} Material ที่เก็บมากกว่า 1 Bin",   // {n} materials are stored in more than one bin.
  "issue.date_name_mismatch": "วันที่ในรายงานไม่ตรงกับวันที่ในชื่อไฟล์",   // The date in the report differs from the date in the file name.
  "issue.date_from_name": "ไม่มีวันที่ในหัวรายงาน จึงใช้วันที่จากชื่อไฟล์",   // No date in the report header, so the file name date is used.
  "issue.row_date_differs": "มี {n} แถวที่วันที่เสร็จไม่ตรงกับวันที่ของรายงาน",   // {n} rows have a finish date that differs from the report date.
  "issue.dup_job": "มี {n} เลข JOB ที่ปรากฏมากกว่า 1 ครั้ง",   // {n} job numbers appear more than once.
  "issue.dup_order": "มี {n} เลข Order ที่ปรากฏมากกว่า 1 ครั้ง",   // {n} order numbers appear more than once.
  "issue.date_missing": "มี {n} แถวที่ไม่มีวันที่เริ่ม",   // {n} rows have no start date.
  "issue.rows_other_month": "มี {n} แถวที่เริ่มนอกเดือนหลักของไฟล์นี้ ยังเก็บไว้ใช้งาน",   // {n} rows start outside the main month of this file. They are kept.
  "stat.sheets": "ชีต",   // Sheets
  "stat.fg": "สินค้าสำเร็จรูป",   // Finished goods
  "stat.sub": "ชิ้นส่วนประกอบย่อย",   // Sub-assemblies
  "stat.components": "Component",   // Components
  "stat.plants": "Plant (จำนวนแถว)",   // Plants (rows)
  "stat.bins": "Bin",   // Bins
  "stat.bins_empty": "Bin ว่าง",   // Empty bins
  "stat.materials": "Material",   // Materials
  "stat.types": "Storage Type (จำนวนแถว)",   // Storage types (rows)
  "stat.plan_date": "วันที่ของแผน",   // Plan date
  "stat.jobs": "JOB",   // Jobs
  "stat.products": "Product",   // Products
  "stat.total_qty": "จำนวนตามแผนรวม",   // Total plan quantity
  "stat.lines": "U-line (JOB)",   // U-line (jobs)
  "stat.month": "เดือน",   // Month
  "c.src": "ชีต",   // Sheet
  "c.parent": "Material",   // Material
  "c.comp": "Component",   // Component
  "c.text": "ชื่อ Component",   // Component text
  "c.plant": "Plant",   // Plant
  "c.qty": "จำนวน",   // Qty
  "c.unit": "หน่วย",   // Unit
  "c.stype": "ประเภท",   // Type
  "c.bin": "Bin",   // Bin
  "c.material": "Material",   // Material
  "c.stock": "สต็อก",   // Stock
  "c.putaway": "Putaway",   // Putaway
  "c.pick": "จำนวนหยิบ",   // Pick qty
  "c.duration": "ระยะเวลา",   // Duration
  "c.job": "JOB",   // Job
  "c.product": "Product",   // Product
  "c.desc": "รายละเอียด",   // Description
  "c.line": "U-line",   // U-line
  "c.finish": "วันที่เสร็จ",   // Finish
  "c.order": "Order",   // Order
  "c.delivered": "ส่งแล้ว",   // Delivered
  "c.start": "วันที่เริ่ม",   // Start
  "c.status": "สถานะระบบ",   // System status
  "c.lead": "Leading Order",   // Leading order
  "c.confirmed": "ยืนยันแล้ว",   // Confirmed
  "need.title": "แต่ละ Module ต้องใช้อะไร",   // What each module needs
  "need.sub": "Module จะสร้างต่อได้เมื่ออัปโหลดข้อมูลที่ต้องใช้ครบที่นี่ ส่วนผังคลังเพิ่มได้ใน Module 2",   // A module can be built once its data is uploaded here. The layout itself is added in Module 2.
  "need.bom": "BOM",   // BOM
  "need.matloc": "Material–Location",   // Material–Location
  "need.plan": "แผนรายวันหรือรายเดือน",   // Daily or monthly plan
  "need.layout": "ผังคลัง (Module 2)",   // Layout (Module 2)
  "need.ready": "ข้อมูลพร้อม",   // Data ready
  "need.waiting": "อัปโหลดก่อน: {list}",   // Upload first: {list}
  "tile.warn": "มีคำเตือน {n} ไฟล์",   // {n} with warnings
  "tile.ok": "ทุกไฟล์ผ่าน",   // All files passed
  "files.rule.bom": "กำลังใช้: ไฟล์ที่อัปโหลดล่าสุด ไฟล์เก่ายังอยู่ในรายการจนกว่าคุณจะลบ",   // In use: the newest upload. Older uploads stay in the list until you delete them.
  "files.rule.matloc": "กำลังใช้: ไฟล์ที่อัปโหลดล่าสุด ไฟล์เก่ายังอยู่ในรายการจนกว่าคุณจะลบ",   // In use: the newest upload. Older uploads stay in the list until you delete them.
  "files.rule.monthly": "กำลังใช้: ไฟล์ที่อัปโหลดล่าสุดของแต่ละเดือน",   // In use: the newest upload for each month.
  "files.rule.daily": "กำลังใช้: ไฟล์ที่อัปโหลดล่าสุดของแต่ละวันที่ หากลบไฟล์นั้น จะกลับไปใช้ไฟล์ก่อนหน้าของวันนั้น",   // In use: the newest upload for each date. Delete it and the previous upload for that date is used again.
  "detail.legend": "ข้ามแถว: แถวที่ไม่นำมาใช้ คำเตือน: เก็บแถวไว้แต่ควรดู หมายเหตุ: ข้อมูลเฉย ๆ",   // Skipped: rows left out of the data. Warning: rows kept, but worth a look. Note: information only.
  "todo.label": "สิ่งที่ต้องทำ",   // What to do
  "check.plan_not_in_bom.todo": "เพิ่ม Product เหล่านี้ในไฟล์ BOM หรือแก้รหัสในแผน แล้วอัปโหลดใหม่",   // Add these products to the BOM export, or correct their codes in the plan, then upload again.
  "check.part_not_in_ml.todo": "Part เหล่านี้จัดเส้นทางไม่ได้ ตรวจว่าเก็บไว้ที่อื่นหรือหายไปจากไฟล์ Material–Location",   // These parts cannot be routed. Check whether they are kept somewhere else or missing from the Material–Location export.
  "check.plant_both.todo": "ตรวจว่าลำดับ Plant ด้านบนตรงกับวิธีผลิตจริงของ Product เหล่านี้",   // Make sure the plant order above matches how these products are really built.
  "check.ml_not_in_bom.todo": "ไม่ต้องทำอะไร เว้นแต่ Part เหล่านี้ควรมีอยู่ใน BOM",   // No action unless these parts should appear in a BOM.
  "check.ml_is_assembly.todo": "แจ้งว่าให้หยิบทั้งชิ้นหรือหยิบตาม Part ย่อย",   // Tell us whether these are picked whole or by their parts.
  "check.ml_multi_bin.todo": "ตอนนี้ไม่ต้องทำอะไร เส้นทางหยิบจะแสดงทุก Bin ให้ผู้หยิบเลือก",   // No action now. Pick navigation will need a rule for which bin to use.
  "check.daily_gaps.todo": "อัปโหลดแผนรายวันที่ขาด หากต้องการให้รวมในการวิเคราะห์",   // Upload the missing daily plans if you want them in the analysis.
  "issue.key_empty.todo": "ใส่รหัสที่ขาดในไฟล์ต้นฉบับ แล้วอัปโหลดใหม่",   // Fill in the missing codes in the source file and upload again.
  "issue.self_ref.todo": "แก้ BOM ใน SAP",   // Correct the BOM in SAP.
  "issue.qty_invalid.todo": "แก้จำนวนในไฟล์ต้นฉบับแล้วอัปโหลดใหม่ ไม่เช่นนั้นแถวเหล่านี้จะไม่ถูกใช้",   // Correct the quantity in the source file and upload again, or these rows stay out.
  "issue.dup_row.todo": "ไม่ต้องทำอะไร",   // No action needed.
  "issue.dup_row_ml.todo": "ตรวจไฟล์ที่ส่งออกว่ามีรายการซ้ำหรือไม่",   // Check the export for double entries.
  "issue.cycle.todo": "แก้ BOM ใน SAP ระหว่างนี้ระบบจะข้ามลูป",   // Correct the BOM in SAP. Meanwhile the loop is ignored.
  "issue.unit_other.todo": "ไม่ต้องทำอะไร ใช้จำนวนตามที่ระบุ",   // No action needed. Quantities are used as listed.
  "issue.bin_empty.todo": "ใส่ Bin ในไฟล์ต้นฉบับแล้วอัปโหลดใหม่",   // Fill in the bin in the source file and upload again.
  "issue.stock_negative.todo": "ตรวจแถวเหล่านี้ใน SAP",   // Check these rows in SAP.
  "issue.bin_special.todo": "ตอนนี้ไม่ต้องทำอะไร Module 2 จะกำหนดว่า Bin เหล่านี้อยู่ตรงไหนของผัง",   // No action now. Module 2 decides where these bins go on the layout.
  "issue.mat_multi_bin.todo": "ตอนนี้ไม่ต้องทำอะไร",   // No action now.
  "issue.date_name_mismatch.todo": "ตรวจว่าอัปโหลดไฟล์ถูกต้อง ระบบใช้วันที่ในรายงาน",   // Check you uploaded the right file. The date in the report is used.
  "issue.row_date_differs.todo": "ไม่ต้องทำอะไรหากวันที่ของรายงานถูกต้อง ระบบใช้วันที่ของรายงานกับทุกแถว",   // No action if the report date is correct. The report date is used for every row.
  "issue.dup_job.todo": "ตรวจแผนว่ามีรายการซ้ำหรือไม่",   // Check the plan for double entries.
  "issue.dup_order.todo": "ตรวจไฟล์ที่ส่งออกว่ามีรายการซ้ำหรือไม่",   // Check the export for double entries.
  "issue.date_missing.todo": "ใส่วันที่เริ่มในไฟล์ต้นฉบับ หากจำเป็น",   // Fill in the start date in the source file if it matters.
  "issue.rows_other_month.todo": "ไม่ต้องทำอะไร",   // No action needed.
  "check.layout_match.title": "Bin ที่มีสต็อกบนผังคลัง",   // Stock bins on the warehouse layout
  "check.layout_match.ok": "Bin ที่มีสต็อกทั้ง {total} รายการอยู่บนผังแล้ว",   // All {total} bins that hold stock are on the layout.
  "check.layout_match.bad": "Bin ที่มีสต็อก {n} จาก {total} รายการไม่อยู่บนผัง รายการอยู่ที่หน้า ผังคลัง",   // {n} of {total} bins that hold stock are not on the layout. The list is in Warehouse layout.
  "check.layout_match.todo": "เพิ่มชั้นวางเหล่านั้นลงในผัง หรือแก้ชื่อ Bin ให้ถูกต้อง Bin ที่ไม่อยู่บนผังจะไม่ถูกนำไปจัดเส้นทาง",   // Add those racks to the layout or correct the bin names. Bins not on the layout are left out of routes.
  "m2.intro": "นำเข้าผังคลัง ตรวจเทียบกับตำแหน่งเก็บสต็อก และดูชั้นวางแบบ 2D หรือ 3D ส่วนการแก้ไขชั้นวาง ทางเดิน และจุด START กับ DROP จะทำต่อไป",   // Import the layout, check it against the stock locations, and look at the racks in 2D or 3D. Editing racks, aisles and the START and DROP points comes next.
  "m2.import.title": "ไฟล์ผังคลัง",   // Layout file
  "m2.import.help": "อัปโหลด Warehouse_Layouts.xlsx (1 ชีตต่อ 1 ชั้น) ระบบอ่านชั้นวางจากเซลล์ที่ผสานกัน อ่านระดับชั้นจากสีของเซลล์ และอ่านทางเดินจากเซลล์สีฟ้าอ่อน",   // Upload Warehouse_Layouts.xlsx (one sheet per floor). Racks are read from the merged cells, levels from the cell colours and aisles from the pale blue cells.
  "m2.import.drop": "ลากไฟล์ผัง .xlsx มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์",   // Drop the layout .xlsx here, or click to choose
  "m2.import.reading": "กำลังอ่านผัง…",   // Reading the layout…
  "m2.import.ok": "นำเข้าผังแล้ว: {floors} ชั้น {racks} ชั้นวาง",   // Layout imported: {floors} floors, {racks} racks.
  "m2.import.fail": "ไฟล์นี้ไม่ใช่ผังคลัง ต้องมีชีตชื่อ \"Layout …\" และมีชั้นวางอยู่ในเซลล์ที่ผสานกัน",   // This file is not a layout. Expected sheets named "Layout …" with racks in merged cells.
  "m2.loaded": "ผังจาก {name} นำเข้าเมื่อ {when}",   // Layout from {name}, imported {when}
  "m2.reimport": "นำเข้าอีกครั้ง",   // Import again
  "m2.remove": "ลบผัง",   // Remove layout
  "m2.remove_confirm": "คลิกอีกครั้งเพื่อลบ",   // Click again to remove
  "m2.floor": "ชั้น {n}",   // Floor {n}
  "m2.view.2d": "2D",   // 2D
  "m2.view.3d": "3D",   // 3D
  "m2.color": "แสดงสีตาม",   // Colour by
  "m2.color.levels": "ระดับชั้นวาง",   // Rack levels
  "m2.color.stock": "สต็อก",   // Stock
  "m2.fit": "พอดีจอ",   // Fit
  "m2.copy": "คัดลอกรหัส Part",   // Copy Part code
  "m2.copied": "คัดลอก {v} แล้ว",   // Copied {v}
  "m2.q.ph2": "ค้นหา Part หรือช่อง",   // Search Part or bin
  "m2.names.tip": "แสดงป้ายโซนที่หัวแถวของชั้นวาง (ซูมเข้าใกล้จะเห็นเลขช่อง)",   // Show a zone sign at the start of each rack row (rack numbers appear when zoomed in)
  "m2.color.opt": "สี: {v}",   // Colour: {v}
  "m2.zin": "ซูมเข้า",   // Zoom in
  "m2.zout": "ซูมออก",   // Zoom out
  "m2.cnt.here": "ชั้น {f}: {n} ชั้นวาง",   // Floor {f}: {n} racks
  "m2.cnt.all": "รวมทุกชั้น {n}",   // All floors {n}
  "m2.rot.l": "หมุนซ้าย",   // Turn left
  "m2.rot.r": "หมุนขวา",   // Turn right
  "m2.rot.reset": "กลับมุมเริ่มต้น",   // Reset turn
  "m2.rot.tip": "3D: ลากบนแผนที่เพื่อหมุนและปรับมุมก้มเงย · ลากด้วยเมาส์ขวา หรือกด Shift ค้างแล้วลาก เพื่อเลื่อนแผนที่",   // 3D: drag on the map to turn and tilt; right-drag or Shift + drag to move the map
  "m2.tilt.up": "มองจากมุมสูงขึ้น",   // Look from higher
  "m2.tilt.down": "มองจากมุมต่ำลง",   // Look from lower
  "m2.legend.l1": "1 ระดับ",   // 1 level
  "m2.legend.l": "{n} ระดับ",   // {n} levels
  "m2.legend.ln": "{n} ระดับ",   // {n} levels
  "m2.legend.stock": "ระดับที่มีสต็อก",   // Level with stock
  "m2.legend.aisle": "ทางเดินรถเข็น",   // Cart aisle
  "m2.search.placeholder": "ค้นหา Part หรือ Bin",   // Find a Part or Bin
  "m2.names": "ป้ายโซน",   // Zone signs
  "m2.res.title": "พบ {n} รายการใน {r} ชั้นวาง",   // Found {n} items in {r} racks
  "m2.res.none": "ไม่พบ Part หรือ Bin ที่ตรงกับคำค้น",   // No Part or Bin matches this search.
  "m2.res.more": "แสดง {n} รายการแรกจากทั้งหมด {t}",   // Showing the first {n} of {t}.
  "m2.col.bin": "Storage Bin",   // Storage Bin
  "m2.col.part": "Part",   // Part
  "m2.col.plant": "Plant",   // Plant
  "m2.col.qty": "จำนวน",   // Quantity
  "m2.col.floor": "ชั้น",   // Floor
  "m2.sel.free": "Bin ว่าง {n}/{t}",   // Free bins {n}/{t}
  "m2.q.ph": "ค้นหา Part หรือช่อง เช่น 5232QXXXX21011 หรือ 1G-01",   // Search a Part or bin, e.g. 5232QXXXX21011 or 1G-01
  "m2.color.zone": "โซน / แถว",   // Zone / row
  "m2.legend.zone": "แถบสี = โซน / แถว",   // Colour strip = zone / row
  "m2.legend.hit": "ที่เลือก / ที่ค้นเจอ",   // Selected / found
  "m2.legend.empty": "ไม่มีสต็อก",   // No stock
  "m2.count": "ชั้นวาง {n}",   // {n} racks
  "m2.admin": "จัดการผัง",   // Manage layout
  "m2.warn.title": "มีสต็อก {n} Bin ที่ไม่อยู่ในผัง",   // Stock in {n} bins is not on the layout
  "m2.warn.open": "ดูรายการ",   // Show list
  "m2.warn.special": "ชื่อที่ไม่ใช่ชั้นวางและระดับ:",   // Names that are not a rack and level:
  "m2.warn.racks": "ชั้นวางที่ไม่มีในผัง ({n}):",   // Racks missing from the layout ({n}):
  "m2.warn.levels": "Bin ที่ระดับเกินจำนวนระดับของชั้นวาง ({n}):",   // Bins above the rack’s levels ({n}):
  "m2.back": "↑ กลับไปแผนที่",   // ↑ Back to map
  "m2.dock.drag": "ลากเพื่อปรับความสูง",   // Drag to resize
  "m2.find.part": "ค้นหา Part",   // Search Part
  "m2.find.part_ph": "เช่น Z231CT130C10HMXX11 หรือบางส่วนของรหัส",   // e.g. Z231CT130C10HMXX11 or part of the code
  "m2.find.bin": "ค้นหาช่อง",   // Search bin
  "m2.find.bin_ph": "เช่น 1G-01 หรือ 1G-01-02",   // e.g. 1G-01 or 1G-01-02
  "m2.find.go": "ค้นหา",   // Search
  "m2.find.clear": "ล้าง",   // Clear
  "m2.fs": "เต็มจอ",   // Full screen
  "m2.fs.exit": "ออกจากเต็มจอ",   // Exit full screen
  "m2.sel.caption": "ตำแหน่งจัดเก็บ",   // Storage location
  "m2.sel.title2": "รายละเอียดช่อง {id}",   // Details of rack {id}
  "m2.sel.parts": "{n} Part",   // {n} Part
  "m2.sel.note": "รวมทุกชั้นจัดเก็บในช่องนี้ • ข้อมูลจาก Material–Location",   // All levels of this rack, from Material–Location
  "m2.sel.freelist": "ระดับที่ไม่มีสต็อก:",   // Levels with no stock:
  "m2.sel.free_bin": "Bin ว่าง",   // Empty bin
  "m2.res.caption": "ค้นหาในผัง",   // Search the layout
  "m2.res.head": "ผลการค้นหา",   // Search results
  "m2.res.sub": "พบใน {r} ช่อง คลิกแถวเพื่อเปิดช่อง",   // Found in {r} racks, click a row to open the rack
  "m2.res.count": "{n} รายการ",   // {n} items
  "m2.sum.caption": "ภาพรวม",   // Overview
  "m2.sum.head": "ภาพรวมผังคลัง",   // Warehouse overview
  "m2.col.no": "ลำดับ",   // No.
  "m2.col.level": "ชั้นจัดเก็บ",   // Level
  "m2.mk.start": "START",   // START
  "m2.mk.drop": "DROP",   // DROP
  "m2.mk.door": "ประตู",   // Door
  "m2.mk.lift": "ลิฟต์ ชั้น 1–2",   // Lift 1–2
  "m2.mk.exit": "ออกด้านนอก",   // To outside
  "m2.side.racks": "ชั้นวาง",   // Racks
  "m2.side.levels": "แยกตามจำนวนระดับ",   // By number of levels
  "m2.side.bins_on": "Bin ที่มีสต็อกบนผัง",   // Stock bins on the layout
  "m2.side.empty_on": "Bin ว่างบนผัง",   // Empty bins on the layout
  "m2.side.nodata": "อัปโหลด Material–Location ที่หน้า ข้อมูล เพื่อดูสต็อกบนชั้นวาง",   // Upload Material–Location in Data to see stock on the racks.
  "m2.sel.title": "ชั้นวาง {id}",   // Rack {id}
  "m2.sel.sub": "ชั้น {floor} มี {levels} ระดับ",   // Floor {floor}, {levels} levels
  "m2.sel.level": "ระดับ {n}",   // Level {n}
  "m2.sel.empty": "ไม่มีสต็อกบันทึกไว้",   // No stock recorded
  "m2.sel.close": "ปิด",   // Close
  "m2.sel.more": "และอีก {n} รายการ",   // +{n} more
  "m2.unmatched.title": "Bin ที่มีสต็อกแต่ไม่อยู่บนผัง",   // Stock bins not on the layout
  "m2.unmatched.special": "ชื่อที่ไม่ใช่ชั้นวางและระดับ: {list}",   // Names that are not a rack and level: {list}
  "m2.unmatched.racks": "ชั้นวางที่ไม่มีในผัง ({n}): {list}",   // Racks missing from the layout ({n}): {list}
  "m2.unmatched.levels": "{n} Bin ใช้ระดับสูงกว่าที่ชั้นวางมี: {list}",   // {n} bins use a level above what the rack has: {list}
  "m2.hint": "ลากเพื่อเลื่อน เลื่อนล้อเมาส์เพื่อซูม คลิกชั้นวางเพื่อดู Bin",   // Drag to move, scroll to zoom, click a rack to see its bins.
  "m2.scale_note": "มาตราส่วนที่ใช้: {px} พิกเซลในชีต = 1 เมตร (สมมติ) ระยะทางของเส้นทางขึ้นกับค่านี้ ควรตรวจเทียบกับการเดินวัดจริง 1 เส้นทาง",   // Scale used: {px} sheet pixels = 1 m (assumed). Route distances depend on it, so check it against one measured walk.
  "fatal.date_required": "เลือกวันที่ (แผนรายวัน) หรือเดือน (แผนรายเดือน) ก่อนอัปโหลด",   // Choose the date (daily plan) or the month (monthly plan) before uploading.
  "issue.date_differs_header": "วันที่ที่เขียนไว้ในรายงานไม่ตรงกับวันที่ที่คุณเลือก",   // The date written in the report differs from the date you chose.
  "issue.date_differs_header.todo": "ตรวจว่าเลือกวันที่ถูกต้อง ระบบใช้วันที่ที่คุณเลือก",   // Check that you chose the right date. The date you chose is used.
  "stat.ml_rows": "แถวในไฟล์ (ไม่นับหัวตาราง)",   // Rows in the file
  "stat.ml_merged": "แถวที่รวมกัน: Part เดียวกันในช่องเดียวกันคนละ Plant (รวมสต็อก)",   // Rows joined: same bin and Part in another Plant (stock added up)
  "stat.ml_saved": "แถวที่เก็บในระบบ (ช่องละ Part ละ 1 แถว · ช่องว่างช่องละ 1 แถว)",   // Rows kept (one per bin and Part; one per empty bin)
  "stat.ml_emptydup": "แถวที่รวมกัน: ช่องว่างเดียวกันซ้ำ (เช่น อยู่ทั้ง A00 และ C00)",   // Rows joined: the same empty bin listed again (e.g. under both storage types)
  "stat.c00_ignored": "แถวที่ไม่นำมาใช้ (Storage Type C00)",   // Rows ignored (storage type C00)
  "loc.sheet": "ชีต",   // Sheet
  "loc.row": "แถว",   // Row
  "loc.col": "คอลัมน์",   // Column
  "loc.val": "ค่า",   // Value
  "loc.note": "หมายเหตุ",   // Note
  "loc.show_all": "แสดงทั้งหมด {n} รายการ",   // Show all {n}
  "loc.limit": "แสดง {shown} รายการแรกจาก {total} รายการ ดาวน์โหลดไฟล์เพื่อดูส่วนที่เหลือ",   // Showing the first {shown} of {total}. Download the file to see the rest.
  "ask.date.title": "วันที่ของแผนสำหรับ {name}",   // Plan date for {name}
  "ask.month.title": "เดือนสำหรับ {name}",   // Month for {name}
  "ask.date.help": "เลือกวันที่ที่แผนนี้เป็นของ ระบบไม่ใช้ชื่อไฟล์",   // Choose the date this plan is for. The file name is not used.
  "ask.month.help": "เลือกเดือนที่แผนนี้เป็นของ ระบบไม่ใช้ชื่อไฟล์",   // Choose the month this plan is for. The file name is not used.
  "ask.suggest": "พบในไฟล์: {value}",   // Found in the file: {value}
  "ask.go": "อัปโหลด",   // Upload
  "ask.cancel": "ยกเลิก",   // Cancel
  "ask.cancelled": "ไม่ได้อัปโหลด {name}",   // {name} was not uploaded.
  "ask.missing": "กรุณาเลือกค่าก่อน",   // Choose a value first.
  "act.use_this": "ใช้ฉบับนี้แทน",   // Use this version
  "act.use_confirm": "คลิกอีกครั้งเพื่อใช้ฉบับนี้",   // Click again to use this version
  "use.switched": "ตอนนี้ {name} เป็นฉบับที่ใช้งานของ {key}",   // {name} is now the version in use for {key}.
  "col.by": "อัปโหลดโดย",   // Uploaded by
  "change.title": "ความเปลี่ยนแปลงจากฉบับก่อนหน้า",   // Change from the previous version
  "change.compared": "เทียบกับ {name} ({when})",   // Compared with {name} ({when})
  "change.none": "ไม่มีฉบับก่อนหน้าให้เทียบ",   // No earlier version to compare with.
  "change.same": "เหมือนฉบับก่อนหน้า",   // Same as the previous version.
  "change.ml_bins_new": "Bin ที่ตอนนี้มีสต็อก",   // Bins that now hold stock
  "change.ml_bins_freed": "Bin ที่ตอนนี้ไม่มีสต็อกแล้ว",   // Bins that no longer hold stock
  "change.ml_moved": "Material ที่ย้ายไปอยู่ Bin อื่น",   // Materials moved to a different bin
  "change.ml_stock": "สต็อกเปลี่ยนใน Bin เดิม",   // Stock changed in the same bin
  "change.bom_added": "แถว Component ที่เพิ่ม",   // Component rows added
  "change.bom_removed": "แถว Component ที่ลบ",   // Component rows removed
  "change.bom_qty": "จำนวนที่เปลี่ยน",   // Quantity changed
  "change.jobs_added": "JOB ที่เพิ่ม",   // Jobs added
  "change.jobs_removed": "JOB ที่ลบ",   // Jobs removed
  "change.orders_added": "Order ที่เพิ่ม",   // Orders added
  "change.orders_removed": "Order ที่ลบ",   // Orders removed
  "asof.label": "ข้อมูล ณ",   // Data as of
  "asof.none": "ยังไม่มีข้อมูล",   // No data yet
  "topbar.ready": "ข้อมูลพร้อม",   // Data ready
  "topbar.missing": "ยังขาด: {list}",   // Missing: {list}
  "lookup.title": "ค้นหา Product หรือ Part",   // Search a Product or Part
  "lookup.help": "ดูว่าระบบอ่านอะไรจากไฟล์ที่ใช้อยู่: BOM, Bin และสต็อก",   // See what the system reads from the files in use: the BOM, the bins and the stock.
  "lookup.placeholder": "พิมพ์รหัส หรือบางส่วนของรหัส",   // Type a code, or part of one
  "lookup.nodata": "อัปโหลด BOM และ Material–Location ก่อน",   // Upload a BOM and Material–Location first.
  "lookup.none": "ไม่พบรายการที่ตรงกัน",   // Nothing matches.
  "lookup.kind.product": "Product",   // Product
  "lookup.kind.part": "Part",   // Part
  "lookup.in_bom": "Part ของ {code} (ลงไปถึงระดับสุดท้าย)",   // Parts of {code} (down to the last level)
  "lookup.plant": "Plant ของ BOM",   // BOM plant
  "lookup.comp": "Part",   // Part
  "lookup.name": "ชื่อ",   // Name
  "lookup.qty_per": "จำนวนต่อ Product",   // Qty per product
  "lookup.bin": "Bin",   // Bin
  "lookup.stock": "สต็อก",   // Stock
  "lookup.nobin": "ไม่มี Bin",   // No bin
  "lookup.used_in": "ใช้ใน {n} Product",   // Used in {n} products
  "lookup.bins": "Bin ที่เก็บ {code}",   // Bins holding {code}
  "lookup.more": "และอีก {n} รายการ",   // +{n} more
  "m3.search.label": "ค้นหา Product หรือ JOB",   // Search a Product or JOB
  "m3.search.placeholder": "พิมพ์รหัส Product หรือเลข JOB",   // Type a Product code or a JOB number
  "m3.sug.kind_product": "Product–BOM",   // Product–BOM
  "m3.sug.found": "พบ {n} รายการ",   // Found {n} items
  "m3.sug.pick": "เลือก",   // Select
  "m3.sug.hint": "เลือกหนึ่งรายการเพื่อดูเส้นทางหยิบ",   // Choose one to see the pick route
  "m3.sug.product": "Product",   // Product
  "m3.sug.parts": "{n} Part (BOM ชั้นแรก)",   // {n} Part (BOM level 1)
  "m3.flow.step2": "ชั้น {n} · {c} จุด",   // Floor {n} · {c} stops
  "m3.kpi.dist": "ระยะทาง",   // Distance
  "m3.kpi.m": "{m} ม.",   // {m} m
  "m3.kpi.time": "เวลาโดยประมาณ",   // Estimated time
  "m3.kpi.min": "{n} นาที",   // {n} min
  "m3.kpi.split": "เดิน {w} · หยิบ {p} นาที",   // walk {w} · pick {p} min
  "m3.kpi.time_tip": "จำลอง: เดิน {w} นาที (ความเร็ว {v} ม./วินาที) + หยิบ {n} จุด × {p} วินาที + ลิฟต์ {l} ครั้ง × {ls} วินาที",   // Simulation: walk {w} min at {v} m/s, {n} picks x {p} s, {l} lift rides x {ls} s
  "m3.bin.more": "Part นี้มี {n} Bin กดเพื่อเลือก Bin อื่น",   // {n} bins hold this Part. Click to pick another one
  "m3.bin.pick": "หยิบ {code} จาก",   // Pick {code} from
  "m3.bin.auto": "น้อยสุด",   // least stock
  "m3.bin.note": "มี {n} Bin · กดป้าย Bin เพื่อเปลี่ยน",   // {n} bins · click the bin to change
  "m3.bin.note_own": "มี {n} Bin · เปลี่ยน Bin แล้ว",   // {n} bins · you changed the bin
  "m4.intro": "ความถี่การหยิบ Part ตามแผนรายวัน ตำแหน่งที่จัดเก็บ และระยะเข็นที่ลดได้ถ้าสลับตำแหน่ง Part แบบ 1:1",   // How often each Part is picked in the daily plans, where it sits, and how much cart walking 1:1 swaps would save.
  "m4.tab.freq": "ความถี่การหยิบ",   // Pick frequency
  "m4.tab.recs": "คำแนะนำสลับตำแหน่ง",   // Swap advice
  "m4.tab.sim": "Simulation",   // Simulation
  "m4.from": "จาก",   // From
  "m4.to": "ถึง",   // To
  "m4.q.ph": "ค้นหา Product หรือ Part",   // Search Product or Part
  "m4.busy.load": "กำลังโหลดข้อมูล…",   // Loading data…
  "m4.busy.analyse": "กำลังวิเคราะห์แผน…",   // Analysing the plans…
  "m4.busy.recs": "กำลังหาคู่สลับที่ดีที่สุด…",   // Looking for the best swaps…
  "m4.busy.sim": "กำลังจำลอง…",   // Simulating…
  "m4.need.title": "ต้องมีข้อมูลก่อน",   // Data needed
  "m4.need.list": "อัปโหลดหรือเพิ่ม: {list}",   // Upload or add: {list}
  "m4.need.daily": "แผนรายวัน",   // daily plan
  "m4.need.bom": "Product–BOM",   // Product–BOM
  "m4.need.matloc": "Material–Location",   // Material–Location
  "m4.need.layout": "ผังคลัง",   // warehouse layout
  "m4.warn.monthly": "ยังไม่มีแผนรายเดือนที่ใช้งาน: ระบบจะรู้ Plant ของ JOB ได้เฉพาะ Product ที่มีใน Plant เดียว",   // No monthly plan in use: the Plant of a JOB is known only when the Product exists in one Plant.
  "m4.k.rounds": "รอบจัด Part ตามแผน",   // Pick rounds planned
  "m4.k.rounds_of": "จาก {n} รอบในแผน",   // of {n} in the plans
  "m4.k.parts": "Part ไม่ซ้ำ",   // Different Parts
  "m4.k.picks": "รวม {n} ครั้ง",   // {n} picks in total
  "m4.k.dist": "ระยะเข็นจำลอง",   // Simulated cart distance
  "m4.k.per": "เฉลี่ย {m} ม./รอบ",   // {m} m per round
  "m4.k.bad": "คำนวณไม่ได้",   // Not computable
  "m4.k.bad_sub": "{r} รอบ · {p} Part",   // {r} rounds · {p} Parts
  "m4.m": "{m} ม.",   // {m} m
  "m4.floor": "ชั้น {n}",   // Floor {n}
  "m4.times": "{n} ครั้ง",   // {n} times
  "m4.pct": "{p}%",   // {p}%
  "m4.parts.title": "Part ที่ถูกหยิบบ่อย",   // Parts picked most
  "m4.parts.sub": "นับครั้งเดียวต่อรอบ ที่ Bin ที่เส้นทางหยิบใช้ กดแถวเพื่อดู Product ที่ใช้ Part นั้น",   // Counted once per round, at the bin the pick route uses. Click a row to see the Products.
  "m4.col.part": "Part",   // Part
  "m4.col.n": "ครั้ง",   // Times
  "m4.col.loc": "Location",   // Location
  "m4.col.floor": "ชั้น",   // Floor
  "m4.col.prods": "Product",   // Products
  "m4.det.products": "Product ที่ทำให้ต้องหยิบ {code}",   // Products that make {code} be picked
  "m4.det.noprod": "ไม่มี Product ที่ระยะทางเปลี่ยน",   // No Product changes distance.
  "m4.locs.title": "Location ที่ใช้บ่อย",   // Busiest locations
  "m4.locs.sub": "จำนวนครั้งที่หยิบต่อ Bin ในช่วงที่เลือก",   // Picks per bin in the period
  "m4.prods.title": "Product และรอบจัด Part",   // Products and their rounds
  "m4.prods.sub": "ระยะเข็นจำลองตามเส้นทางหยิบของแต่ละ Product",   // Simulated cart distance of each Product's pick route
  "m4.col.product": "Product",   // Product
  "m4.col.rounds": "รอบ",   // Rounds
  "m4.col.parts": "Part",   // Parts
  "m4.col.per": "ม./รอบ",   // m / round
  "m4.col.total": "รวม ม.",   // Total m
  "m4.col.date": "วันที่",   // Date
  "m4.col.bins": "Bin ใน Material–Location",   // Bins in Material–Location
  "m4.more": "แสดง {n} รายการแรกจาก {t}",   // Showing the first {n} of {t}.
  "m4.none": "ไม่พบรายการที่ตรงกัน",   // Nothing matches.
  "m4.bad.title": "ข้อมูลที่นำมาคำนวณไม่ได้",   // Data that could not be computed
  "m4.bad.sub": "ไม่ได้รวมในตัวเลขด้านบน พร้อมเหตุผล ไม่ได้แสดงเป็นศูนย์",   // Left out of the numbers above, with the reason. Not shown as zero.
  "m4.why.plant": "ไม่ทราบ Plant ของ JOB (ไม่มีในแผนรายเดือน และ Product อยู่ทั้ง 2 Plant)",   // Plant of the JOB unknown (JOB not in the monthly plan and the Product is in both Plants)
  "m4.why.nobom": "Product ไม่มีใน Product–BOM",   // Product not in the Product–BOM
  "m4.why.noparts": "BOM ของ Plant นั้นไม่มีรายการ Part",   // No Parts in the BOM of that Plant
  "m4.why.noloc": "ไม่มี Location (ไม่มีใน Material–Location)",   // Part has no location (not in Material–Location)
  "m4.why.notonlayout": "Location นี้ไม่มีบนผัง",   // Location is not on the layout
  "m4.why.special": "อยู่เฉพาะ Bin พิเศษ (PRINTER, NEW, AS CUT …) ไม่ใช่จุดเดินหยิบ",   // Only in special bins (PRINTER, NEW, AS CUT …), not a pick point
  "m4.loc.unreach": "ไม่มีทางเดินถึง",   // No aisle to it
  "m4.why.unreach": "Bin ไม่มีทางเดินรถเข็นติดในผัง (เช่น แถว K ด้านหลัง) จึงเดินไปหยิบไม่ได้",   // Bin has no cart aisle next to it on the layout (e.g. back row K), so it cannot be walked to
  "m4.loc.noloc": "ไม่มี Location",   // No location
  "m4.loc.notonlayout": "ไม่มีบนผัง",   // Not on layout
  "m4.loc.special": "Bin พิเศษ",   // Special bin
  "m4.recs.none": "ไม่พบคู่สลับที่ช่วยลดระยะเข็นในช่วงนี้",   // No swap shortens the walk in this period.
  "m4.recs.head": "พบ {n} คู่สลับ ช่วง {from}–{to} รวมลดระยะเข็นประมาณ {m} ม. (คิดทีละคู่)",   // {n} swaps found for {from}–{to}: together about {m} m less cart walking (each is counted on its own).
  "m4.recs.reason": "{a} ถูกหยิบ {na} ครั้ง แต่อยู่ไกล (เดิน START→DROP ประมาณ {ca} ม.) ส่วน {b} ถูกหยิบ {nb} ครั้ง แต่อยู่ใกล้ (ประมาณ {cb} ม.) สลับแล้ว Part ที่หยิบบ่อยจะอยู่ใกล้ขึ้น",   // {a} is picked {na} times and its bin is far (about {ca} m from START to DROP); {b} is picked {nb} times and sits close (about {cb} m). Swapping brings the busy Part near the door.
  "m4.recs.before_after": "ก่อน {b} ม. · หลัง {a} ม.",   // Before {b} m · after {a} m
  "m4.recs.prods": "Product หลัก:",   // Main Products:
  "m4.rule.ok": "ผ่านกติกา",   // Rules passed
  "m4.rule.fail": "ไม่ผ่านกติกา",   // Breaks a rule
  "m4.rule.a_noloc": "Part A ไม่มี Bin บนผัง",   // Part A has no bin on the layout
  "m4.rule.b_noloc": "Part B ไม่มี Bin บนผัง",   // Part B has no bin on the layout
  "m4.rule.part_locked": "Part {v} ถูกล็อก",   // Part {v} is locked
  "m4.rule.bin_locked": "Bin {v} ถูกล็อก",   // Bin {v} is locked
  "m4.rule.same_bin": "ทั้งสอง Part อยู่ Bin เดียวกัน",   // Both Parts are in the same bin
  "m4.btn.detail": "รายละเอียด",   // Details
  "m4.btn.hide": "ซ่อนรายละเอียด",   // Hide details
  "m4.btn.tosim": "ส่งไป Simulation",   // Try in Simulation
  "m4.btn.insim": "อยู่ใน Simulation แล้ว",   // In Simulation
  "m4.before": "ก่อน",   // Before
  "m4.after": "หลัง",   // After
  "m4.worse": "ไกลขึ้น",   // Longer after
  "m4.diff": "ส่วนต่าง",   // Difference
  "m4.sim.title": "ทดลองสลับก่อนย้ายจริง",   // Try swaps before moving anything
  "m4.sim.sub": "เพิ่มคู่จากคำแนะนำ หรือพิมพ์ Part 2 ตัว ตำแหน่งจริงไม่เปลี่ยน",   // Add pairs from the advice or type two Parts. The real locations do not change.
  "m4.sim.ph": "รหัส Part",   // Part code
  "m4.sim.add": "เพิ่มคู่",   // Add pair
  "m4.sim.del": "เอาออก",   // Remove
  "m4.sim.run": "จำลอง",   // Simulate
  "m4.sim.clear": "ล้างทั้งหมด",   // Clear all
  "m4.sim.empty": "ยังไม่มีคู่ที่จะทดลอง",   // No pairs yet.
  "m4.sim.err_pair": "เลือก Part 2 ตัวที่ไม่ซ้ำกัน",   // Choose two different Parts.
  "m4.sim.err_part": "ไม่พบ {code} ใน Material–Location",   // {code} is not in Material–Location.
  "m4.sim.err_twice": "Part หรือ Bin หนึ่งอยู่ได้คู่เดียว",   // A Part or a bin can be in one pair only.
  "m4.sim.result": "ผลการจำลอง",   // Simulation result
  "m4.sim.result_sub": "แผนชุดเดียวกัน ช่วงเดียวกัน ก่อนและหลังสลับ",   // Same plans, same period, before and after the swaps
  "m4.sim.worse": "Product ที่เดินไกลขึ้น",   // Products walking further
  "m4.sim.worse_sub": "ดูแถบสีแดงด้านล่าง",   // shown in red below
  "m4.map.product": "เส้นทางของ Product",   // Product route
  "m4.map.dist": "เส้นทาง {m} ม.",   // Route {m} m
  "m4.intro2": "ความถี่การหยิบตามแผนรายวัน ตำแหน่งที่รถเข็นหยิบ และคู่สลับ 1:1 ที่ช่วยลดระยะเข็นจำลอง ผลเป็นความถี่ตามแผน ไม่ใช่บันทึกการหยิบจริง",   // Planned pick frequency from the daily plans, where the cart picks it, and which 1:1 swaps shorten the simulated cart distance. Results are planned frequency, not picking records.
  "m4.f.product": "Product",   // Product
  "m4.f.product_ph": "ทุก Product (พิมพ์รหัสเพื่อจำกัดรอบ)",   // All Products (type a code to limit the rounds)
  "m4.f.clear": "ล้างตัวกรอง",   // Clear filters
  "m4.f.recalc": "คำนวณใหม่",   // Recalculate
  "m4.retry": "ลองใหม่",   // Try again
  "m4.scope.range": "ช่วง {from}–{to}",   // Range {from}–{to}
  "m4.scope.days": "มีแผน {n} จาก {of} วัน",   // {n} of {of} days have a plan
  "m4.scope.gap": "ไม่มีแผน: {list}",   // no plan: {list}
  "m4.scope.upto": "ข้อมูลถึงวันที่ {d}",   // data up to {d}
  "m4.scope.product": "เฉพาะ Product {p}",   // Product {p} only
  "m4.scope.note": "วิเคราะห์แผนย้อนหลังโดยใช้ตำแหน่งจัดเก็บปัจจุบัน ระยะเป็นเมตรจำลองตามผัง (ไม่คิดระยะลิฟต์) เวลาใน Simulation เป็นเวลาจำลองตามค่าเดียวกับหน้านำทาง",   // Past plans are analysed with today's storage locations. Distances are simulated metres along the layout (lift ride not counted). Times in Simulation are estimates with the Module 3 factors.
  "m4.scope.at": "คำนวณเมื่อ {t}",   // calculated at {t}
  "m4.scope.files": "ชุดข้อมูลที่ใช้",   // Data used
  "m4.scope.dailyf": "แผนรายวัน {d}",   // Daily plan {d}
  "m4.scope.monthlyf": "แผนรายเดือน",   // Monthly plan
  "m4.scope.layout": "ผังคลังที่ใช้งาน",   // Warehouse layout in use
  "m4.scope.rules": "กติกาการย้าย: {n} ข้อ",   // Relocation rules: {n}
  "m4.step.load": "กำลังเชื่อมข้อมูล…",   // Connecting the data…
  "m4.step.rounds": "กำลังสร้างรอบจัด Part…",   // Building pick rounds…
  "m4.step.route": "กำลังคำนวณเส้นทาง",   // Calculating routes
  "m4.step.recs": "กำลังทดลองคู่สลับ",   // Trying swap pairs
  "m4.step.sim": "กำลังจำลองการสลับ",   // Simulating the swap
  "m4.busy.old": "ผลด้านล่างเป็นผลเดิม กำลังคำนวณใหม่",   // the result below is from the previous calculation
  "m4.stale": "ข้อมูลต้นทางเปลี่ยนแล้ว กรุณาคำนวณใหม่ ผลด้านล่างล้าสมัย",   // The source data changed after this result was calculated. Recalculate before using it.
  "m4.err.run": "คำนวณไม่สำเร็จ: {e} ผลที่แสดงไม่ใช่ผลใหม่",   // The calculation failed: {e}. The result shown is not new.
  "m4.err.heatsum": "ต้องตรวจสอบ: ผลรวม Heatmap ({h}) ไม่เท่าความถี่ที่จัดเส้นทางได้ ({r})",   // Check needed: the heatmap total ({h}) differs from the routed frequency ({r}).
  "m4.err.freq": "ต้องตรวจสอบ: ความถี่รวมเปลี่ยนหลังสลับ",   // Check needed: the total frequency changed after the swap.
  "m4.empty.range": "ไม่มีแผนรายวันในช่วงวันที่เลือก",   // There are no daily plans in the chosen dates.
  "m4.empty.product": "Product นี้ไม่มีรอบในช่วงวันที่เลือก",   // This Product has no rounds in the chosen dates.
  "m4.k.rounds_sub": "วันที่ + U-line + JOB",   // date + U-line + JOB
  "m4.k.ident": "รอบที่ระบุ Product/BOM ได้",   // Rounds with Product and BOM
  "m4.k.of": "จาก {n} รอบ",   // of {n} rounds
  "m4.k.complete": "รอบที่จัดเส้นทางครบ",   // Rounds fully routed
  "m4.k.partial": "ไม่ครบรายการ {n} รอบ (ยังคิดระยะ ตัด Part ไม่มี Bin)",   // {n} rounds leave out Parts without a bin
  "m4.k.parts_sub": "BOM ชั้นแรก",   // first level of the BOM
  "m4.k.plan": "ความถี่ตามแผน",   // Planned picks
  "m4.k.plan_sub": "นับ 1 ครั้งต่อ Part ต่อรอบ",   // one per Part per round
  "m4.k.route": "ความถี่ที่จัดเส้นทางได้",   // Picks that can be routed
  "m4.k.route_sub": "{n} ครั้งไม่มีจุดหยิบที่เข้าถึงได้",   // {n} have no reachable pick point
  "m4.k.dist_sub": "เฉพาะรอบที่ครบ · เฉลี่ย {m} ม./รอบ",   // complete rounds only · {m} m per round
  "m4.k.issues": "รายการมีปัญหาข้อมูล",   // Data problems
  "m4.k.issues_sub": "ดูรายการด้านล่าง",   // see the list at the bottom
  "m4.h.title": "Heatmap ความถี่การหยิบ",   // Pick frequency heatmap
  "m4.h.sub": "ตัวเลขของช่อง = จำนวนครั้งที่ Part ถูกเลือกหยิบจากช่องนั้น (รวม {n} ครั้ง) ไม่ใช่จำนวนครั้งที่รถผ่านหรือจำนวนชิ้น",   // A rack's number is how often a Part was picked from it ({n} picks in all). It is not how often the cart passes or how many pieces.
  "m4.h.q": "ค้นหา Part หรือช่อง",   // Find a Part or bin
  "m4.h.zin": "ซูมเข้า",   // Zoom in
  "m4.h.zout": "ซูมออก",   // Zoom out
  "m4.h.fit": "พอดีจอ",   // Fit
  "m4.h.fs": "เต็มจอ",   // Full screen
  "m4.h.nodata": "ไม่มีข้อมูล",   // No data
  "m4.h.zero": "0 ครั้ง",   // 0 picks
  "m4.h.unit": "ครั้งในช่วงที่เลือก",   // picks in the range
  "m4.h.hint": "คลิกช่องบนผังเพื่อดู Part รหัส Bin เต็ม และชั้นเก็บ",   // Click a rack on the map to see its Parts, full bin codes and levels.
  "m4.h.rack": "ช่อง {r}",   // Rack {r}
  "m4.h.levels": "{n} ชั้นเก็บ",   // {n} levels
  "m4.h.times": "ครั้ง",   // picks
  "m4.h.prods": "Product:",   // Products:
  "m4.h.parts": "มีการหยิบ {n} Part",   // {n} Parts picked
  "m4.h.bin": "Bin",   // Bin
  "m4.h.prod": "Product",   // Product
  "m4.h.more": "+{n}",   // +{n}
  "m4.nc.why": "Part ทั้งสองไม่อยู่ใน {n} รอบที่นำมาคำนวณ เส้นทางจึงไม่เปลี่ยน แผนที่ด้านล่างแสดงตำแหน่งก่อนและหลังสลับเท่านั้น",   // Neither Part is in the {n} rounds used, so no route changes. The maps show only where the Parts sit before and after the swap.
  "m4.nc.why_p": "Part ทั้งสองไม่อยู่ใน {n} รอบของ Product {p} เส้นทางจึงไม่เปลี่ยน ล้างตัวกรอง Product เพื่อคำนวณทุกรอบ แผนที่ด้านล่างแสดงตำแหน่งก่อนและหลังสลับเท่านั้น",   // Neither Part is in the {n} rounds of Product {p}, so no route changes. Clear the Product filter to include every round. The maps show only where the Parts sit before and after the swap.
  "m4.nc.same": "การสลับนี้ไม่ทำให้ระยะทางของ Product ใดใน {n} รอบเปลี่ยน แผนที่ด้านล่างแสดงตำแหน่งก่อนและหลังสลับ",   // The swap does not change the route distance of any Product in the {n} rounds used. The maps show where the Parts sit before and after the swap.
  "m4.nc.title": "ตำแหน่งก่อนและหลังสลับ",   // Locations before and after the swap
  "m4.nc.inrounds": "หยิบ {n} ครั้งในรอบเหล่านี้",   // picked {n} times in these rounds
  "m4.nc.norounds": "ไม่อยู่ในรอบเหล่านี้",   // not in these rounds
  "m4.nc.now": "ตำแหน่งปัจจุบัน",   // current locations
  "m4.nc.swapped": "หลังสลับ",   // after swapping
  "m4.h.idle": "Part ในช่องนี้ที่ไม่ถูกหยิบ ({n})",   // Parts here with 0 picks ({n})
  "m4.h.empty": "ไม่มี Part ในช่องนี้ใน Material–Location",   // No Part is stored in this rack in Material–Location.
  "m4.level": "ชั้นเก็บ {n}",   // level {n}
  "m4.stock": "สต็อก {n}",   // stock {n}
  "m4.parts.sub2": "ตามแผน = จำนวนรอบที่มี Part · จัดเส้นทางได้ = รอบที่มีจุดหยิบที่เข้าถึงได้ · คลิกแถวเพื่อดู Product และ Bin",   // Planned = rounds that list the Part. Routed = rounds where it has a reachable pick point. Click a row for its Products and bins.
  "m4.q.part": "ค้นหา Part ด้วยรหัสหรือชื่อ",   // Find a Part by code or name
  "m4.q.note": "กรองเฉพาะตารางนี้ เส้นทางยังคิดครบทุก Part",   // only narrows this table; routes still use every Part
  "m4.sort": "เรียงตาม",   // Sort by
  "m4.col.plan": "ตามแผน",   // Planned
  "m4.col.route": "จัดเส้นทางได้",   // Routed
  "m4.col.chosen": "Location ที่ถูกเลือก",   // Bin used
  "m4.col.status": "สถานะ",   // Status
  "m4.col.complete": "รอบครบ",   // Complete
  "m4.col.file": "ไฟล์ต้นทาง",   // Source file
  "m4.col.change": "ลดลง/เพิ่มขึ้น",   // Change
  "m4.bins.n": "{n} Bin · บนผัง {on}",   // {n} bins · {on} on layout
  "m4.st.ok": "ปกติ",   // Normal
  "m4.act.map": "ดูบน Heatmap",   // On map
  "m4.act.sim": "จำลอง",   // Simulate
  "m4.act.part": "ดู Part",   // Part details
  "m4.act.recs": "ดูคำแนะนำ",   // Suggestions
  "m4.det.bins": "Bin ของ Part นี้",   // Bins of this Part
  "m4.det.chosen": "เส้นทางเลือก",   // used by the route
  "m4.binkind.special": "Bin พิเศษ",   // special bin
  "m4.binkind.norack": "ไม่มีบนผัง",   // not on the layout
  "m4.binkind.nolayout": "ไม่มีผัง",   // no layout
  "m4.more.btn": "แสดงเพิ่มอีก 60",   // Show 60 more
  "m4.none.q": "ไม่พบ Part ที่ค้นหา",   // No Part matches the search.
  "m4.prods.sub2": "ระยะจำลองของรอบที่ครบ คลิก Product เพื่อดู Part และเส้นทางตัวอย่าง",   // Simulated metres of complete rounds. Click a Product to see its Parts and a sample route.
  "m4.close": "ปิด",   // Close
  "m4.pv.title": "Product {p}",   // Product {p}
  "m4.pv.rounds": "รอบในช่วงที่เลือก",   // Rounds in range
  "m4.pv.parts": "Part ชั้นแรก",   // Parts (first level)
  "m4.pv.off": "จัดเส้นทางไม่ได้ {n}",   // {n} cannot be routed
  "m4.pv.per": "ระยะต่อรอบ",   // Distance per round
  "m4.pv.per_sub": "รอบที่ครบ",   // complete rounds
  "m4.pv.total": "ระยะรวม",   // Total distance
  "m4.pv.total_sub": "{n} รอบในช่วงที่เลือก",   // {n} rounds in the range
  "m4.pv.round": "รอบตัวอย่าง",   // Sample round
  "m4.pv.route": "เส้นทางรอบนี้ {m} ม.",   // Route of this round: {m} m
  "m4.partial_route": "เส้นทางไม่ครบรายการ",   // route does not include every Part
  "m4.bad.sub2": "ไม่ได้รวมในตัวเลขด้านบน พร้อมเหตุผล เปิดแต่ละกลุ่มเพื่อดู JOB, Product, Part และไฟล์ต้นทาง",   // Kept out of the numbers above, with the reason. Open a group to see the JOB, Product, Part and source file.
  "m4.iss.nojob": "แถวในแผนที่ไม่มี JOB (ข้อมูลไม่ครบ)",   // Plan rows without a JOB
  "m4.iss.noproduct": "ไม่พบข้อมูลเชื่อม Order–Product",   // Plan rows without a Product (no Order–Product link)
  "m4.iss.plant": "ข้อมูล Order เชื่อมได้หลายรายการ กรุณาตรวจสอบ",   // Order links to more than one Plant; please check
  "m4.iss.nobom": "ไม่พบรายการ Part ของ Product (ไม่มี BOM)",   // No BOM for the Product
  "m4.iss.noparts": "ไม่พบรายการ Part ของ Product ใน Plant นี้",   // BOM has no Parts for this Plant
  "m4.iss.loc_noloc": "ไม่มี Location",   // No location (not in Material–Location)
  "m4.iss.loc_notonlayout": "Location นี้ไม่มีบนผัง",   // Location is not on the layout
  "m4.iss.loc_unreach": "ไม่พบเส้นทางรถเข็นเข้าถึง Location",   // No cart route reaches the location
  "m4.iss.loc_special": "ตำแหน่งพักในระบบ ไม่ใช้เป็นจุดหยิบ",   // Holding bin in the system, not a pick point
  "m4.row": "แถว {n}",   // row {n}
  "m4.rule.nosize": "ยังไม่ตรวจขนาด/น้ำหนัก (ไม่มีข้อมูล)",   // size and weight not checked yet (no data)
  "m4.recs.scope": "ประเมินจากรอบที่จัดเส้นทางครบ {c} จาก {n} รอบ (ตัดรอบไม่ครบ {x} รอบ)",   // Measured on {c} fully routed rounds of {n} ({x} incomplete rounds left out).
  "m4.recs.only": "ผลเฉพาะ Product {p} ไม่ใช่ผลรวมของคลัง",   // Result for Product {p} only, not the whole warehouse.
  "m4.recs.all": "ทุก Product ในช่วงที่เลือก",   // All Products in the range.
  "m4.recs.head2": "พบ {n} คู่ที่ผ่านกติกา รวมลดระยะประมาณ {m} ม. (คิดทีละคู่)",   // {n} swaps that pass the rules, together about {m} m shorter (each counted alone).
  "m4.recs.reason2": "{a} ถูกหยิบ {na} ครั้ง (ส่วนใหญ่ใช้กับ {prods}) แต่อยู่ไกล (ประมาณ {ca} ม. START→DROP) ส่วน {b} ถูกหยิบ {nb} ครั้งและอยู่ใกล้ (ประมาณ {cb} ม.)",   // {a} is picked {na} times (mostly for {prods}) but is far away (about {ca} m START→DROP). {b} is picked {nb} times and is close (about {cb} m).
  "m4.recs.used": "รอบที่ใช้",   // Rounds used
  "m4.recs.used_v": "ใช้ {u} รอบ · ตัดออก {x} รอบ",   // {u} used · {x} left out
  "m4.recs.better": "Product ที่ระยะลดลง ({n})",   // Products with shorter routes ({n})
  "m4.recs.worse": "Product ที่ระยะเพิ่มขึ้น ({n})",   // Products with longer routes ({n})
  "m4.andmore": "และอีก {n}",   // and {n} more
  "m4.btn.tosim2": "เปิดใน Simulation",   // Open in Simulation
  "m4.btn.opensim": "เปิดใน Simulation",   // Open in Simulation
  "m4.norec.title": "ยังไม่มีคู่สลับที่แนะนำ",   // No swap to suggest
  "m4.norec.nocomplete": "ไม่มีรอบที่จัดเส้นทางครบในช่วงที่เลือก จึงประเมินระยะไม่ได้",   // No round in the range is fully routed, so savings cannot be measured.
  "m4.norec.nocand": "ข้อมูลไม่พอประเมิน (ไม่พบ Part ที่ถูกหยิบบ่อยแต่อยู่ไกล คู่กับ Part ที่หยิบน้อยแต่อยู่ใกล้)",   // Not enough data to look for pairs (no busy Part far away with a quiet Part close by).
  "m4.norec.rules": "คู่ที่พบทั้ง {c} คู่ไม่ผ่านกติกาการย้าย",   // All {c} possible pairs break a relocation rule.
  "m4.norec.nogain": "ทดลอง {n} คู่ ไม่พบคู่ที่ช่วยลดระยะทาง",   // {n} pairs were tried, none makes the routes shorter.
  "m4.norec.data": "ยังไม่มีผังคลัง จึงคำนวณระยะไม่ได้",   // The layout is missing, so distances cannot be calculated.
  "m4.cmp.title": "ก่อน–หลัง แยกตาม Product",   // Before and after, per Product
  "m4.unit": "ม.",   // m
  "m4.same": "เท่าเดิม",   // no change
  "m4.down": "ลดลง {m} ม.",   // {m} m shorter
  "m4.up": "เพิ่มขึ้น {m} ม.",   // {m} m longer
  "m4.map.scope": "แผนที่แสดงเส้นทาง 1 รอบของ Product ที่เลือก ส่วนตัวเลขด้านบนรวมทุก Product",   // The map shows one round of the chosen Product; the numbers above add up every Product.
  "m4.map.dist2": "{p}: {m} ม./รอบ",   // {p}: {m} m per round
  "m4.map.aria": "แผนที่เส้นทาง",   // Route map
  "m4.sim.sub2": "เลือก Part A กับช่องที่ย้ายออก และ Part B กับช่องของมัน ย้ายเฉพาะสองรายการนี้ Part อื่นในช่องและ Location อื่นของ A/B คงเดิม ไม่แก้ตำแหน่งจริง",   // Choose Part A and the bin it leaves, and Part B and its bin. Only these two move; other Parts in the bins and other bins of A and B stay. Real locations are never changed.
  "m4.sim.bin": "Location",   // Bin
  "m4.sim.pickfirst": "เลือก Part ก่อน",   // Choose the Part first
  "m4.sim.nobin": "ไม่มี Bin บนผัง",   // No bin on the layout
  "m4.sim.used": "ใช้อยู่",   // used now
  "m4.sim.err_bin": "เลือก Location ของทั้งสอง Part",   // Choose a bin for both Parts.
  "m4.sim.run2": "จำลองการสลับ",   // Simulate the swap
  "m4.sim.reset": "คืนค่าการทดลอง",   // Reset the trial
  "m4.sim.blocked": "มีคู่ที่ไม่ผ่านกติกา เอาออกก่อนจึงจำลองได้",   // A pair breaks a rule; remove it to simulate.
  "m4.sim.result_sub2": "ใช้รอบและข้อมูลชุดเดียวกันทั้งก่อน–หลัง: {u} รอบ (ตัดออก {x} รอบที่ระบุ Part ไม่ได้)",   // Same rounds and data before and after: {u} rounds ({x} left out because their Parts are not known).
  "m4.k.down": "ระยะที่ลดลง",   // Shorter by
  "m4.k.up": "ระยะที่เพิ่มขึ้น",   // Longer by
  "m4.k.used": "รอบที่นำมาคำนวณ",   // Rounds calculated
  "m4.k.out": "ตัดออก {n} รอบ",   // {n} left out
  "m4.k.affected": "Product ที่ได้รับผลกระทบ",   // Products affected
  "m4.k.updown": "ลดลง {a} · เพิ่มขึ้น {b}",   // {a} shorter · {b} longer
  "m4.sim.lost": "หลังสลับมี {n} รอบที่จัดเส้นทางไม่ครบ ตรวจสอบก่อนย้าย",   // {n} rounds could not be fully routed after the swap; check them before moving.
  "m4.sim.byprod": "ผลแยกตาม Product",   // Result per Product
  "m4.sim.route": "เส้นทางของ {p}",   // Route of {p}
  "m4.sim.nochange": "ไม่มี Product ใดที่เส้นทางเปลี่ยน",   // No Product route changes with these swaps.
  "m4.sim.heat": "Heatmap ก่อน–หลัง",   // Heatmap before and after
  "m4.sim.heat_sub": "ใช้เกณฑ์สีเดียวกัน ความถี่รวมก่อน {b} หลัง {a} สิ่งที่เปลี่ยนคือตำแหน่งที่หยิบ",   // Same colour scale on both. Total picks before {b}, after {a}: only where they are picked changes.
  "m4.h.fsexit": "ออกจากเต็มจอ",   // Exit full screen
  "m4.h.unit2": "ครั้งในช่วงที่เลือก สีเข้มสุด = ช่องที่หยิบมากสุด ({n} ครั้ง) ช่วงสีปรับตามข้อมูลจริง",   // picks in the chosen range; the darkest colour is the busiest rack ({n})
  "m4.prods.title2": "Product ในแผน",   // Products in the plan
  "m4.prods.sub3": "ทุก Product ในแผนช่วงที่เลือก · JOB = จำนวนรอบในช่วงนี้ · หาตำแหน่งได้ = Part ที่มีจุดหยิบที่รถเข็นเข้าถึง · ระยะต่อรอบแสดงเมื่อหาตำแหน่งได้ครบทุก Part",   // Every Product in the plans of the range. JOB = rounds in the range. Found = Parts with a pick point the cart can reach. Distance per round is shown only when every Part can be found.
  "m4.col.found": "หาตำแหน่งได้",   // Found
  "m4.ps.ok": "ครบ",   // Complete
  "m4.ps.partial": "Part ขาดตำแหน่ง {n}",   // {n} Parts without a pick point
  "m4.ps.partial0": "Part ขาดตำแหน่ง",   // Part missing a location
  "m4.ps.plant": "ไม่รู้ Plant",   // Plant unknown
  "m4.ps.nobom": "ไม่มี BOM",   // No BOM
  "m4.ps.choose": "เลือก Plant",   // Choose Plant
  "m4.ps.own": "เลือกเอง",   // chosen here
  "m4.simtime": "เวลาจำลอง",   // Simulated time
  "m4.tdown": "เร็วขึ้น {n} นาที",   // {n} min less
  "m4.tup": "ช้าลง {n} นาที",   // {n} min more
  "m4.rp.title": "เส้นทางก่อน–หลัง",   // Route before and after
  "m4.rp.note": "เส้นทาง 1 รอบของ Product นี้ (ทุก JOB ของ Product เดียวกันใช้เส้นทางเดียวกัน) มี {n} รอบในช่วงที่เลือก",   // One round of this Product (every JOB of it uses the same route); {n} rounds in the range.
  "m4.rp.order": "ลำดับหยิบก่อน–หลัง",   // Pick order before and after
  "m4.rp.seq_b": "ลำดับก่อน",   // Before #
  "m4.rp.bin_b": "Bin ก่อน",   // Bin before
  "m4.rp.seq_a": "ลำดับหลัง",   // After #
  "m4.rp.bin_a": "Bin หลัง",   // Bin after
  "m4.rp.swapped": "Part {t} ที่สลับ",   // swapped Part {t}
  "m4.rp.moved": "Bin เปลี่ยน",   // bin changed
  "m4.rp.reorder": "ลำดับเปลี่ยน",   // order changed
  "m4.k.dist_sub2": "ทุกรอบที่ระบุ Part ได้ · เฉลี่ย {m} ม./รอบ · {n} รอบเส้นทางไม่ครบรายการ (ตัด Part ที่ไม่มี Bin)",   // all rounds with known Parts · {m} m per round · {n} rounds leave out Parts without a bin
  "m4.prods.sub4": "ระยะทาง = เส้นทางจำลอง 1 รอบจาก START ถึง DROP คิดเฉพาะ Part ที่มี Bin บนผัง (โมดูล 2) · คลิก Product เพื่อดู Part และเส้นทาง",   // Distance is the simulated route of one round from START to DROP, using only Parts with a bin on the layout (Module 2). Click a Product to see its Parts and route.
  "m4.col.jobs": "จำนวน JOB",   // JOBs
  "m4.col.dist": "ระยะทาง",   // Distance
  "m4.pt.per": "ต่อรอบ",   // per round
  "m4.pt.total": "รวม {m} ม. ({n} รอบ)",   // {m} m in all ({n} rounds)
  "m4.pt.skip": "ไม่รวม {n} จาก {of} Part ที่ไม่มี Bin",   // {n} of {of} Parts have no bin and are left out
  "m4.pt.chooseplant": "เลือก Plant ด้านบนก่อน",   // choose the Plant above
  "m4.pt.nobin": "ไม่มี Part ใดมี Bin บนผัง",   // no Part has a bin on the layout
  "m4.pt.jobs": "{n} JOB",   // {n} JOB
  "m4.pp.title": "เลือก Plant ให้ {n} Product ก่อนคำนวณ",   // Choose the Plant for {n} Products first
  "m4.pp.sub": "Product เหล่านี้มี BOM มากกว่า 1 Plant และ JOB ไม่อยู่ในแผนรายเดือน ระบบจึงไม่รู้ว่าใช้ BOM ไหน ยังไม่ถูกนับในตัวเลขจนกว่าจะเลือก Plant · ค่าที่เลือกใช้เฉพาะการคำนวณครั้งนี้",   // These Products have a BOM in more than one Plant and their JOB is not in the monthly plan, so the system cannot tell which BOM to use. They are not in the numbers until a Plant is chosen. The choice is used for this calculation only.
  "m4.pp.all": "ใช้ Plant เดียวกันทั้งหมด:",   // Same Plant for all:
  "m4.pp.use": "ใช้ {p}",   // Use {p}
  "m4.pp.each": "เลือกทีละ Product ({n})",   // Choose for each Product ({n})
  "m4.pp.apply": "คำนวณด้วย Plant ที่เลือก ({n}/{of})",   // Calculate with the chosen Plants ({n}/{of})
  "m4.pv.per_sub2": "ทุก Part มี Bin",   // every Part has a bin
  "m4.recs.scope2": "ประเมินจาก {c} จาก {n} รอบ (ในนั้น {p} รอบตัด Part ที่ไม่มี Bin ออก · {x} รอบระบุ Part ไม่ได้)",   // Measured on {c} of {n} rounds ({p} of them leave out Parts without a bin; {x} rounds have no known Parts).
  "m4.sim.ph2": "พิมพ์บางส่วนของรหัสหรือชื่อ เช่น 11236",   // Type any part of the code or name
  "m4.sim.nohit": "ไม่พบ Part ที่มี Location ตรงกับคำค้น",   // No Part with a location matches
  "m4.k.rounds_sub2": "{j} JOB · {p} Product",   // {j} JOB · {p} Products
  "m4.k.parts_sub2": "มี Bin บนผัง {a} · ไม่มี {b}",   // with a bin on the layout {a} · without {b}
  "m4.k.dist_sub3": "เฉลี่ย {m} ม./รอบ · เวลาจำลองรวม {h}",   // {m} m per round · simulated time {h}
  "m4.hm": "{h} ชม. {m} นาที",   // {h} h {m} min
  "m4.issshort.nojob": "ไม่มี JOB",   // no JOB
  "m4.issshort.noproduct": "ไม่มี Product",   // no Product
  "m4.issshort.plant": "ไม่รู้ Plant",   // Plant unknown
  "m4.issshort.nobom": "ไม่มี BOM",   // no BOM
  "m4.issshort.noparts": "ไม่มี Part",   // no Parts
  "m4.issshort.loc_noloc": "ไม่มี Location",   // no location
  "m4.issshort.loc_notonlayout": "ไม่มีบนผัง",   // not on layout
  "m4.issshort.loc_unreach": "เข้าถึงไม่ได้",   // no aisle
  "m4.issshort.loc_special": "Bin พิเศษ",   // special bin
  "m4.h.sub2": "ตัวเลข = จำนวนครั้งที่หยิบจากช่องนั้น · รวม {n} ครั้ง · หยิบไม่ได้ {x} ครั้ง",   // Number = picks from that rack · {n} picks in all · {x} picks have no pick point on the layout
  "m4.pv.order": "ลำดับหยิบ",   // Pick order
  "m4.recs.simall": "จำลองทุกคู่พร้อมกัน ({n} คู่)",   // Simulate all {n} pairs together
  "m4.rc.a": "Part A / ช่อง X",   // Part A / bin X
  "m4.rc.b": "Part B / ช่อง Y",   // Part B / bin Y
  "m4.rc.save": "ลดลง",   // Shorter by
  "m4.rc.time": "เวลาจำลอง",   // Simulated time
  "m4.rc.rule": "กติกา",   // Rules
  "m4.rc.note": "คิดผลทีละคู่ · คลิกแถวเพื่อดูผลราย Product ก่อน–หลัง (ระยะ · % · เวลาจำลอง) และเส้นทาง · ยังไม่ตรวจขนาด/น้ำหนัก (ไม่มีข้อมูล)",   // Each pair is counted alone. Click a row to see each Product before and after (distance, %, simulated time) and the routes. Size and weight are not checked yet (no data).
  "m4.pp.title2": "เปลี่ยน Plant ของ {n} Product",   // Change the Plant of {n} Products
  "m4.pp.sub2": "Product เหล่านี้มี BOM มากกว่า 1 Plant และ JOB ไม่อยู่ในแผนรายเดือน ผลจะแสดงเมื่อเลือก Plant ครบทุกตัว · ค่าที่เลือกจำไว้ระหว่างเปิดหน้านี้",   // These Products have a BOM in more than one Plant and their JOB is not in the monthly plan. The results appear once every Product has a Plant. The choice is kept while this page is open.
  "m4.pp.need": "ต้องเลือกให้ครบทุก Product",   // choose a Plant for every Product
  "m4.pp.change": "เปลี่ยน Plant ({n})",   // Change Plant ({n})
  "m4.rc.affect": "มีผลต่อ {n} Product",   // affects {n} Products
  "m4.rc.effect": "ผลกระทบ",   // Effect
  "m4.rc.detail": "คู่ที่ {n}: {a} ⇄ {b}",   // Pair {n}: {a} ⇄ {b}
  "m4.cmp.byprod": "ผลราย Product",   // Result per Product
  "m4.cmp.total": "รวมทุก Product",   // All Products
  "m4.cmp.click": "คลิก Product เพื่อดูเส้นทางก่อน–หลังด้านล่าง",   // Click a Product to see its route before and after below.
  "m4.rp.base": "ตำแหน่งปัจจุบัน",   // current layout
  "m5.intro": "กติกาที่ใช้ตรวจทุกการสลับ Part และ Bin ที่ล็อกจะไม่ถูกเสนอและสลับไม่ได้",   // Rules every swap is checked against. Locked Parts and bins are never suggested or swapped.
  "m5.rules.title": "กติกาที่ใช้",   // Rules in use
  "m5.rules.sub": "ตามที่ตกลงกับคลัง",   // Agreed with the warehouse
  "m5.rule.swap": "สลับแบบ 1:1: Part A ไปอยู่ Bin ของ B และ Part B ไปอยู่ Bin ของ A ส่วน Part อื่นในช่องเดิมไม่ย้าย",   // Swaps are 1:1: Part A goes to B's bin and Part B to A's bin; other Parts in those bins stay.
  "m5.rule.floor": "สลับข้ามชั้นได้",   // Swaps may cross floors.
  "m5.rule.special": "Bin พิเศษ (PRINTER, NEW, AS CUT …) ไม่ใช่จุดหยิบ และไม่นำมาสลับ",   // Special bins (PRINTER, NEW, AS CUT …) are not pick points and are never used.
  "m5.rule.lock": "Part และ Bin ที่ล็อกไว้ด้านล่างจะอยู่ที่เดิม",   // Locked Parts and bins below are left where they are.
  "m5.rule.sim": "Simulation ไม่เปลี่ยนตำแหน่งจริง ผู้ดูแลคลังตัดสินใจก่อนย้าย",   // Simulation never changes the real locations; the warehouse decides before moving.
  "m5.lock.title": "ห้ามย้าย",   // Do not move
  "m5.lock.sub": "ล็อก Part, Bin (เช่น 1G-01-02) หรือทั้งช่อง (เช่น 1G-01)",   // Lock a Part, a bin (e.g. 1G-01-02) or a whole rack (e.g. 1G-01).
  "m5.type.part": "Part",   // Part
  "m5.type.bin": "Bin / ช่อง",   // Bin / rack
  "m5.code.part": "รหัส Part",   // Part code
  "m5.code.bin": "Bin หรือช่อง",   // Bin or rack
  "m5.ph.part": "เช่น 5232QXXXX08122",   // e.g. 5232QXXXX08122
  "m5.ph.bin": "เช่น 1G-01 หรือ 1G-01-02",   // e.g. 1G-01 or 1G-01-02
  "m5.reason": "เหตุผล",   // Reason
  "m5.ph.reason": "เช่น ชิ้นใหญ่ ไม่มีที่อื่นวางได้",   // e.g. large Part, no other place fits
  "m5.lock": "ล็อก",   // Lock
  "m5.unlock": "ปลดล็อก",   // Unlock
  "m5.unlock.confirm": "กดอีกครั้งเพื่อปลดล็อก",   // Click again to unlock
  "m5.col.type": "ประเภท",   // Type
  "m5.col.code": "รหัส",   // Code
  "m5.col.by": "ตั้งโดย",   // Set by
  "m5.none": "ยังไม่มีกติกา เลือกประเภทกติกาด้านบนเพื่อเพิ่มข้อแรก",   // No rules yet. Pick a rule type above to add the first one.
  "m5.err.unknown": "ไม่พบ {code} ในข้อมูลที่ใช้งาน",   // {code} is not in the data in use.
  "m5.err.dup": "{code} ถูกล็อกอยู่แล้ว",   // {code} is already locked.
  "m5.ok.locked": "ล็อก {code} แล้ว",   // {code} locked.
  "m5.ok.unlocked": "ปลดล็อก {code} แล้ว",   // {code} unlocked.
  "m5.log.title": "ประวัติ",   // History
  "m5.log.n": "{n} รายการ",   // {n} changes
  "m5.act.lock": "ห้ามย้ายเลย",   // Never moves
  "m5.act.unlock": "ปลดล็อก",   // Unlocked
  "m5.who.local": "เครื่องนี้",   // this computer
  "m5.k.pick": "ประเภทกติกา",   // Rule type
  "m5.k.lock": "Part ห้ามย้าย",   // Part never moves
  "m5.k.lock.ex": "เช่น Part ชิ้นใหญ่ หนัก หรือมีที่วางเฉพาะ",   // e.g. large or heavy Parts with a fixed place
  "m5.k.area": "พื้นที่ห้ามแตะ",   // Area off-limits
  "m5.k.area.ex": "เช่น ห้ามย้ายของออกจากชั้น 2",   // e.g. nothing leaves floor 2
  "m5.k.keep": "Part ต้องอยู่ในพื้นที่",   // Part stays in an area
  "m5.k.keep.ex": "เช่น ของหนักต้องอยู่แถวล่างชั้น 1 เท่านั้น",   // e.g. heavy Parts only in the lower rows of floor 1
  "m5.new.sub2": "เลือกประเภทกติกาเพื่อเริ่ม แต่ละกติกาอ่านได้เป็นประโยคเดียว",   // Pick a rule type to start. Each rule reads as one sentence.
  "m5.ph.part2": "พิมพ์บางส่วนของรหัสหรือชื่อ แล้วเลือกจากรายการ",   // Type part of a code or name, then pick from the list
  "m5.step.dir": "ห้ามอะไร",   // What may not happen
  "m5.dir.out": "ห้ามย้ายออก",   // Nothing moves out
  "m5.dir.in": "ห้ามย้ายเข้า",   // Nothing moves in
  "m5.dir.both": "ห้ามทั้งเข้าและออก",   // Neither in nor out
  "m5.step.area": "พื้นที่ — คลิกแถวบนแผนที่",   // Area — click rows on the map
  "m5.step.keeparea": "พื้นที่ที่ Part ต้องอยู่ — คลิกแถวบนแผนที่",   // Where these Parts must stay — click rows on the map
  "m5.map.hint": "คลิกช่องใดก็ได้เพื่อเลือกทั้งแถว คลิกซ้ำเพื่อเอาออก ชี้ที่ช่องเพื่อดูชื่อ",   // Click any rack to select its whole row; click again to remove it. Hover a rack to see its name.
  "m5.map.whole": "เลือกทั้ง{f}",   // Select all of {f}
  "m5.map.unwhole": "ยกเลิกทั้ง{f}",   // Remove all of {f}
  "m5.map.clear": "ล้างที่เลือก",   // Clear selection
  "m5.map.aria": "แผนที่คลังสำหรับเลือกแถว",   // Warehouse map for picking rows
  "m5.leg.area": "ที่เลือก (ห้ามแตะ)",   // Selected (off-limits)
  "m5.leg.keep": "ที่เลือก (อยู่ได้)",   // Selected (allowed)
  "m5.leg.off": "ไม่ได้เลือก",   // Not selected
  "m5.a.picked": "ที่เลือก:",   // Selected:
  "m5.a.none": "ยังไม่ได้เลือก",   // Nothing selected yet
  "m5.a.wholefloor": "ทั้ง{f}",   // All of {f}
  "m5.a.rows": "แถว {v}",   // rows {v}
  "m5.a.bins": "Bin {v}",   // bins {v}
  "m5.a.more": "และอีก {n} รายการ",   // and {n} more
  "m5.reason2": "เหตุผล (ไม่บังคับ)",   // Reason (optional)
  "m5.err.area": "เลือกแถวหรือชั้นบนแผนที่อย่างน้อย 1 รายการ",   // Select at least one row or floor on the map
  "m5.nolayout": "ยังไม่มีผังคลัง อัปโหลดผังในโมดูล 2 ก่อน",   // No warehouse layout yet. Upload the layout in Module 2 first.
  "m5.col.rule": "กติกา",   // Rule
  "m5.conv": "แปลงจากกติกาเดิม — โปรดตรวจ",   // Converted from an old rule — please check
  "m5.conv.was": "เดิม: {n}",   // Was: {n}
  "m5.dropped": "กติกาเดิมเหล่านี้แปลงเป็นแบบใหม่ไม่ได้ จึงถูกนำออก: {n} ถ้ายังต้องใช้ให้สร้างใหม่",   // These old rules could not be converted to the new types and were removed: {n}. Create them again if still needed.
  "m5.same.title": "ห้ามย้ายข้ามชั้น (ทุก Part)",   // No swaps across floors (all Parts)
  "m5.same.on": "เปิด: โมดูล 4 แนะนำเฉพาะการสลับภายในชั้นเดียวกัน",   // On: Module 4 suggests only swaps within one floor
  "m5.same.off": "ปิด: สลับข้ามชั้นได้",   // Off: swaps may cross floors
  "m5.s.lock": "{who} ห้ามย้าย",   // {who} never moves
  "m5.s.area.out": "{a} ห้ามย้ายของออก",   // {a}: nothing moves out
  "m5.s.area.in": "{a} ห้ามย้ายของเข้า",   // {a}: nothing moves in
  "m5.s.area.both": "{a} ห้ามย้ายเข้าและออก",   // {a}: nothing moves in or out
  "m5.s.keep": "{who} ต้องอยู่ใน {a} เท่านั้น",   // {who} must stay in {a} only
  "m5.why.areaout": "{p}: ต้นทางเป็นพื้นที่ห้ามแตะ — {rule}",   // {p}: its place is off-limits — {rule}
  "m5.why.areain": "{p}: ปลายทางเป็นพื้นที่ห้ามแตะ — {rule}",   // {p}: destination is off-limits — {rule}
  "m5.why.keep": "{p}: ปลายทางอยู่นอกที่ที่กำหนด — {rule}",   // {p}: destination is outside its allowed place — {rule}
  "m5.why.crossfloor": "การสลับนี้ข้ามชั้น (เปิดสวิตช์ \"ห้ามย้ายข้ามชั้น\" อยู่)",   // The swap crosses floors (switch "No swaps across floors" is on)
  "m5.act.convert": "แปลงเป็นกติกาแบบใหม่",   // Converted to the new rule types
  "m5.act.same_on": "เปิด",   // Switched on
  "m5.act.same_off": "ปิด",   // Switched off
  "m4.recs.fixchip": "แก้ Part ที่อยู่ผิดกติกา",   // Fixes a misplaced Part
  "m4.recs.misplaced": "มี {n} Part ที่เก็บอยู่ในที่ที่กติกาโมดูล 5 ห้าม คำแนะนำ {f} คู่ด้านล่างย้ายไปที่ที่ผ่านกติกา (แสดงก่อน)",   // {n} Parts are stored where a Module 5 rule says they may not be. {f} suggestions below move them to a place that passes (listed first).
  "m4.recs.reasonfix": "{a} เก็บอยู่ผิดกติกา “{why}” สลับกับ {b} แล้วจะอยู่ในที่ที่ผ่านทุกกติกา",   // {a} is stored against the rule “{why}”. Swapping with {b} puts it in a place that passes every rule.
  "m5.intro3": "กำหนดว่า Part หรือประเภทของแต่ละแบบไปที่ไหนได้หรือไม่ได้ คำแนะนำและ Simulation ในโมดูล 4 ใช้เฉพาะคู่ที่ผ่านทุกกติกาในหน้านี้",   // Set where each Part or item type may and may not go. Module 4 suggests and simulates only swaps that pass every rule here.
  "m5.new.sub3": "กติกาคือประโยคเดียว: ใคร → ทำอะไร → ที่ไหน",   // A rule is one sentence: who → what → where.
  "m5.slot.who": "ใคร",   // Who
  "m5.slot.act": "ทำอะไร",   // What
  "m5.slot.where": "ที่ไหน — คลิกบนแผนที่",   // Where — click on the map
  "m5.wk.part": "Part",   // Part
  "m5.wk.type": "ประเภท",   // Item type
  "m5.wk.all": "ทุก Part",   // All Parts
  "m5.wk.all.sub": "ใช้กับทุก Part ไม่ว่าเป็นประเภทใด",   // Applies to every Part, whatever its type.
  "m5.act.keep": "ต้องอยู่ที่นี่เท่านั้น",   // Must stay here only
  "m5.act.keep.sub": "ย้ายได้เฉพาะเข้าที่ที่เลือก",   // Moves only into the selected places
  "m5.act.deny": "ห้ามย้ายไปที่นี่",   // May not move here
  "m5.act.deny.sub": "ที่ที่เลือกเป็นที่ห้ามเข้า",   // The selected places are off-limits
  "m5.act.out": "ห้ามย้ายออกจากที่นี่",   // May not move out of here
  "m5.act.out.sub": "ของที่เก็บอยู่ที่นี่ต้องอยู่ที่เดิม",   // What is stored here stays
  "m5.act.lock.sub": "อยู่ที่เดิมเสมอ ไม่ต้องเลือกพื้นที่",   // Stays wherever it is now
  "m5.pm.rack": "ช่องเก็บ",   // Bin / rack
  "m5.pm.row": "แถวแร็ค",   // Rack row
  "m5.pm.floor": "ชั้นอาคาร",   // Building floor
  "m5.map.hint.rack": "คลิกช่องเพื่อเลือก ถ้าต้องการเฉพาะบางชั้นเก็บ เลือกใต้แผนที่",   // Click a rack to select it; to narrow it to some levels, pick them below the map.
  "m5.map.hint.row": "คลิกช่องใดก็ได้เพื่อเลือกทั้งแถว (โซน) คลิกซ้ำเพื่อเอาออก",   // Click any rack to select its whole row (zone); click again to remove it.
  "m5.map.hint.floor": "คลิกช่องใดก็ได้ หรือกดปุ่ม เพื่อเลือกทั้งชั้น",   // Click any rack, or the button, to select the whole floor.
  "m5.leg.deny": "ที่เลือก (ห้ามเข้า)",   // Selected (off-limits)
  "m5.leg.out": "ที่เลือก (ห้ามออก)",   // Selected (nothing leaves)
  "m5.leg.lock": "ที่เลือก",   // Selected
  "m5.a.zone": "โซน",   // zone
  "m5.a.alllv": "ทุกชั้นเก็บ",   // all levels
  "m5.a.racks": "ช่อง {v}",   // racks {v}
  "m5.lv": "ชั้นเก็บ {n}",   // Level {n}
  "m5.lv.all": "ทุกชั้นเก็บ",   // All levels
  "m5.lv.sub": "เลือกเฉพาะบางชั้นเก็บได้",   // narrow to some storage levels
  "m5.err.types": "เลือกประเภทอย่างน้อย 1 รายการ",   // Pick at least one item type
  "m5.err.lockall": "\"ห้ามย้ายเลย\" ใช้กับทุก Part ไม่ได้",   // "Never moves" cannot apply to all Parts
  "m5.w.all": "ทุก Part",   // All Parts
  "m5.w.part": "Part {v}",   // Part {v}
  "m5.w.type": "ประเภท {v}",   // Type {v}
  "m5.s.deny": "{who} ห้ามย้ายไป {a}",   // {who} may not move into {a}
  "m5.s.out": "{who} ห้ามย้ายออกจาก {a}",   // {who} may not move out of {a}
  "m5.why.out": "{p}: ต้นทางห้ามย้ายออก — {rule}",   // {p}: its place is locked — {rule}
  "m5.why.type": "คนละประเภท ({a} ↔ {b}) และเปิดสวิตช์ \"สลับเฉพาะประเภทเดียวกัน\"",   // Different item types ({a} ↔ {b}) and "Swap only the same type" is on
  "m5.list.sub2": "กติกาที่พักไว้ยังอยู่แต่ไม่ถูกใช้ กติกาของ Part รายตัวชนะกติกาของประเภท",   // Paused rules are kept but not used. A Part's own rule beats its type's rule.
  "m5.col.act": "ทำอะไร",   // What
  "m5.col.state": "ใช้งาน",   // In use
  "m5.active": "ใช้งาน",   // In use
  "m5.paused": "พักไว้",   // Paused
  "m5.none2": "ยังไม่มีกติกา กด สร้างกติกา ด้านบน",   // No rules yet. Press Create rule above.
  "m5.dead": "กติกาของรายการเหล่านี้ทำให้ไม่มีที่ไปเลย: {n} ตรวจกติกาที่ขัดกัน",   // These rules leave nowhere to move to: {n}. Check for rules that contradict each other.
  "m5.stype.title": "สลับเฉพาะ Part ประเภทเดียวกัน",   // Swap only Parts of the same type
  "m5.stype.on": "เปิด: Part ที่มีประเภทสลับได้เฉพาะกับประเภทเดียวกัน (ไม่มีประเภท = สลับได้)",   // On: a Part with a type swaps only with a Part of the same type (no type = free)
  "m5.stype.off": "ปิด: ประเภทไม่จำกัดการสลับ",   // Off: types do not limit swaps
  "m5.t.title": "ประเภทของที่จัดเก็บ",   // Item types
  "m5.t.sub": "แก้ชื่อ เพิ่ม หรือลบประเภทได้ กำหนดประเภทเฉพาะ Part ที่จำเป็น",   // Rename, add or remove types. Give a type only to the Parts that need one.
  "m5.t.add": "เพิ่มประเภท",   // Add type
  "m5.t.newname": "ประเภทใหม่",   // New type
  "m5.t.name": "ชื่อประเภท",   // Type name
  "m5.t.save": "บันทึก",   // Save
  "m5.t.count": "{n} Part · {r} กติกา",   // {n} Parts · {r} rules
  "m5.t.assign": "กำหนด Part",   // Parts
  "m5.t.rename": "แก้ชื่อ",   // Rename
  "m5.t.delc": "ยืนยันลบ? ({n} Part, {r} กติกา)",   // Delete? ({n} Parts, {r} rules)
  "m5.t.none": "ยังไม่มีประเภท",   // No item types yet.
  "m5.t.notype": "ไม่มีประเภท",   // no type
  "m5.t.tab.search": "ค้นหา",   // Search
  "m5.t.tab.freq": "หยิบบ่อย ยังไม่มีประเภท",   // Picked often, no type
  "m5.t.tab.in": "ในประเภทนี้ ({n})",   // In this type ({n})
  "m5.t.typeq": "พิมพ์บางส่วนของรหัสหรือชื่อเพื่อแสดงรายการ Part",   // Type part of a code or name to list Parts.
  "m5.t.needm4": "คำนวณในโมดูล 4 ก่อนเพื่อดูความถี่การหยิบ",   // Run the calculation in Module 4 first to see pick frequency.
  "m5.t.freqsub": "Part ที่หยิบบ่อยที่สุดจากการคำนวณโมดูล 4 ครั้งล่าสุด ที่ยังไม่มีประเภท",   // Most-picked Parts in the last Module 4 calculation that have no type yet.
  "m5.t.all": "เลือกทั้งหมด ({n})",   // Select all ({n})
  "m5.t.set": "ใส่ประเภท {t} ให้ {n} รายการ",   // Set type {t} for {n} Parts
  "m5.t.unset": "เอาประเภทออกจาก {n} รายการ",   // Remove type from {n} Parts
  "m5.t.logset": "{n} Part → {t}",   // {n} Parts → {t}
  "m5.t.logunset": "{n} Part ออกจาก {t}",   // {n} Parts removed from {t}
  "m5.v.title": "ย้ายไปที่ไหนได้บ้าง",   // Where can it go?
  "m5.v.sub": "เลือก Part หรือประเภท: เขียว = ย้ายไปได้ แดง = ห้าม เหลือง = ได้บางชั้นเก็บ ใช้ทุกกติกาที่เกี่ยวข้องรวมกัน",   // Pick a Part or an item type: green = may move there, red = may not, yellow = only some levels. Every rule that counts is applied.
  "m5.v.pickpart": "ค้นหา Part เพื่อแสดงสีบนแผนที่",   // Search a Part to colour the map.
  "m5.v.picktype": "เลือกประเภทเพื่อแสดงสีบนแผนที่",   // Pick an item type to colour the map.
  "m5.v.type": "ประเภท: {t}",   // Type: {t}
  "m5.v.now": "อยู่ที่ {b}",   // now in {b}
  "m5.v.ok": "ไปได้ {n} ช่อง",   // {n} racks allowed
  "m5.v.some": "บางชั้นเก็บ {n} ช่อง",   // {n} some levels
  "m5.v.no": "ห้าม {n} ช่อง",   // {n} not allowed
  "m5.v.cannot": "Part นี้ย้ายออกไม่ได้:",   // This Part cannot move out:
  "m5.v.rules": "กติกาที่ใช้",   // Rules that count
  "m5.v.norules": "ไม่มีกติกาจำกัด ไปได้ทุกช่อง",   // No rule limits it — every rack is allowed.
  "m5.v.ownwins": "Part นี้มีกติกาของตัวเอง จึงไม่ใช้กติกาของประเภท",   // This Part has its own rules, so its type's rules are not used.
  "m5.v.samefloor": "เปิด \"ห้ามย้ายข้ามชั้น\": เขียวได้เฉพาะชั้นที่อยู่ตอนนี้",   // "No swaps across floors" is on: only its own floor can be green.
  "m5.v.leg.ok": "ย้ายไปได้",   // May move here
  "m5.v.leg.some": "ได้บางชั้นเก็บ",   // Some levels only
  "m5.v.leg.no": "ห้าม",   // May not
  "m5.v.leg.here": "ตำแหน่งปัจจุบัน",   // Where it is now
  "m5.mis.title": "Part ที่อยู่ผิดกติกาตอนนี้",   // Parts that break a rule now
  "m5.mis.sub": "เก็บอยู่ในที่ที่กติกาห้าม โมดูล 4 จะแนะนำย้ายตัวที่หยิบบ่อยก่อน",   // Stored where a rule says they may not be. Module 4 suggests fixing the most-picked first.
  "m5.mis.now": "อยู่ที่",   // Now in
  "m5.mis.n": "ครั้งหยิบ",   // Picks
  "m5.mis.rule": "กติกาที่ผิด",   // Rule broken
  "m5.mis.none": "ทุก Part อยู่ในที่ที่กติกาอนุญาต",   // Every Part is stored where the rules allow.
  "m5.mis.more": "อีก {n} รายการ — พิมพ์ค้นหาเพื่อกรอง",   // {n} more — search to narrow the list
  "m5.test.info2": "{a} ({ta}) อยู่ที่ {x} · {b} ({tb}) อยู่ที่ {y}",   // {a} ({ta}) is in {x} · {b} ({tb}) is in {y}
  "m5.rule.own": "กติกาของ Part รายตัวชนะกติกาของประเภท ส่วนกติกาทุก Part ใช้เสมอ",   // A Part's own rule beats its type's rule; rules for all Parts always count.
  "m5.act2.add": "เพิ่ม",   // Added
  "m5.act2.edit": "แก้ไข",   // Edited
  "m5.act2.del": "ลบ",   // Deleted
  "m5.act2.pause": "พัก",   // Paused
  "m5.act2.resume": "ใช้งาน",   // Resumed
  "m5.act2.on": "เปิด",   // Switched on
  "m5.act2.off": "ปิด",   // Switched off
  "m5.act2.tadd": "เพิ่มประเภท",   // Type added
  "m5.act2.tren": "แก้ชื่อประเภท",   // Type renamed
  "m5.act2.tset": "ใส่ประเภท",   // Type set
  "m5.act2.tunset": "เอาประเภทออก",   // Type removed
  "m5.act2.tdel": "ลบประเภท",   // Type deleted
  "m5.act2.convert": "แปลงเป็นกติกาแบบใหม่",   // Converted to the new rule format
  "m5.act.samefloor": "ห้ามย้ายข้ามชั้น",   // No swap across floors
  "m5.act.samefloor.sub": "สลับได้เฉพาะในชั้นเดียวกัน",   // Swaps stay on one floor
  "m5.act.sametype": "สลับเฉพาะประเภทเดียวกัน",   // Swap only with the same type
  "m5.act.sametype.sub": "สลับได้กับ Part ประเภทเดียวกันเท่านั้น",   // Only with a Part of the same item type
  "m5.s.samefloor": "{who} ห้ามย้ายข้ามชั้น",   // {who} may not move to another floor
  "m5.s.sametype": "{who} สลับได้เฉพาะกับ Part ประเภทเดียวกัน",   // {who} swaps only with Parts of the same type
  "m5.why.samefloor": "{p}: การสลับนี้ข้ามชั้น — {rule}",   // {p}: the swap crosses floors — {rule}
  "m5.why.sametype": "{p} ({a}) กับอีก Part ({b}) คนละประเภท — {rule}",   // {p} ({a}) and the other Part ({b}) are different types — {rule}
  "m5.leg.some": "บางชั้นเก็บ",   // Some levels
  "m5.a.none2": "ยังไม่ได้เลือก — คลิกบนแผนที่ด้านขวา",   // Nothing selected yet — click on the map on the right
  "m5.noarea": "กติกาแบบนี้ไม่ต้องเลือกพื้นที่",   // This kind of rule needs no area.
  "m5.map.hint2.rack": "คลิกช่องบนแผนที่ ถ้าต้องการเฉพาะบางชั้นเก็บ (เช่น 3G-04-01) เลือกด้านล่าง",   // Click racks on the map. To narrow a rack to some levels (e.g. 3G-04-01), pick them below.
  "m5.map.hint2.row": "คลิกช่องใดก็ได้บนแผนที่เพื่อเลือกทั้งแถว คลิกซ้ำเพื่อเอาออก เลือกหลายแถวรวมเป็นโซนได้",   // Click any rack on the map to select its whole row; click again to remove it. Select several to make a zone.
  "m5.map.hint2.floor": "คลิกช่องใดก็ได้บนแผนที่ หรือกดปุ่ม เพื่อเลือกทั้งชั้นอาคาร",   // Click any rack on the map, or the button, to select the whole building floor.
  "m5.slot.where0": "ที่ไหน",   // Where
  "m5.slot.where2": "ที่ไหน — เลือกบนแผนที่",   // Where — pick on the map
  "m5.col.who": "ใคร",   // Who
  "m5.col.where": "ที่ไหน",   // Where
  "m5.col.name": "ชื่อ Part",   // Part name
  "m5.wh.floor": "ชั้น",   // Floor
  "m5.wh.zone": "โซน",   // Zone
  "m5.wh.rack": "ช่อง",   // Rack
  "m5.wh.bin": "Bin",   // Bin
  "m5.list.click": "คลิกที่กติกาเพื่อดูพื้นที่บนแผนที่",   // Click a rule to see its area on the map.
  "m5.list.sub3": "กติกาของ Part รายตัวชนะกติกาของประเภท กติกาทุก Part ใช้เสมอ กติกาที่พักไว้ยังอยู่แต่ไม่ถูกใช้",   // A Part's own rule beats its type's rule; rules for all Parts always count. Paused rules are kept but not used.
  "m5.v.pick2": "เลือกประเภทหรือ Part ด้านบนเพื่อดูว่าย้ายไปที่ไหนได้",   // Pick an item type or a Part above to see where it may go.
  "m5.v.nowhere": "ไม่อยู่ในผัง",   // not on the layout
  "m5.v.rules2": "กติกาที่ใช้ ({n})",   // Rules that count ({n})
  "m5.v.choose": "— เลือก —",   // — choose —
  "m5.v.leg.free": "ไม่มีกติกา",   // No rule here
  "m5.map.t.pick": "เลือกพื้นที่ของกติกา",   // Pick the area of the rule
  "m5.map.t.rule": "พื้นที่ของกติกาที่เลือก",   // Area of the selected rule
  "m5.map.t.view": "ย้ายไปที่ไหนได้บ้าง",   // Where can it go?
  "m5.map.back": "กลับไปดูย้ายไปที่ไหนได้",   // Back to where-can-it-go
  "m5.map.picking": "คลิกช่องบนแผนที่ รายการที่เลือกแสดงในฟอร์มด้านซ้าย",   // Click racks on the map; the selection is listed in the form on the left.
  "m5.t.sub2": "เลือกการ์ดเพื่อดู Part ติ๊กเลือก แล้วใส่หรือย้ายประเภท",   // Pick a card to see its Parts, tick them and move them to a type.
  "m5.t.parts": "Part",   // Parts
  "m5.t.rules": "{n} กติกา",   // {n} rules
  "m5.t.ungrouped": "ยังไม่จัดกลุ่ม",   // Not grouped yet
  "m5.t.ungrouped.sub": "ยังไม่มีประเภท",   // no type
  "m5.t.del": "ลบประเภท",   // Delete type
  "m5.t.picked": "เลือก {n} รายการ",   // {n} selected
  "m5.t.setto": "ใส่ประเภท",   // Set type
  "m5.t.moveto": "ย้ายไปประเภท",   // Move to type
  "m5.t.apply": "ใช้",   // Apply
  "m5.t.unset2": "เอาออกจากประเภทนี้",   // Remove from this type
  "m5.t.showing": "แสดง {n} จาก {m} รายการ",   // Showing {n} of {m}
  "m5.t.byfreq": "เรียงตามหยิบบ่อย",   // most-picked first
  "m5.t.needm4b": "คำนวณในโมดูล 4 เพื่อเรียงตามความถี่",   // calculate in Module 4 to sort by picks
  "m5.t.allgrouped": "ทุก Part มีประเภทแล้ว",   // Every Part has a type.
  "m5.t.empty": "ยังไม่มี Part ในประเภทนี้ เปิด “ยังไม่จัดกลุ่ม” เพื่อเพิ่ม",   // No Parts in this type yet. Open “Not grouped yet” to add some.
  "m5.t.done": "ใส่ประเภท {t} ให้ {n} รายการแล้ว",   // {n} Parts set to {t}
  "m5.ph.part3": "ค้นหาจากบางส่วนของรหัสหรือชื่อ",   // Search by part of a code or name
  "m5.k4.lock": "ล็อกตำแหน่ง",   // Lock position
  "m5.k4.lock.mean": "ห้ามย้าย Part ที่เลือกออกจากช่องปัจจุบัน",   // The chosen Parts may not leave their current bins
  "m5.k4.lock.ex": "เช่น ล็อก Part A ที่ 3G-04-01",   // e.g. lock Part A at 3G-04-01
  "m5.k4.deny": "ห้ามย้ายไปพื้นที่",   // May not move into
  "m5.k4.deny.mean": "ห้ามใช้พื้นที่ที่ระบุเป็นปลายทาง พื้นที่อื่นยังพิจารณาได้",   // The area may not be a destination; other areas are still considered
  "m5.k4.deny.ex": "เช่น Packaging ห้ามย้ายไปชั้น 2",   // e.g. Packaging may not move to floor 2
  "m5.k4.allow": "ย้ายได้เฉพาะพื้นที่",   // May move only to
  "m5.k4.allow.mean": "ปลายทางต้องอยู่ในพื้นที่ที่ระบุเท่านั้น",   // The destination must be inside the area
  "m5.k4.allow.ex": "เช่น Part จากแถว 3G ย้ายได้เฉพาะแถว 1A และ 1B",   // e.g. Parts from row 3G only to rows 1A and 1B
  "m5.k4.pair": "จำกัดคู่สลับ",   // Limit swap partner
  "m5.k4.pair.mean": "กำหนดว่า Part อีกฝั่งต้องอยู่ในกลุ่มใด",   // The Part on the other side must be in one of the chosen groups
  "m5.k4.pair.ex": "เช่น Packaging สลับได้เฉพาะกับ Packaging",   // e.g. Packaging swaps only with Packaging
  "m5.slot.kind": "ประเภทกติกา",   // Rule kind
  "m5.slot.lockwho": "Part และ Location ที่ต้องการล็อก",   // Part and the location to lock
  "m5.slot.pairwho": "Part หรือกลุ่ม Part ที่ต้องการควบคุม",   // Part or group to control
  "m5.slot.src": "ต้นทาง",   // Source
  "m5.slot.dest.deny": "พื้นที่ปลายทางที่ห้าม",   // Destination that is not allowed
  "m5.slot.dest.allow": "พื้นที่ปลายทางที่อนุญาต",   // Destination that is allowed
  "m5.slot.partners": "กลุ่ม Part ที่ยอมให้เป็นคู่สลับ",   // Groups allowed as the swap partner
  "m5.src.q": "ใช้กับ Part ที่มาจาก",   // Applies to Parts coming from
  "m5.src.any": "ทุกต้นทาง",   // Any source
  "m5.src.some": "เฉพาะบางพื้นที่",   // Only some areas
  "m5.ap.src.deny": "พื้นที่ต้นทาง",   // Source area
  "m5.ap.src.allow": "พื้นที่ต้นทาง",   // Source area
  "m5.ap.dest.deny": "ปลายทางที่ห้าม",   // Forbidden destination
  "m5.ap.dest.allow": "ปลายทางที่อนุญาต",   // Allowed destination
  "m5.ap.active": "คลิกบนแผนที่จะเลือกให้ช่องนี้",   // Clicks on the map go here
  "m5.ap.pick": "เลือกบนแผนที่",   // Pick on the map
  "m5.dst.samefloor": "ชั้นอาคารเดียวกับต้นทาง",   // Same building floor as the source
  "m5.dst.samefloor.sub": "ใช้อย่างเดียวแทน \"ห้ามข้ามชั้น\" หรือใช้ร่วมกับพื้นที่ได้",   // Use alone for "no swap across floors", or together with an area
  "m5.dst.none": "ย้ายไม่ได้",   // Cannot move
  "m5.dst.with": "สลับกับ",   // Swap with
  "m5.wh.cond": "เงื่อนไข",   // Condition
  "m5.wh.row": "แถว",   // Row
  "m5.a.row": "แถว",   // row
  "m5.lk.all": "ทุกช่องที่อยู่",   // every bin it is in
  "m5.lk.all2": "ทุกช่อง ({n})",   // Every bin ({n})
  "m5.lk.nobin": "Part นี้ไม่มีช่องในข้อมูล Material–Location",   // This Part has no bin in the Material–Location data.
  "m5.partners.sub": "Part ที่ไม่มีประเภทไม่นับเป็นสมาชิกกลุ่มใด และช่องปลายทางของทั้งสอง Part ยังต้องผ่านกติกาพื้นที่ด้วย",   // A Part with no item type never counts as a member. The bins of both Parts must still pass the area rules.
  "m5.err.src": "เลือกพื้นที่ต้นทางบนแผนที่ หรือเลือก ทุกต้นทาง",   // Pick the source area on the map, or choose Any source
  "m5.err.allow": "เลือกปลายทางที่อนุญาตบนแผนที่ หรือติ๊ก ชั้นอาคารเดียวกับต้นทาง",   // Pick the allowed destination on the map, or tick Same building floor as the source
  "m5.err.partners": "เลือกกลุ่มที่ยอมให้เป็นคู่สลับอย่างน้อย 1 กลุ่ม",   // Pick at least one group allowed as the partner
  "m5.s4.lock": "ล็อก {v}",   // Lock {v}
  "m5.s4.deny": "{who}{from} ห้ามย้ายไป {a}",   // {who}{from} may not move to {a}
  "m5.s4.allow": "{who}{from} ย้ายได้เฉพาะ {a}",   // {who}{from} may move only to {a}
  "m5.s4.pair": "{who} สลับได้เฉพาะกับ {v}",   // {who} swaps only with {v}
  "m5.s.from": " ที่มาจาก {a}",   //  coming from {a}
  "m5.and": "และ",   // and
  "m5.why4.lock": "{p} ถูกล็อก — {rule}",   // {p} is locked — {rule}
  "m5.why4.deny": "{p}: ปลายทางเป็นพื้นที่ห้าม — {rule}",   // {p}: destination is forbidden — {rule}
  "m5.why4.allow": "{p}: ปลายทางอยู่นอกพื้นที่ที่อนุญาต — {rule}",   // {p}: destination is outside the allowed area — {rule}
  "m5.why4.floor": "{p}: ปลายทางอยู่คนละชั้นอาคาร — {rule}",   // {p}: destination is on another floor — {rule}
  "m5.why4.pair": "{p} สลับกับ {o} ({ot}) ไม่ได้ — {rule}",   // {p} may not swap with {o} ({ot}) — {rule}
  "m5.test.ok4": "ไม่พบข้อห้ามตามกติกาที่กำหนด",   // No restriction found under the rules set
  "m5.rule4.both": "ตรวจทั้ง A → ช่องของ B และ B → ช่องของ A",   // Both sides are checked: A → bin of B and B → bin of A.
  "m5.rule4.lock": "หากฝั่งใดถูกล็อกหรือผิดกติกา ถือว่าคู่นั้นสลับไม่ได้",   // If either side is locked or breaks a rule, the pair cannot swap.
  "m5.rule4.all": "ต้องผ่านทุกกติกาที่เกี่ยวข้อง กติกาอนุญาตไม่ลบล้างข้อห้าม",   // Every rule that applies must pass; an allow rule never cancels a forbid rule.
  "m5.rule4.none": "หากไม่มีข้อจำกัด แสดงว่า \"ไม่พบข้อห้ามตามกติกาที่กำหนด\"",   // With no restriction, the result reads "No restriction found under the rules set".
  "m5.rule4.size": "ขนาด น้ำหนัก และความจุช่อง เป็นการตรวจความเหมาะสมทางกายภาพแยกต่างหาก (ยังไม่มีข้อมูล) ไม่ใช่ประเภทกติกาเพิ่ม",   // Size, weight and bin capacity are a separate physical check (no data yet), not another rule kind.
  "m5.leg4.lock": "ช่องที่ล็อก",   // Locked bins
  "m5.leg4.src": "ต้นทาง",   // Source
  "m5.leg4.deny": "ปลายทางที่ห้าม",   // Forbidden destination
  "m5.leg4.allow": "ปลายทางที่อนุญาต",   // Allowed destination
  "m5.map.picking2": "คลิกช่องบนแผนที่ ช่องที่ไฮไลต์ในฟอร์มด้านซ้ายจะรับการเลือก",   // Click racks on the map. The highlighted block in the form on the left receives the clicks.
  "m5.noarea2": "กติกาประเภทนี้ไม่ต้องเลือกพื้นที่บนแผนที่",   // This rule kind needs no area on the map.
  "m5.v.tied": "กติกาที่ใช้เฉพาะ Part จากบางต้นทาง ไม่แสดงสีในมุมมองประเภท",   // Rules that apply only to Parts from a certain source are not coloured when viewing a type.
  "m5.list.sub4": "4 ประเภท: ล็อกอะไร · ห้ามไปไหน · ไปได้ที่ไหน · สลับกับใคร ทุกกติกาที่เกี่ยวข้องต้องผ่าน",   // Four kinds: lock what · may not move into · may move only to · who may swap with whom. Every rule that applies must pass.
  "m5.col.kind": "ประเภทกติกา",   // Kind
  "m5.col.src": "ต้นทาง",   // Source
  "m5.col.dest": "ปลายทาง / เงื่อนไข",   // Destination / condition
  "m5.intro2": "กำหนดว่า Part ใด จากตรงไหน ย้ายไปที่ใดได้หรือไม่ได้ คำแนะนำและ Simulation ในโมดูล 4 จะใช้เฉพาะคู่ที่ผ่านทุกกติกาในหน้านี้",   // Set which Parts may move from where to where. Module 4 suggests and simulates only swaps that pass every rule here.
  "m5.new.title": "สร้างกติกาใหม่",   // New rule
  "m5.new.sub": "เลือกประเภท Part และพื้นที่ ไม่ต้องพิมพ์เงื่อนไข",   // Pick the type, the Parts and the areas. No conditions to type.
  "m5.new.btn": "สร้างกติกา",   // Create rule
  "m5.edit.title": "แก้ไขกติกา",   // Edit rule
  "m5.step.kind": "ประเภทกติกา",   // Rule type
  "m5.step.parts": "Part",   // Parts
  "m5.step.who": "ใช้กับ",   // Applies to
  "m5.step.from": "ต้นทาง (ที่อยู่ปัจจุบันของ Part)",   // Source (where the Part is now)
  "m5.step.to": "ปลายทาง",   // Destination
  "m5.step.floors": "ชั้นที่จัดเก็บได้",   // Floors it may be stored on
  "m5.step.name": "ชื่อและเหตุผล",   // Name and reason
  "m5.kind.lock": "ห้ามย้าย Part",   // Lock Part
  "m5.kind.lockarea": "ห้ามย้ายออกจากพื้นที่",   // Nothing leaves area
  "m5.kind.allow": "อนุญาตปลายทาง",   // Allowed destinations
  "m5.kind.deny": "ห้ามปลายทาง",   // Forbidden destinations
  "m5.kind.floor": "ชั้นที่จัดเก็บได้",   // Storage floors
  "m5.kind.lock.help": "Part เหล่านี้อยู่ที่เดิม ไม่ถูกเสนอและสลับไม่ได้",   // These Parts stay in their bins and are never suggested or swapped.
  "m5.kind.lockarea.help": "ไม่มี Part ใดในพื้นที่นี้ย้ายออกได้",   // No Part in this area may be moved out of it.
  "m5.kind.allow.help": "Part ที่อยู่ต้นทางนี้ย้ายได้เฉพาะปลายทางที่ระบุ ที่อื่นไม่ได้ทั้งหมด",   // Parts in the source may go only to the listed destinations. Anywhere else is refused.
  "m5.kind.deny.help": "Part ที่อยู่ต้นทางนี้ห้ามย้ายไปปลายทางที่ระบุ ถ้าขัดกับกติกาอนุญาต ข้อห้ามชนะเสมอ",   // Parts in the source may not go to the listed destinations. "Not allowed" always wins over "allowed".
  "m5.kind.floor.help": "Part เหล่านี้จัดเก็บได้เฉพาะชั้นที่เลือก",   // These Parts may be stored only on the chosen floors.
  "m5.subj.all": "ทุก Part",   // All Parts
  "m5.subj.some": "เลือก Part",   // Chosen Parts
  "m5.subj.parts": "Part {v}",   // Parts {v}
  "m5.at.any": "ทุกที่",   // Anywhere
  "m5.at.row": "แถวแร็ค",   // Rack rows
  "m5.at.zone": "โซน",   // Zones
  "m5.at.bin": "ช่อง / แร็ค",   // Bin / rack
  "m5.at.floor": "ชั้น",   // Floors
  "m5.area.any": "ทุกที่",   // anywhere
  "m5.area.row": "แถว {v}",   // row {v}
  "m5.area.zone": "โซน {v}",   // zone {v}
  "m5.area.bin": "ช่อง {v}",   // bin {v}
  "m5.area.floor": "{v}",   // {v}
  "m5.auto.lock": "ห้ามย้าย {v}",   // Do not move {v}
  "m5.auto.lockarea": "ห้ามย้ายออกจาก{from}",   // Nothing leaves {from}
  "m5.auto.move": "{from} → {to}: {what}",   // {from} → {to}: {what}
  "m5.auto.floor": "{who} จัดเก็บได้เฉพาะ{to}",   // {who} stored only on {to}
  "m5.verdict.allow": "อนุญาต",   // allowed
  "m5.verdict.deny": "ห้าม",   // not allowed
  "m5.add": "เพิ่ม",   // Add
  "m5.name": "ชื่อกติกา",   // Rule name
  "m5.preview": "กติกา:",   // Rule:
  "m5.save": "บันทึกกติกา",   // Save rule
  "m5.save.edit": "บันทึกการแก้ไข",   // Save changes
  "m5.cancel": "ยกเลิก",   // Cancel
  "m5.edit": "แก้ไข",   // Edit
  "m5.del": "ลบ",   // Delete
  "m5.del.confirm": "กดอีกครั้งเพื่อลบ",   // Click again to delete
  "m5.from": "จาก{v}",   // from {v}
  "m5.err.parts": "เพิ่ม Part อย่างน้อย 1 รายการ",   // Add at least one Part.
  "m5.err.from": "เลือกพื้นที่ต้นทาง",   // Choose the source area.
  "m5.err.to": "เลือกปลายทาง",   // Choose the destination.
  "m5.ok.saved": "บันทึกกติกา “{name}” แล้ว โมดูล 4 จะใช้ตั้งแต่การคำนวณครั้งถัดไป",   // Rule “{name}” saved. Module 4 uses it from the next calculation.
  "m5.ok.edited": "แก้ไขกติกา “{name}” แล้ว",   // Rule “{name}” changed.
  "m5.ok.deleted": "ลบกติกา “{name}” แล้ว",   // Rule “{name}” deleted.
  "m5.list.title": "รายการกติกา",   // Rules
  "m5.list.sub": "ทุกคำแนะนำและ Simulation ในโมดูล 4 ตรวจกับรายการนี้",   // Every suggestion and simulation in Module 4 is checked against these.
  "m5.zone.title": "โซน",   // Zones
  "m5.zone.sub": "โซนคือกลุ่มแถวแร็คที่ใช้เป็นต้นทางหรือปลายทางได้",   // A zone is a group of rack rows you can use as a source or destination.
  "m5.zone.new": "สร้างโซน",   // New zone
  "m5.zone.name": "ชื่อโซน",   // Zone name
  "m5.zone.ph": "เช่น ชั้น 3 ของหนัก",   // e.g. Floor 3 heavy parts
  "m5.zone.rows": "แถวในโซนนี้",   // Rows in this zone
  "m5.zone.save": "บันทึกโซน",   // Save zone
  "m5.zone.err": "ตั้งชื่อโซนและเลือกอย่างน้อย 1 แถว",   // Give the zone a name and pick at least one row.
  "m5.zone.none": "ยังไม่มีโซน สร้างได้ที่การ์ดโซน",   // No zones yet. Create one in Zones.
  "m5.zone.used": "โซนนี้ถูกใช้ในกติกา ให้แก้หรือลบกติกานั้นก่อน",   // This zone is used by a rule. Change or delete that rule first.
  "m5.test.title": "ทดสอบการสลับ",   // Check a swap
  "m5.test.sub": "ตรวจทั้งสองฝั่ง: A ไปช่องของ B และ B ไปช่องของ A",   // Both sides are checked: A to B's bin and B to A's bin.
  "m5.test.btn": "ตรวจ",   // Check
  "m5.test.ok": "คู่นี้ผ่านทุกกติกา",   // This swap passes every rule.
  "m5.test.info": "{a} อยู่ที่ {x} · {b} อยู่ที่ {y}",   // {a} is in {x}, {b} is in {y}.
  "m5.why.lock": "{p}: {rule}",   // {p}: {rule}
  "m5.why.deny": "{p}: ปลายทางเป็นที่ห้ามเข้า — {rule}",   // {p}: destination is off-limits — {rule}
  "m5.why.notallowed": "{p}: ปลายทางไม่อยู่ในรายการที่อนุญาตของ {names}",   // {p}: destination is not in the allowed list of {names}
  "m5.why.floor": "{p}: ชั้นปลายทางไม่อยู่ในชั้นที่จัดเก็บได้ตาม {names}",   // {p}: destination floor is not allowed by {names}
  "m5.rule.floor2": "สลับข้ามชั้นได้ เว้นแต่มีกติกาชั้นที่จัดเก็บได้",   // Swaps may cross floors unless a storage-floor rule says otherwise.
  "m5.rule.deny": "ถ้ากติกาขัดกัน ข้อห้ามชนะเสมอ",   // When rules disagree, "not allowed" always wins.
  "m5.rule.size": "ข้อจำกัดขนาดและน้ำหนัก: ยังไม่ใช้ เพราะยังไม่มีข้อมูล ระบบไม่ถือว่าผ่าน",   // Size and weight limits: not used yet, there is no size or weight data. They are never treated as passed.
  "m5.act.add": "เพิ่ม",   // Added
  "m5.act.edit": "แก้ไข",   // Changed
  "m5.act.del": "ลบ",   // Deleted
  "m5.act.zadd": "เพิ่มโซน",   // Zone added
  "m5.act.zedit": "แก้โซน",   // Zone changed
  "m5.act.zdel": "ลบโซน",   // Zone deleted
  "m3.fs": "เต็มจอ",   // Full screen
  "m3.fs.exit": "ออกจากเต็มจอ",   // Exit full screen
  "m3.sug.none": "ไม่พบรายการที่ตรงกัน ตรวจรหัสหรือเลข JOB อีกครั้ง",   // Nothing matches. Check the code or the JOB number.
  "m3.kind.product": "Product",   // Product
  "m3.kind.job": "JOB",   // JOB
  "m3.sug.job_on": "วันที่ {date}",   // on {date}
  "m3.need.title": "ยังใช้เส้นทางหยิบไม่ได้",   // Pick navigation cannot run yet
  "m3.need.missing": "ยังขาด: {list} อัปโหลดได้ที่หน้า ข้อมูล",   // Still missing: {list}. Upload it in Data.
  "m3.warn.nolayout": "ยังไม่มีผังคลัง รายการจึงเรียงตามชื่อ Bin และไม่มีแผนที่ นำเข้าผังได้ที่หน้า ผังคลัง",   // There is no warehouse layout yet, so the list is in bin-name order and there is no map. Import the layout in Warehouse layout.
  "m3.warn.bridges": "ผังมี {n} จุดที่ไม่ต่อกับทางเดินรถเข็น เส้นทางจึงต่อให้ผ่านพื้นที่โล่ง",   // The layout has {n} areas not joined to the cart aisles. The route joins them across open floor.
  "m3.banner.new": "ข้อมูลถูกอัปเดตแล้ว",   // The data was updated.
  "m3.banner.reload": "โหลดผลใหม่",   // Reload the result
  "m3.plant.ask": "Product นี้ผลิตที่ Plant ไหน",   // Which plant builds this Product?
  "m3.plant.why_both": "Product นี้มี BOM ทั้งสอง Plant",   // This Product has a BOM in both plants.
  "m3.plant.why_job": "JOB {job} ไม่มีในแผนรายเดือน จึงไม่ทราบ Plant",   // JOB {job} is not in the monthly plan, so its plant is not known.
  "m3.plant.from_job": "Plant {plant} (จากเลข Order ของ JOB)",   // Plant {plant} (from the JOB order)
  "m3.plant.only": "Plant {plant}",   // Plant {plant}
  "m3.plant.change": "เปลี่ยน Plant",   // Change plant
  "m3.res.job": "JOB {job} วันที่ {date} แผน {qty} ชิ้น",   // JOB {job} on {date}, plan {qty} pcs
  "m3.res.nobom": "Product นี้ไม่มี BOM ใน Plant {plant} จึงแสดง Part ไม่ได้",   // This Product has no BOM in plant {plant}, so its parts cannot be listed.
  "m3.res.noparts": "ไม่พบ Part ของ Product นี้",   // No parts were found for this Product.
  "m3.res.parts": "{n} Part",   // {n} parts
  "m3.res.stops": "{n} จุดหยิบ",   // {n} stops
  "m3.res.route": "เดินประมาณ {m} ม.",   // Walk about {m} m
  "m3.res.calc": "กำลังคำนวณเส้นทาง…",   // Working out the route…
  "m3.col.seq": "ลำดับ",   // No.
  "m3.col.part": "Part",   // Part
  "m3.col.loc": "ตำแหน่ง",   // Location
  "m3.col.qty": "จำนวนต่อ Product",   // Qty per Product
  "m3.col.total": "รวมทั้ง JOB",   // Total for the JOB
  "m3.alt": "หรือ",   // or
  "m3.floor": "ชั้น {n}",   // Floor {n}
  "m3.flow.title": "ลำดับการเดินหยิบ",   // Order of the walk
  "m3.flow.step": "{k}) ชั้น {n} · {c} จุด",   // {k}) Floor {n} · {c} stops
  "m3.flow.up": "▲ ขึ้นลิฟต์",   // ▲ Lift up
  "m3.flow.down": "▼ ลงลิฟต์",   // ▼ Lift down
  "m3.grp.step": "ขั้นที่ {k}: หยิบที่ชั้น {n}",   // Step {k}: floor {n}
  "m3.lift.up": "ขึ้นลิฟต์ไปชั้น {n}",   // Take the lift up to floor {n}
  "m3.lift.down": "ลงลิฟต์ไปชั้น {n}",   // Take the lift down to floor {n}
  "m3.floor.all": "ทั้งหมด",   // All
  "m3.map.showing": "แผนที่แสดงชั้น {n}",   // Map shows floor {n}
  "m3.nostock": "ไม่มีสต็อก",   // No stock
  "m3.group.off": "ไม่อยู่ในเส้นทางเดิน",   // Not on the walking route
  "m3.group.off_help": "Part เหล่านี้อยู่ใน Bin ที่ไม่อยู่บนผัง หรือเป็น Bin ชื่อพิเศษ จึงไม่ถูกนำมาจัดเส้นทาง",   // These parts sit in bins that are not on the layout, or have special names. They are not in the route.
  "m3.group.nobin": "ไม่มีตำแหน่งเก็บ",   // No storage location
  "m3.group.nobin_help": "Part เหล่านี้ไม่มี Bin ใน Material–Location",   // These parts have no bin in Material–Location.
  "m3.empty.title": "ค้นหา Product เพื่อดูเส้นทางหยิบ",   // Search a Product to get its pick route
  "m3.empty.help": "พิมพ์รหัส Product บางส่วน หรือเลข JOB รายการจะแสดงแต่ละ Part พร้อม Bin เรียงตามลำดับการเดิน และแผนที่แสดงเส้นทาง",   // Type part of a Product code or a JOB number. The list shows each Part and its bin in walking order, and the map shows the route.
  "m3.legend.route": "เส้นทางเดิน",   // Walking route
  "m3.legend.stop": "หมายเลขจุดหยิบ",   // Stop number
  "m3.map.none": "แผนที่จะแสดงที่นี่เมื่อนำเข้าผังคลังแล้ว",   // The map appears here once a warehouse layout is imported.
  "m3.scale": "ระยะทางเป็นค่าประมาณ (มาตราส่วน {px} พิกเซลในชีต = 1 ม.)",   // Distances are estimates (scale {px} sheet pixels = 1 m).
  "list.code": "รหัส",   // Code
  "list.qty": "จำนวน",   // Quantity
  "list.where": "พบใน",   // Found in
  "list.note": "หมายเหตุ",   // Note
  "list.date": "วันที่",   // Date
  "list.special": "Bin พิเศษ (ไม่ใช้ในเส้นทาง)",   // Special bin (not used in routes)
  "list.norack": "ไม่มีชั้นวางนี้ในผัง (จำนวน Bin ในชั้นวาง)",   // Rack is not on the layout (bins in it)
  "list.show_all": "แสดงทั้งหมด {n} รายการ",   // Show all {n}
  "list.show_less": "แสดงน้อยลง",   // Show fewer
  "list.title": "รายการที่เกี่ยวข้อง",   // What is affected
  "ask.invalid_date": "เลือกวันที่ให้ครบ",   // Choose a full date.
  "ask.invalid_month": "เลือกเดือน",   // Choose a month.
  "detail.by": "อัปโหลดโดย {who} เมื่อ {when}",   // Uploaded by {who} on {when}
  "detail.activated": "ตั้งเป็นฉบับที่ใช้งานเมื่อ {when}",   // Made the version in use on {when}
  "ready.asof": "ข้อมูล ณ {when}",   // Data as of {when}
  "ready.version": "ฉบับที่ใช้งาน",   // Version in use
  "need.checks_title": "ตรวจข้ามไฟล์",   // Cross-file checks
  "soon.title": "Module ที่วางแผนไว้",   // Planned module
  "soon.body": "Module นี้จะสร้างหลังจากเริ่มใช้งาน Module ข้อมูลแล้ว โดยอ่านข้อมูลที่อัปโหลดไว้ในหน้า ข้อมูล",   // This module is built after the data module is in use. It reads the data uploaded in Data.
  "soon.m2": "นำเข้า Warehouse_Layouts.xlsx (ชั้น 1 และชั้น 2) เป็นผังเริ่มต้นได้",   // Warehouse_Layouts.xlsx (floor 1 and floor 2) can be imported as the starting layout.
  "soon.m3": "ต้องมี: BOM, Material–Location และผังคลัง",   // Needs: BOM, Material–Location and the warehouse layout.
  "soon.m4": "ต้องมี: แผนรายวันและรายเดือน, BOM, ผังคลัง และกฎการย้าย",   // Needs: daily and monthly plans, BOM, layout and relocation rules.
  "soon.m5": "ต้องมี: Material–Location และผังคลัง",   // Needs: Material–Location and the warehouse layout.
  "soon.m6": "อ่านผลลัพธ์ของ Module 1 ถึง 5",   // Reads the results of modules 1 to 5.
  };
})(window);
