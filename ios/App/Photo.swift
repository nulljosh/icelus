// A photo in text (blocks, braille or shade), a port of src/lib/photo.js: two pixel rows per text row with half blocks,
// stretched to full contrast and dithered (Floyd-Steinberg) so shading survives one bit per pixel.

import CoreGraphics
import ImageIO
import Foundation

let pixelAspect = 0.84

func photoSize(width: Int, height: Int, cols: Int = 60) -> (cols: Int, pixelRows: Int) {
    (cols, max(2, Int((Double(cols * height) / Double(width) * pixelAspect / 2).rounded()) * 2))
}

/// Three looks: blocks (two pixels a cell), braille (eight dots a cell, the finest) and shade (one pixel a cell
/// in ░ ▒ ▓ █, soft and undithered). photoGrid says how many pixels to sample for each.
let photoLooks = ["blocks", "braille", "shade"]
func photoGrid(width: Int, height: Int, cols: Int = 60, look: String = "blocks") -> (w: Int, h: Int) {
    let rows = max(1, Int((Double(cols * height) / Double(width) * pixelAspect / 2).rounded()))
    return look == "braille" ? (cols * 2, rows * 4) : look == "shade" ? (cols, rows) : (cols, rows * 2)
}

/// Stretch to the full range, so a flat, grey photo still has blacks and whites. A flat image keeps its own
/// brightness, or blank white would come out black.
func stretch(_ gray: [Double]) -> [Double] {
    let lo = gray.min() ?? 0, hi = gray.max() ?? 255
    return hi - lo < 1 ? gray : gray.map { ($0 - lo) / (hi - lo) * 255 }
}

/// One bit a pixel, Floyd-Steinberg dithered so shading survives.
func dither(_ gray: [Double], cols: Int, pixelRows: Int) -> [Bool] {
    var px = stretch(gray)
    var ink = [Bool](repeating: false, count: cols * pixelRows)
    for y in 0..<pixelRows {
        for x in 0..<cols {
            let i = y * cols + x, old = px[i], on = old < 128
            ink[i] = on
            let err = old - (on ? 0 : 255)
            if x + 1 < cols { px[i + 1] += err * 7 / 16 }
            if y + 1 < pixelRows {
                if x > 0 { px[i + cols - 1] += err * 3 / 16 }
                px[i + cols] += err * 5 / 16
                if x + 1 < cols { px[i + cols + 1] += err / 16 }
            }
        }
    }
    return ink
}

/// gray: brightness 0 (black) to 255 (white), row by row. Dark pixels are ink.
func photoToBlocks(_ gray: [Double], cols: Int, pixelRows: Int) -> [String] {
    let ink = dither(gray, cols: cols, pixelRows: pixelRows)
    return stride(from: 0, to: pixelRows, by: 2).map { y in
        String((0..<cols).map { x -> Character in
            let top = ink[y * cols + x], bottom = y + 1 < pixelRows && ink[(y + 1) * cols + x]
            return top && bottom ? "█" : top ? "▀" : bottom ? "▄" : " "
        })
    }
}

private let brailleBits: [[UInt32]] = [[0x01, 0x08], [0x02, 0x10], [0x04, 0x20], [0x40, 0x80]] // by row, then column
func photoToText(_ gray: [Double], w: Int, h: Int, look: String = "blocks") -> [String] {
    if look == "shade" {
        let px = stretch(gray), shades = Array(" ░▒▓█")
        return (0..<h).map { y in String((0..<w).map { x in shades[4 - min(4, Int(px[y * w + x] / 51.2))] }) }
    }
    guard look == "braille" else { return photoToBlocks(gray, cols: w, pixelRows: h) }
    let ink = dither(gray, cols: w, pixelRows: h)
    return stride(from: 0, to: h, by: 4).map { y in
        String(stride(from: 0, to: w, by: 2).map { x -> Character in
            var bits: UInt32 = 0
            for dy in 0..<4 { for dx in 0..<2 where y + dy < h && x + dx < w && ink[(y + dy) * w + x + dx] { bits |= brailleBits[dy][dx] } }
            return Character(Unicode.Scalar(0x2800 + bits)!)
        })
    }
}

/// Decode image data, upright and at most 1024 px on a side, or nil if it is not an image.
func photoImage(_ data: Data) -> CGImage? {
    guard let source = CGImageSourceCreateWithData(data as CFData, nil) else { return nil }
    return CGImageSourceCreateThumbnailAtIndex(source, 0, [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceCreateThumbnailWithTransform: true,
        kCGImageSourceThumbnailMaxPixelSize: 1024,
    ] as CFDictionary)
}

/// Decode image data and draw it in one of the looks, or nil if it is not an image.
func photoTemplate(_ data: Data, cols: Int, look: String = "blocks") -> [String]? {
    guard let image = photoImage(data) else { return nil }
    let size = photoGrid(width: image.width, height: image.height, cols: cols, look: look)
    var bytes = [UInt8](repeating: 255, count: size.w * size.h) // transparent reads as paper
    let drawn = bytes.withUnsafeMutableBytes { buf -> Bool in
        guard let ctx = CGContext(data: buf.baseAddress, width: size.w, height: size.h, bitsPerComponent: 8,
                                  bytesPerRow: size.w, space: CGColorSpaceCreateDeviceGray(),
                                  bitmapInfo: CGImageAlphaInfo.none.rawValue) else { return false }
        ctx.interpolationQuality = .high
        ctx.draw(image, in: CGRect(x: 0, y: 0, width: size.w, height: size.h))
        return true
    }
    return drawn ? photoToText(bytes.map(Double.init), w: size.w, h: size.h, look: look) : nil
}
