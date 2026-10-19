package com.nulljosh.charwork

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class EngineTest {
    @Test fun stampAndGridToText() {
        val grid = createGrid(6, 2)
        val stamped = stampComponent(grid, listOf("[ OK ]"), 0, 0)
        assertEquals("[ OK ]\n      ", gridToText(stamped))
    }

    @Test fun stampIsImmutable() {
        val grid = createGrid(6, 2)
        stampComponent(grid, listOf("[ OK ]"), 0, 0)
        assertEquals("      \n      ", gridToText(grid))
    }

    @Test fun undoRedo() {
        var state = createState(6, 2)
        state = pushHistory(state)
        state = state.copy(grid = stampComponent(state.grid, listOf("[OK]"), 0, 0))
        assertTrue(gridToText(state.grid).startsWith("[OK]"))
        state = undo(state)
        assertTrue(gridToText(state.grid).trim().isEmpty())
        state = redo(state)
        assertTrue(gridToText(state.grid).startsWith("[OK]"))
    }

    @Test fun presetsLoaded() {
        assertEquals(23, PRESETS.size)
        assertEquals(PRESETS.first(), getPreset("button"))
    }
}
