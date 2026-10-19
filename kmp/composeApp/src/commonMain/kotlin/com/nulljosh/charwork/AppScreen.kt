package com.nulljosh.charwork

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun IcelusTheme(content: @Composable () -> Unit) =
    MaterialTheme(colorScheme = lightColorScheme(), content = content)

private const val CHAR_W = 9f
private const val CHAR_H = 16f

@Composable
fun AppScreen() {
    var state by remember { mutableStateOf(createState(60, 30)) }
    var selected by remember { mutableStateOf(PRESETS.first()) }
    val textMeasurer = rememberTextMeasurer()
    val monoStyle = TextStyle(fontFamily = FontFamily.Monospace, fontSize = 13.sp)

    fun place(col: Int, row: Int) {
        val withHistory = pushHistory(state)
        state = withHistory.copy(grid = stampComponent(withHistory.grid, selected.template, col, row))
    }

    Surface {
        Column(Modifier.fillMaxSize().padding(24.dp)) {
            Text("Icelus", style = MaterialTheme.typography.headlineMedium)
            Row(Modifier.padding(top = 8.dp)) {
                Button(onClick = { state = undo(state) }) { Text("Undo") }
                Button(onClick = { state = redo(state) }, modifier = Modifier.padding(start = 8.dp)) { Text("Redo") }
                Button(
                    onClick = { state = pushHistory(state).copy(grid = createGrid(state.cols, state.rows)) },
                    modifier = Modifier.padding(start = 8.dp),
                ) { Text("Clear") }
            }
            Row(Modifier.padding(top = 8.dp).horizontalScroll(rememberScrollState())) {
                PRESETS.forEach { p ->
                    Button(onClick = { selected = p }, modifier = Modifier.padding(end = 4.dp)) {
                        Text(p.label)
                    }
                }
            }
            Canvas(
                Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp)
                    .pointerInput(selected) {
                        detectTapGestures { offset ->
                            val cell = pxToCell(offset.x.toDouble(), offset.y.toDouble(), CHAR_W.toDouble(), CHAR_H.toDouble())
                            place(cell.col, cell.row)
                        }
                    },
            ) {
                drawText(
                    textMeasurer = textMeasurer,
                    text = gridToText(state.grid),
                    style = monoStyle,
                )
            }
        }
    }
}
