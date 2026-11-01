import Foundation

// PowerPoint export: the same slides as Deck.swift, one per screen, as a .pptx that Keynote, PowerPoint and
// Google Slides open. Each slide is the screen's name, small, above its text in a monospaced box sized to fit.
// No dependency: a stored (uncompressed) zip of hand-written OOXML parts. src/lib/pptx.js is the twin.
// ponytail: text only, no shapes; real shapes per part if a designer needs to edit them in PowerPoint.

private let slideW = 12_192_000, slideH = 6_858_000 // 16:9 in EMU (13.333 x 7.5 in)
private let xmlHead = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n"
private let ns = "xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\""
private let relNS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

private func pesc(_ s: String) -> String {
    s.replacingOccurrences(of: "&", with: "&amp;").replacingOccurrences(of: "<", with: "&lt;").replacingOccurrences(of: ">", with: "&gt;")
        .replacingOccurrences(of: "\"", with: "&quot;").replacingOccurrences(of: "'", with: "&apos;")
}

private func rels(_ list: [(String, String, String)]) -> String {
    xmlHead + "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"
        + list.map { "<Relationship Id=\"\($0.0)\" Type=\"\(relNS)/\($0.1)\" Target=\"\($0.2)\"/>" }.joined() + "</Relationships>"
}

/// Point size that fits w columns and h lines in the art box, same rule as the HTML deck, capped at 28.
func fitPt(_ w: Int, _ h: Int) -> Int {
    let boxW = Double(slideW - 2 * 457_200) / 12700, boxH = Double(slideH - 1_371_600) / 12700
    return max(6, min(28, Int(min(boxW / (Double(w) * 0.6), boxH / (Double(h) * 1.2)).rounded(.down))))
}

private func slideXml(_ s: Slide) -> String {
    let (w, h) = slideSize(s.text)
    let pt = fitPt(w, h) * 100
    let lines = s.text.components(separatedBy: "\n").map { l in
        "<a:p><a:pPr algn=\"l\"/><a:r><a:rPr lang=\"en-US\" sz=\"\(pt)\" dirty=\"0\"><a:latin typeface=\"Menlo\"/><a:cs typeface=\"Menlo\"/></a:rPr><a:t>\(l.isEmpty ? " " : pesc(l))</a:t></a:r></a:p>"
    }.joined()
    func box(_ id: Int, _ name: String, _ y: Int, _ cy: Int, _ body: String) -> String {
        "<p:sp><p:nvSpPr><p:cNvPr id=\"\(id)\" name=\"\(name)\"/><p:cNvSpPr txBox=\"1\"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x=\"457200\" y=\"\(y)\"/><a:ext cx=\"\(slideW - 914_400)\" cy=\"\(cy)\"/></a:xfrm><a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap=\"none\" lIns=\"0\" tIns=\"0\" rIns=\"0\" bIns=\"0\" anchor=\"\(id == 2 ? "t" : "ctr")\"/><a:lstStyle/>\(body)</p:txBody></p:sp>"
    }
    let head = "<a:p><a:r><a:rPr lang=\"en-US\" sz=\"1400\" dirty=\"0\"><a:solidFill><a:srgbClr val=\"6E6E73\"/></a:solidFill></a:rPr><a:t>\(pesc(s.title))</a:t></a:r></a:p>"
    return xmlHead + "<p:sld \(ns)><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id=\"1\" name=\"\"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>"
        + box(2, "Title", 365_760, 365_760, head) + box(3, "Art", 914_400, slideH - 1_371_600, lines)
        + "</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>"
}

