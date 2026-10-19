package com.nulljosh.charwork

// Ported from src/lib/engine.js / ios/App/Engine.swift. Keep line-comparable.

const val DEFAULT_COLS = 100
const val DEFAULT_ROWS = 50

typealias Grid = List<MutableList<Char>>

fun createGrid(cols: Int = DEFAULT_COLS, rows: Int = DEFAULT_ROWS): Grid =
    List(rows) { MutableList(cols) { ' ' } }

fun cloneGrid(grid: Grid): Grid = grid.map { it.toMutableList() }

fun gridToText(grid: Grid): String = grid.joinToString("\n") { it.joinToString("") }

fun textToGrid(text: String, cols: Int = DEFAULT_COLS, rows: Int = DEFAULT_ROWS): Grid {
    val grid = createGrid(cols, rows)
    val lines = text.split("\n")
    for (r in 0 until minOf(lines.size, rows)) {
        val chars = lines[r].toCharArray()
        for (c in 0 until minOf(chars.size, cols)) grid[r][c] = chars[c]
    }
    return grid
}

/** Stamp a component template onto the grid at (col, row). Returns a new grid. */
fun stampComponent(grid: Grid, template: List<String>, col: Int, row: Int): Grid {
    val next = cloneGrid(grid)
    val rows = grid.size
    val cols = grid.getOrNull(0)?.size ?: 0
    for (dy in template.indices) {
        val r = row + dy
        if (r < 0 || r >= rows) continue
        val chars = template[dy].toCharArray()
        for (dx in chars.indices) {
            val c = col + dx
            if (c < 0 || c >= cols) continue
            next[r][c] = chars[dx]
        }
    }
    return next
}

fun setChar(grid: Grid, col: Int, row: Int, char: Char?): Grid {
    if (row < 0 || row >= grid.size) return grid
    if (col < 0 || col >= (grid.getOrNull(0)?.size ?: 0)) return grid
    val next = cloneGrid(grid)
    next[row][col] = char ?: ' '
    return next
}

fun eraseRegion(grid: Grid, col: Int, row: Int, width: Int, height: Int): Grid {
    val next = cloneGrid(grid)
    for (dy in 0 until height) {
        val r = row + dy
        if (r < 0 || r >= grid.size) continue
        for (dx in 0 until width) {
            val c = col + dx
            if (c < 0 || c >= (grid.getOrNull(0)?.size ?: 0)) continue
            next[r][c] = ' '
        }
    }
    return next
}

data class Cell(val col: Int, val row: Int)

fun pxToCell(px: Double, py: Double, charW: Double, charH: Double): Cell =
    Cell((px / charW).toInt(), (py / charH).toInt())

data class EngineState(
    val grid: Grid,
    val cols: Int,
    val rows: Int,
    val cursor: Cell = Cell(0, 0),
    val history: List<Grid> = emptyList(),
    val future: List<Grid> = emptyList(),
    val selectedPreset: String? = null,
)

fun createState(cols: Int = DEFAULT_COLS, rows: Int = DEFAULT_ROWS): EngineState =
    EngineState(createGrid(cols, rows), cols, rows)

fun pushHistory(state: EngineState): EngineState = state.copy(
    history = (state.history.takeLast(49) + listOf(cloneGrid(state.grid))),
    future = emptyList(),
)

fun undo(state: EngineState): EngineState {
    if (state.history.isEmpty()) return state
    val prev = state.history.last()
    return state.copy(
        grid = prev,
        history = state.history.dropLast(1),
        future = (listOf(cloneGrid(state.grid)) + state.future).take(50),
    )
}

fun redo(state: EngineState): EngineState {
    if (state.future.isEmpty()) return state
    val next = state.future.first()
    return state.copy(
        grid = next,
        history = (state.history.takeLast(49) + listOf(cloneGrid(state.grid))),
        future = state.future.drop(1),
    )
}
