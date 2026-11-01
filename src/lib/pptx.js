// PowerPoint export: the same slides as deck.js, one per screen, as a .pptx that Keynote, PowerPoint and
// Google Slides open. Each slide is the screen's name, small, above its text in a monospaced box sized to fit.
// No dependency: a stored (uncompressed) zip of hand-written OOXML parts, the smallest set PowerPoint accepts.
// ponytail: text only, no shapes; real shapes per part if a designer needs to edit them in PowerPoint.

import { slides, slideSize } from './deck.js';

const W = 12192000, H = 6858000;                 // 16:9 in EMU (13.333 x 7.5 in)
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const rels = list => `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${list.map(([id, type, target]) => `<Relationship Id="${id}" Type="${REL}/${type}" Target="${target}"/>`).join('')}</Relationships>`;

/** Point size that fits w columns and h lines in the art box, same rule as the HTML deck, capped at 28. */
export function fitPt(w, h) {
  const boxW = (W - 2 * 457200) / 12700, boxH = (H - 1371600) / 12700;   // EMU to points
  return Math.max(6, Math.min(28, Math.floor(Math.min(boxW / (w * 0.6), boxH / (h * 1.2)))));
}

function slideXml({ title, text }) {
  const { w, h } = slideSize(text);
  const pt = fitPt(w, h) * 100;
  const lines = text.split('\n').map(l => `<a:p><a:pPr algn="l"/><a:r><a:rPr lang="en-US" sz="${pt}" dirty="0"><a:latin typeface="Menlo"/><a:cs typeface="Menlo"/></a:rPr><a:t>${esc(l) || ' '}</a:t></a:r></a:p>`).join('');
  const box = (id, name, y, cy, body) => `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="457200" y="${y}"/><a:ext cx="${W - 914400}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="${id === 2 ? 't' : 'ctr'}"/><a:lstStyle/>${body}</p:txBody></p:sp>`;
  const head = `<a:p><a:r><a:rPr lang="en-US" sz="1400" dirty="0"><a:solidFill><a:srgbClr val="6E6E73"/></a:solidFill></a:rPr><a:t>${esc(title)}</a:t></a:r></a:p>`;
  return `${XML}<p:sld ${NS}><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${box(2, 'Title', 365760, 365760, head)}${box(3, 'Art', 914400, H - 1371600, lines)}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}

const THEME = `${XML}<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Icelus"><a:themeElements><a:clrScheme name="Icelus"><a:dk1><a:srgbClr val="1D1D1F"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1D1D1F"/></a:dk2><a:lt2><a:srgbClr val="F5F5F7"/></a:lt2><a:accent1><a:srgbClr val="0071E3"/></a:accent1><a:accent2><a:srgbClr val="6E6E73"/></a:accent2><a:accent3><a:srgbClr val="86868B"/></a:accent3><a:accent4><a:srgbClr val="AEAEB2"/></a:accent4><a:accent5><a:srgbClr val="C7C7CC"/></a:accent5><a:accent6><a:srgbClr val="D1D1D6"/></a:accent6><a:hlink><a:srgbClr val="0071E3"/></a:hlink><a:folHlink><a:srgbClr val="0071E3"/></a:folHlink></a:clrScheme><a:fontScheme name="Icelus"><a:majorFont><a:latin typeface="Helvetica Neue"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Helvetica Neue"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Icelus"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;
const TREE = '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>';
const MASTER = `${XML}<p:sldMaster ${NS}><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>`;
const LAYOUT = `${XML}<p:sldLayout ${NS} type="blank" preserve="1">${TREE}<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;

/** The parts of the .pptx as [path, xml]. Exported for the test. */
export function parts(elements, cols, rows, title = 'Icelus deck') {
  let list = slides(elements, cols, rows);
  if (!list.length) list = [{ title, text: 'No screens yet.' }];
  const n = list.length;
  const out = [
    ['[Content_Types].xml', `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>${list.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')}</Types>`],
    ['_rels/.rels', rels([['rId1', 'officeDocument', 'ppt/presentation.xml'], ['rId2', 'metadata/core-properties', 'docProps/core.xml']]).replace(`${REL}/metadata/core-properties`, 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties')],
    ['docProps/core.xml', `${XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${esc(title)}</dc:title><dc:creator>Icelus</dc:creator></cp:coreProperties>`],
    ['ppt/presentation.xml', `${XML}<p:presentation ${NS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${list.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 3}"/>`).join('')}</p:sldIdLst><p:sldSz cx="${W}" cy="${H}"/><p:notesSz cx="${H}" cy="${W}"/></p:presentation>`],
    ['ppt/_rels/presentation.xml.rels', rels([['rId1', 'slideMaster', 'slideMasters/slideMaster1.xml'], ['rId2', 'theme', 'theme/theme1.xml'], ...list.map((_, i) => [`rId${i + 3}`, 'slide', `slides/slide${i + 1}.xml`])])],
    ['ppt/theme/theme1.xml', THEME],
    ['ppt/slideMasters/slideMaster1.xml', MASTER],
    ['ppt/slideMasters/_rels/slideMaster1.xml.rels', rels([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'], ['rId2', 'theme', '../theme/theme1.xml']])],
    ['ppt/slideLayouts/slideLayout1.xml', LAYOUT],
    ['ppt/slideLayouts/_rels/slideLayout1.xml.rels', rels([['rId1', 'slideMaster', '../slideMasters/slideMaster1.xml']])],
  ];
  list.forEach((s, i) => {
    out.push([`ppt/slides/slide${i + 1}.xml`, slideXml(s)]);
    out.push([`ppt/slides/_rels/slide${i + 1}.xml.rels`, rels([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml']])]);
  });
  return { parts: out, count: n };
}

const CRC = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };

/** A stored zip of [path, string] entries. */
export function zip(entries) {
  const enc = new TextEncoder(), chunks = [], central = [];
  let off = 0;
  for (const [name, text] of entries) {
    const nb = enc.encode(name), data = enc.encode(text), crc = crc32(data);
    const head = new DataView(new ArrayBuffer(30));
    [[0, 0x04034b50, 4], [4, 20, 2], [8, 0, 2], [14, crc, 4], [18, data.length, 4], [22, data.length, 4], [26, nb.length, 2]]
      .forEach(([o, v, s]) => (s === 4 ? head.setUint32(o, v, true) : head.setUint16(o, v, true)));
    chunks.push(new Uint8Array(head.buffer), nb, data);
    const cd = new DataView(new ArrayBuffer(46));
    [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [16, crc, 4], [20, data.length, 4], [24, data.length, 4], [28, nb.length, 2], [42, off, 4]]
      .forEach(([o, v, s]) => (s === 4 ? cd.setUint32(o, v, true) : cd.setUint16(o, v, true)));
    central.push(new Uint8Array(cd.buffer), nb);
    off += 30 + nb.length + data.length;
  }
  const size = central.reduce((a, c) => a + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  [[0, 0x06054b50, 4], [8, entries.length, 2], [10, entries.length, 2], [12, size, 4], [16, off, 4]]
    .forEach(([o, v, s]) => (s === 4 ? end.setUint32(o, v, true) : end.setUint16(o, v, true)));
  const all = [...chunks, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((a, c) => a + c.length, 0));
  let at = 0;
  for (const c of all) { out.set(c, at); at += c.length; }
  return out;
}

/** The deck as .pptx bytes. */
export function toPptx(elements, cols, rows, title = 'Icelus deck') {
  return zip(parts(elements, cols, rows, title).parts);
}