private let solid = "<a:solidFill><a:schemeClr val=\"phClr\"/></a:solidFill>"
private let theme = xmlHead + "<a:theme xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" name=\"Icelus\"><a:themeElements><a:clrScheme name=\"Icelus\">"
    + [("dk1", "1D1D1F"), ("lt1", "FFFFFF"), ("dk2", "1D1D1F"), ("lt2", "F5F5F7"), ("accent1", "0071E3"), ("accent2", "6E6E73"), ("accent3", "86868B"),
       ("accent4", "AEAEB2"), ("accent5", "C7C7CC"), ("accent6", "D1D1D6"), ("hlink", "0071E3"), ("folHlink", "0071E3")]
        .map { "<a:\($0.0)><a:srgbClr val=\"\($0.1)\"/></a:\($0.0)>" }.joined()
    + "</a:clrScheme><a:fontScheme name=\"Icelus\"><a:majorFont><a:latin typeface=\"Helvetica Neue\"/><a:ea typeface=\"\"/><a:cs typeface=\"\"/></a:majorFont><a:minorFont><a:latin typeface=\"Helvetica Neue\"/><a:ea typeface=\"\"/><a:cs typeface=\"\"/></a:minorFont></a:fontScheme>"
    + "<a:fmtScheme name=\"Icelus\"><a:fillStyleLst>\(solid)\(solid)\(solid)</a:fillStyleLst><a:lnStyleLst>"
    + [6350, 12700, 19050].map { "<a:ln w=\"\($0)\">\(solid)</a:ln>" }.joined()
    + "</a:lnStyleLst><a:effectStyleLst>" + String(repeating: "<a:effectStyle><a:effectLst/></a:effectStyle>", count: 3)
    + "</a:effectStyleLst><a:bgFillStyleLst>\(solid)\(solid)\(solid)</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>"
private let tree = "<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id=\"1\" name=\"\"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>"
private let master = xmlHead + "<p:sldMaster \(ns)><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val=\"FFFFFF\"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id=\"1\" name=\"\"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:clrMap bg1=\"lt1\" tx1=\"dk1\" bg2=\"lt2\" tx2=\"dk2\" accent1=\"accent1\" accent2=\"accent2\" accent3=\"accent3\" accent4=\"accent4\" accent5=\"accent5\" accent6=\"accent6\" hlink=\"hlink\" folHlink=\"folHlink\"/><p:sldLayoutIdLst><p:sldLayoutId id=\"2147483649\" r:id=\"rId1\"/></p:sldLayoutIdLst></p:sldMaster>"
private let layout = xmlHead + "<p:sldLayout \(ns) type=\"blank\" preserve=\"1\">\(tree)<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>"

