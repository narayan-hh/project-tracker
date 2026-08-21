/* ==========================================================
   Project Tracker — Excel (.xlsx) reader
   ----------------------------------------------------------
   Reads a real Excel file with no outside library.
   An .xlsx file is a zip full of XML. The browser can unzip
   it on its own using DecompressionStream, so everything
   here stays local. Nothing is uploaded anywhere.

   Returns:  { sheets: [ { name, rows: [ [cell, cell...] ] } ] }
   ========================================================== */

/* ---------- little helpers for reading raw bytes ---------- */
const u16 = (b,o) => b[o] | (b[o+1] << 8);
const u32 = (b,o) => (b[o] | (b[o+1] << 8) | (b[o+2] << 16) | (b[o+3] << 24)) >>> 0;

/* ==========================================================
   Step 1 — open the zip and list what is inside
   ========================================================== */
function zipEntries(bytes){
  /* the zip index sits at the end of the file, so search backwards */
  let eocd = -1;
  for(let i = bytes.length - 22; i >= 0 && i > bytes.length - 66000; i--){
    if(u32(bytes,i) === 0x06054b50){ eocd = i; break; }
  }
  if(eocd < 0) throw new Error('This does not look like an Excel file.');

  const count = u16(bytes, eocd + 10);
  let p = u32(bytes, eocd + 16);
  const list = [];

  for(let n = 0; n < count; n++){
    if(u32(bytes,p) !== 0x02014b50) break;
    const method   = u16(bytes, p + 10);
    const compSize = u32(bytes, p + 20);
    const nameLen  = u16(bytes, p + 28);
    const extraLen = u16(bytes, p + 30);
    const cmtLen   = u16(bytes, p + 32);
    const offset   = u32(bytes, p + 42);
    /* some Windows zip tools write \ instead of / inside the file */
    const name     = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen))
                       .split(String.fromCharCode(92)).join("/");
    list.push({ name, method, compSize, offset });
    p += 46 + nameLen + extraLen + cmtLen;
  }
  return list;
}

/* pull one file out of the zip and give back its text */
async function zipRead(bytes, entry){
  /* the real data sits after the local header, whose length varies */
  let o = entry.offset;
  if(u32(bytes,o) !== 0x04034b50) throw new Error('Damaged Excel file.');
  const nameLen  = u16(bytes, o + 26);
  const extraLen = u16(bytes, o + 28);
  const start = o + 30 + nameLen + extraLen;
  const data  = bytes.subarray(start, start + entry.compSize);

  if(entry.method === 0) return new TextDecoder().decode(data);      /* stored as-is */
  if(entry.method !== 8) throw new Error('Unsupported compression inside the Excel file.');

  if(typeof DecompressionStream !== 'function')
    throw new Error('This browser cannot unzip Excel files. Please use Chrome or Edge, or save the sheet as CSV.');

  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return await new Response(stream).text();
}

/* ==========================================================
   Step 2 — understand the XML
   ========================================================== */
const xml = text => new DOMParser().parseFromString(text, 'application/xml');

/* Excel keeps repeated text in one shared list to save space */
function sharedStrings(doc){
  if(!doc) return [];
  return [...doc.getElementsByTagName('si')].map(si => {
    /* a cell can be split into several runs when part of it is styled */
    const runs = si.getElementsByTagName('t');
    let s = '';
    for(const t of runs) s += t.textContent;
    return s;
  });
}

