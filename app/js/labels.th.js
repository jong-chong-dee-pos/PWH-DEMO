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