/// The parts of the .pptx as (path, xml). Internal so the checks can read them.
func pptxParts(_ elements: [Element], cols: Int, rows: Int, title: String = "Icelus deck") -> [(String, String)] {
    var list = slides(elements, cols: cols, rows: rows)
    if list.isEmpty { list = [Slide(title: title, text: "No screens yet.")] }
    let idx = Array(1...list.count)
    var out: [(String, String)] = [
        ("[Content_Types].xml", xmlHead + "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/ppt/presentation.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml\"/><Override PartName=\"/ppt/slideMasters/slideMaster1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml\"/><Override PartName=\"/ppt/slideLayouts/slideLayout1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml\"/><Override PartName=\"/ppt/theme/theme1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.theme+xml\"/><Override PartName=\"/docProps/core.xml\" ContentType=\"application/vnd.openxmlformats-package.core-properties+xml\"/>"
            + idx.map { "<Override PartName=\"/ppt/slides/slide\($0).xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.slide+xml\"/>" }.joined() + "</Types>"),
        ("_rels/.rels", rels([("rId1", "officeDocument", "ppt/presentation.xml"), ("rId2", "metadata/core-properties", "docProps/core.xml")])
            .replacingOccurrences(of: "\(relNS)/metadata/core-properties", with: "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties")),
        ("docProps/core.xml", xmlHead + "<cp:coreProperties xmlns:cp=\"http://schemas.openxmlformats.org/package/2006/metadata/core-properties\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\"><dc:title>\(pesc(title))</dc:title><dc:creator>Icelus</dc:creator></cp:coreProperties>"),
        ("ppt/presentation.xml", xmlHead + "<p:presentation \(ns)><p:sldMasterIdLst><p:sldMasterId id=\"2147483648\" r:id=\"rId1\"/></p:sldMasterIdLst><p:sldIdLst>"
            + idx.map { "<p:sldId id=\"\(255 + $0)\" r:id=\"rId\($0 + 2)\"/>" }.joined() + "</p:sldIdLst><p:sldSz cx=\"\(slideW)\" cy=\"\(slideH)\"/><p:notesSz cx=\"\(slideH)\" cy=\"\(slideW)\"/></p:presentation>"),
        ("ppt/_rels/presentation.xml.rels", rels([("rId1", "slideMaster", "slideMasters/slideMaster1.xml"), ("rId2", "theme", "theme/theme1.xml")] + idx.map { ("rId\($0 + 2)", "slide", "slides/slide\($0).xml") })),
        ("ppt/theme/theme1.xml", theme),
        ("ppt/slideMasters/slideMaster1.xml", master),
        ("ppt/slideMasters/_rels/slideMaster1.xml.rels", rels([("rId1", "slideLayout", "../slideLayouts/slideLayout1.xml"), ("rId2", "theme", "../theme/theme1.xml")])),
        ("ppt/slideLayouts/slideLayout1.xml", layout),
        ("ppt/slideLayouts/_rels/slideLayout1.xml.rels", rels([("rId1", "slideMaster", "../slideMasters/slideMaster1.xml")])),
    ]
    for (i, s) in list.enumerated() {
        out.append(("ppt/slides/slide\(i + 1).xml", slideXml(s)))
        out.append(("ppt/slides/_rels/slide\(i + 1).xml.rels", rels([("rId1", "slideLayout", "../slideLayouts/slideLayout1.xml")])))
    }
    return out
}

private let crcTable: [UInt32] = (0..<256).map { i -> UInt32 in
    var c = UInt32(i)
    for _ in 0..<8 { c = c & 1 != 0 ? 0xEDB8_8320 ^ (c >> 1) : c >> 1 }
    return c
}
private func crc32(_ d: [UInt8]) -> UInt32 { ~d.reduce(UInt32.max) { crcTable[Int(($0 ^ UInt32($1)) & 0xFF)] ^ ($0 >> 8) } }

/// A stored zip of (path, text) entries.
func storedZip(_ entries: [(String, String)]) -> Data {
    var out = Data(), central = Data(), offset = 0
    func u16(_ v: Int) -> [UInt8] { [UInt8(v & 0xFF), UInt8(v >> 8 & 0xFF)] }
    func u32(_ v: UInt32) -> [UInt8] { (0..<4).map { UInt8(v >> (8 * $0) & 0xFF) } }
    for (name, text) in entries {
        let nb = Array(name.utf8), data = Array(text.utf8), crc = crc32(data), size = u32(UInt32(data.count))
        out.append(contentsOf: u32(0x0403_4B50) + u16(20) + u16(0) + u16(0) + u16(0) + u16(0) + u32(crc) + size + size + u16(nb.count) + u16(0) + nb + data)
        central.append(contentsOf: u32(0x0201_4B50) + u16(20) + u16(20) + u16(0) + u16(0) + u16(0) + u16(0) + u32(crc) + size + size
            + u16(nb.count) + u16(0) + u16(0) + u16(0) + u16(0) + u32(0) + u32(UInt32(offset)) + nb)
        offset += 30 + nb.count + data.count
    }
    let cdSize = central.count
    out.append(central)
    out.append(contentsOf: u32(0x0605_4B50) + u16(0) + u16(0) + u16(entries.count) + u16(entries.count) + u32(UInt32(cdSize)) + u32(UInt32(offset)) + u16(0))
    return out
}

/// The deck as .pptx bytes.
func toPptx(_ elements: [Element], cols: Int, rows: Int, title: String = "Icelus deck") -> Data {
    storedZip(pptxParts(elements, cols: cols, rows: rows, title: title))
}