/* which number formats mean "this is a date"? */
function dateStyles(doc){
  const isDateFmt = new Set([14,15,16,17,18,19,20,21,22,45,46,47]);
  if(!doc) return new Set();

  /* custom formats: anything with a y, d, or m outside of colour codes */
  [...doc.getElementsByTagName('numFmt')].forEach(f => {
    const code = (f.getAttribute('formatCode') || '').toLowerCase();
    if(/[yd]|mm?m/.test(code) && !/^[#0.,%\s]*$/.test(code))
      isDateFmt.add(Number(f.getAttribute('numFmtId')));
  });

  /* cellXfs is the list of styles cells actually point at */
  const xfs = doc.getElementsByTagName('cellXfs')[0];
  const out = new Set();
  if(xfs){
    [...xfs.getElementsByTagName('xf')].forEach((xf,i) => {
      if(isDateFmt.has(Number(xf.getAttribute('numFmtId')))) out.add(i);
    });
  }
  return out;
}

/* Excel stores dates as a count of days since 1900 */
function excelDate(serial){
  const n = Number(serial);
  if(!isFinite(n) || n <= 0) return String(serial);
  /* 25569 = days between 1900-01-01 and 1970-01-01.
     Excel wrongly counts 1900 as a leap year, so anything before
     1 March 1900 (serial 61) needs a day putting back. */
  const base = n < 61 ? 25568 : 25569;
  const ms = Math.round((n - base) * 86400000);
  const d = new Date(ms);
  if(isNaN(d.getTime())) return String(serial);
  return d.toISOString().slice(0,10);
}

/* "BC12" -> column 54 */
function colIndex(ref){
  let n = 0;
  for(const ch of ref){
    const c = ch.charCodeAt(0);
    if(c >= 65 && c <= 90) n = n * 26 + (c - 64);
    else break;
  }
  return n - 1;
}

/* ==========================================================
   Step 3 — turn one worksheet into plain rows
   ========================================================== */
function sheetRows(doc, strings, dateXfs){
  const rows = [];
  [...doc.getElementsByTagName('row')].forEach(rowEl => {
    const cells = [];
    [...rowEl.getElementsByTagName('c')].forEach(c => {
      const ref  = c.getAttribute('r') || '';
      const type = c.getAttribute('t') || 'n';
      const styleIdx = Number(c.getAttribute('s') || -1);
      const vEl = c.getElementsByTagName('v')[0];
      let val = '';

      if(type === 's'){
        val = strings[Number(vEl ? vEl.textContent : -1)] || '';
      } else if(type === 'inlineStr'){
        const is = c.getElementsByTagName('is')[0];
        val = is ? is.textContent : '';
      } else if(type === 'b'){
        val = (vEl && vEl.textContent === '1') ? 'TRUE' : 'FALSE';
      } else if(vEl){
        val = vEl.textContent;
        if(dateXfs.has(styleIdx)) val = excelDate(val);
      }

      const at = ref ? colIndex(ref) : cells.length;
      while(cells.length < at) cells.push('');
      cells[at] = String(val).trim();
    });
    rows.push(cells);
  });

  /* drop rows where every cell is empty */
  return rows.filter(r => r.some(c => c !== ''));
}

/* ==========================================================
   The one function the rest of the app calls
   ========================================================== */
async function readWorkbook(file){
  const bytes = new Uint8Array(await file.arrayBuffer());

  /* an .xls (old format) or a mis-named file will not start with "PK" */
  if(!(bytes[0] === 0x50 && bytes[1] === 0x4b))
    throw new Error('This is not an .xlsx file. If it is an old .xls, open it in Excel and use Save As → .xlsx or .csv.');

  const entries = zipEntries(bytes);
  const find = n => entries.find(e => e.name === n);
  const grab = async n => { const e = find(n); return e ? xml(await zipRead(bytes,e)) : null; };

  const strings = sharedStrings(await grab('xl/sharedStrings.xml'));
  const dateXfs = dateStyles(await grab('xl/styles.xml'));

  /* sheet names live in workbook.xml; the rels file says which XML holds each one */
  const wb   = await grab('xl/workbook.xml');
  const rels = await grab('xl/_rels/workbook.xml.rels');
  const relMap = {};
  if(rels) [...rels.getElementsByTagName('Relationship')].forEach(r => {
    relMap[r.getAttribute('Id')] = r.getAttribute('Target').replace(/^\/?(xl\/)?/,'');
  });

  const sheets = [];
  const wbSheets = wb ? [...wb.getElementsByTagName('sheet')] : [];

  for(const s of wbSheets){
    const rid  = s.getAttribute('r:id') || s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
    const path = 'xl/' + (relMap[rid] || '');
    const e = find(path) || find(path.replace('xl/xl/','xl/'));
    if(!e) continue;
    const doc = xml(await zipRead(bytes,e));
    sheets.push({ name: s.getAttribute('name') || ('Sheet ' + (sheets.length+1)),
                  rows: sheetRows(doc, strings, dateXfs) });
  }

  /* fallback: some files are written without a usable rels list */
  if(!sheets.length){
    for(const e of entries.filter(x => /^xl\/worksheets\/sheet\d*\.xml$/.test(x.name))){
      const doc = xml(await zipRead(bytes,e));
      sheets.push({ name: e.name.split('/').pop().replace('.xml',''),
                    rows: sheetRows(doc, strings, dateXfs) });
    }
  }

  if(!sheets.length) throw new Error('No sheets with any data were found in that file.');
  return { sheets };
}

/* is this file name something we can read? */
const isExcel = name => /\.xlsx$/i.test(name || '');
const isOldExcel = name => /\.xls$/i.test(name || '');
