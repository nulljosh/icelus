import { bannerText, screenFrame, chartFrame } from './engine.js';
import { maxOf } from './extent.js';

const chart = (id, label, category, text) => {
  const template = chartFrame(id, text);
  return { id, label, category, text, template, width: maxOf(template.map(l => [...l].length)), height: template.length };
};

// Component presets — Unicode box-drawing wireframe templates
// Each preset has: id, label, category, template (array of strings), width, height

export const PRESETS = [
  {
    id: 'button',
    label: 'Button',
    category: 'Input',
    template: ['[ OK ]'],
    width: 6,
    height: 1,
  },
  {
    id: 'input',
    label: 'Input',
    category: 'Input',
    template: ['[____________]'],
    width: 14,
    height: 1,
  },
  {
    id: 'select',
    label: 'Select',
    category: 'Input',
    template: ['[▾           ]'],
    width: 14,
    height: 1,
  },
  {
    id: 'checkbox',
    label: 'Checkbox',
    category: 'Input',
    template: ['[✓] Label'],
    width: 9,
    height: 1,
  },
  {
    id: 'radio',
    label: 'Radio',
    category: 'Input',
    template: ['(●) Option'],
    width: 10,
    height: 1,
  },
  {
    id: 'toggle',
    label: 'Toggle',
    category: 'Input',
    template: ['[●━━━━━]'],
    width: 8,
    height: 1,
  },
  {
    id: 'table',
    label: 'Table',
    category: 'Data',
    template: [
      '┌──────┬──────┬──────┐',
      '│ Head │ Head │ Head │',
      '├──────┼──────┼──────┤',
      '│ Cell │ Cell │ Cell │',
      '│ Cell │ Cell │ Cell │',
      '└──────┴──────┴──────┘',
    ],
    width: 22,
    height: 6,
  },
  {
    id: 'modal',
    label: 'Modal',
    category: 'Overlay',
    template: [
      '┌────────────[×]──────┐',
      '│ Modal Title         │',
      '│                     │',
      '│ Content goes here   │',
      '│                     │',
      '│         [ Cancel ]  [ OK ] │',
      '└─────────────────────┘',
    ],
    width: 25,
    height: 7,
  },
  {
    id: 'browser',
    label: 'Browser',
    category: 'Layout',
    template: [
      '┌─────────────────────────────┐',
      '│ ◄ ► ⟳  [___________________]│',
      '├─────────────────────────────┤',
      '│                             │',
      '│                             │',
      '│                             │',
      '└─────────────────────────────┘',
    ],
    width: 33,
    height: 7,
  },
  {
    id: 'card',
    label: 'Card',
    category: 'Layout',
    template: [
      '┌──────────────────┐',
      '│ Card Title       │',
      '│                  │',
      '│ Card content     │',
      '│ goes here.       │',
      '│                  │',
      '│ [ Action ]       │',
      '└──────────────────┘',
    ],
    width: 20,
    height: 8,
  },
  {
    id: 'navbar',
    label: 'Navbar',
    category: 'Layout',
    template: [
      '┌─────────────────────────────────┐',
      '│ ≡  Logo            Search    ☆  │',
      '└─────────────────────────────────┘',
    ],
    width: 35,
    height: 3,
  },
  {
    id: 'tabs',
    label: 'Tabs',
    category: 'Layout',
    template: [
      '┌──────┐  ────────  ────────',
      '│ Tab1 │   Tab 2     Tab 3  ',
      '├──────┴──────────────────┐',
      '│ Content                  │',
      '└──────────────────────────┘',
    ],
    width: 30,
    height: 5,
  },
  chart('progress', 'Progress', 'Feedback', '42'),
  {
    id: 'icon',
    label: 'Icon',
    category: 'Media',
    template: ['★'],
    width: 1,
    height: 1,
  },
  {
    id: 'image',
    label: 'Image',
    category: 'Media',
    template: [
      '╔══════════════╗',
      '║              ║',
      '║   [ img ]    ║',
      '║              ║',
      '╚══════════════╝',
    ],
    width: 16,
    height: 5,
  },
  {
    id: 'divider',
    label: 'Divider',
    category: 'Layout',
    template: ['─────────────────────'],
    width: 21,
    height: 1,
  },
  {
    id: 'alert',
    label: 'Alert',
    category: 'Feedback',
    template: [
      '┌──────────────────────────┐',
      '│ ⚠  Warning message here  │',
      '└──────────────────────────┘',
    ],
    width: 28,
    height: 3,
  },
  {
    id: 'breadcrumb',
    label: 'Breadcrumb',
    category: 'Navigation',
    template: ['Home > Section > Page'],
    width: 21,
    height: 1,
  },
  {
    id: 'avatar',
    label: 'Avatar',
    category: 'Media',
    template: [
      '╭──╮',
      '│DH│',
      '╰──╯',
    ],
    width: 4,
    height: 3,
  },
  {
    id: 'list',
    label: 'List',
    category: 'Data',
    template: [
      '• Item one',
      '• Item two',
      '• Item three',
    ],
    width: 12,
    height: 3,
  },
  {
    id: 'stepper',
    label: 'Stepper',
    category: 'Navigation',
    template: ['● ─────── ○ ─────── ○'],
    width: 21,
    height: 1,
  },
  {
    id: 'rating',
    label: 'Rating',
    category: 'Feedback',
    template: ['★★★☆☆'],
    width: 5,
    height: 1,
  },
  {
    id: 'skeleton',
    label: 'Skeleton',
    category: 'Feedback',
    template: [
      '░░░░░░░░░░░░░░░░░░░░',
      '░░░░░░░░░░░░░░',
      '░░░░░░░░░░░░░░░░░',
    ],
    width: 20,
    height: 3,
  },
  {
    id: 'search',
    label: 'Search',
    category: 'Input',
    template: ['( Search          )'],
    width: 19,
    height: 1,
  },
  {
    id: 'segmented',
    label: 'Segmented',
    category: 'Input',
    template: ['[ Day | Week | Month ]'],
    width: 22,
    height: 1,
  },
  {
    id: 'slider',
    label: 'Slider',
    category: 'Input',
    template: ['──────●────────'],
    width: 15,
    height: 1,
  },
  {
    id: 'textarea',
    label: 'Text area',
    category: 'Input',
    template: ['┌────────────────────┐', '│ Write something... │', '│                    │', '│                    │', '└────────────────────┘'],
    width: 22,
    height: 5,
  },
  {
    id: 'datepicker',
    label: 'Date picker',
    category: 'Input',
    template: ['┌─ October ────────────┐', '│ Mo Tu We Th Fr Sa Su │', '│           1  2  3  4 │', '│  5  6  7  8  9 10 11 │', '│ 12 13 14 15 16 17 18 │', '└──────────────────────┘'],
    width: 24,
    height: 6,
  },
  {
    id: 'tabbar',
    label: 'Tab bar',
    category: 'Navigation',
    template: ['┌─────────────────────────────────┐', '│ Home   Search   Saved   Profile │', '└─────────────────────────────────┘'],
    width: 35,
    height: 3,
  },
  {
    id: 'pagination',
    label: 'Pagination',
    category: 'Navigation',
    template: ['‹ Prev   1  2  3  …  9   Next ›'],
    width: 31,
    height: 1,
  },
  {
    id: 'sidebar',
    label: 'Sidebar',
    category: 'Layout',
    template: ['┌───────────┐', '│ ▸ Inbox   │', '│   Drafts  │', '│   Sent    │', '│   Archive │', '└───────────┘'],
    width: 13,
    height: 6,
  },
  {
    id: 'accordion',
    label: 'Accordion',
    category: 'Layout',
    template: ['▾ Section one       ', '  Content goes here.', '▸ Section two       ', '▸ Section three     '],
    width: 20,
    height: 4,
  },
  {
    id: 'toast',
    label: 'Toast',
    category: 'Feedback',
    template: ['┌─────────────────────────┐', '│ ✓ Saved to your project │', '└─────────────────────────┘'],
    width: 27,
    height: 3,
  },
  {
    id: 'tooltip',
    label: 'Tooltip',
    category: 'Feedback',
    template: ['┌─────────────┐', '│ Helpful tip │', '└──────┬──────┘', '       ▼       '],
    width: 15,
    height: 4,
  },
  {
    id: 'tags',
    label: 'Tags',
    category: 'Data',
    template: ['(Design) (Text) (Free)'],
    width: 22,
    height: 1,
  },
  chart('chart', 'Bar chart', 'Data', 'Mon 4\nTue 7\nWed 3\nThu 8'),
  chart('sparkline', 'Sparkline', 'Data', '3 5 2 8 6 9 4 7'),
  {
    id: 'code',
    label: 'Code block',
    category: 'Media',
    template: ['┌─ code ───────────────────┐', '│ const screen = sketch(); │', '│ paste(screen);           │', '└──────────────────────────┘'],
    width: 28,
    height: 4,
  },
];

export const CATEGORIES = [...new Set(PRESETS.map(p => p.category))];

// Part packs: parts in the style of a platform. Kept apart from the core parts so the palette groups them,
// and getPreset finds them so agents can place them too. Ported line for line in ios/App/Presets.swift.
export const PACKS = [
  { id: 'ios-nav', label: 'Nav bar', category: 'iOS', width: 27, height: 1,
    template: ['‹ Back      Title      Edit'] },
  { id: 'ios-list', label: 'Inset list', category: 'iOS', width: 27, height: 5,
    template: ['╭─────────────────────────╮', '│ Wi-Fi             On  › │', '├─────────────────────────┤', '│ Bluetooth         On  › │', '╰─────────────────────────╯'] },
  { id: 'ios-switch', label: 'Switch row', category: 'iOS', width: 26, height: 1,
    template: ['Airplane mode          ◯━━'] },
  { id: 'ios-sheet', label: 'Sheet', category: 'iOS', width: 26, height: 5,
    template: ['╭────────────────────────╮', '│          ━━━           │', '│ Share                  │', '│ Copy   Print   Save    │', '╰────────────────────────╯'] },
  { id: 'md-appbar', label: 'Top app bar', category: 'Material', width: 25, height: 3,
    template: ['┏━━━━━━━━━━━━━━━━━━━━━━━┓', '┃ ≡  Title            ⋮ ┃', '┗━━━━━━━━━━━━━━━━━━━━━━━┛'] },
  { id: 'md-fab', label: 'Action button', category: 'Material', width: 5, height: 3,
    template: ['╭───╮', '│ + │', '╰───╯'] },
  { id: 'md-chips', label: 'Chips', category: 'Material', width: 35, height: 1,
    template: ['( Filter ✓ )  ( Sort )  ( Near me )'] },
  { id: 'md-snackbar', label: 'Snackbar', category: 'Material', width: 30, height: 3,
    template: ['┌────────────────────────────┐', '│ Message sent          UNDO │', '└────────────────────────────┘'] },
  { id: 'term-prompt', label: 'Prompt', category: 'Terminal', width: 24, height: 1,
    template: ['$ icelus draw screen.txt'] },
  { id: 'term-progress', label: 'Progress', category: 'Terminal', width: 22, height: 1,
    template: ['[██████████░░░░░░] 62%'] },
  { id: 'term-menu', label: 'Menu', category: 'Terminal', width: 10, height: 3,
    template: ['> Start', '  Settings', '  Quit'] },
  { id: 'term-window', label: 'Window', category: 'Terminal', width: 29, height: 4,
    template: ['┌─ ~/project ───────────────┐', '│ $ npm test                │', '│ 103 passed                │', '└───────────────────────────┘'] },
  { id: 'email-header', label: 'Header', category: 'Email', width: 27, height: 3,
    template: ['From: Ada <ada@example.com>', 'Subject: Lunch?', '───────────────────────────'] },
  { id: 'email-button', label: 'Email button', category: 'Email', width: 21, height: 3,
    template: ['╔═══════════════════╗', '║   Confirm email   ║', '╚═══════════════════╝'] },
  { id: 'email-hero', label: 'Hero image', category: 'Email', width: 30, height: 6,
    template: ['┌────────────────────────────┐', '│                            │', '│         [ image ]          │', '│                            │', '│                            │', '└────────────────────────────┘'] },
  { id: 'email-footer', label: 'Footer', category: 'Email', width: 35, height: 2,
    template: ['You got this because you signed up.', 'Unsubscribe · Preferences'] },
];
export const PACK_CATEGORIES = [...new Set(PACKS.map(p => p.category))];

export function getPreset(id) {
  return PRESETS.find(p => p.id === id) ?? PACKS.find(p => p.id === id) ?? null;
}

// Not a stamp: pick it, then drag on the canvas from where the line starts to where the arrow points.
export const LINE_TOOL = { id: 'line', label: 'Arrow', category: 'Draw', template: ['───▶'], width: 4, height: 1 };

// Click to drop a text box, then type. Text is see-through, so it can sit on top of a part.
export const TEXT_TOOL = { id: 'text', label: 'Text', category: 'Draw', template: ['Text'], width: 4, height: 1 };

// Big block letters for a title. Edit the words and the letters redraw.
const BANNER = bannerText('TITLE');
export const BANNER_TOOL = { id: 'banner', label: 'Banner', category: 'Draw', template: BANNER, width: [...BANNER[0]].length, height: 3, text: 'TITLE' };

// Boxy in plain text, so the mascot pastes anywhere the wireframes do.
export const BOXY_TOOL = {
  id: 'boxy', label: 'Boxy', category: 'Draw',
  template: ['   ▌   ', '╭─────╮', '│ ● ● │', '│  ◡  │', '╰─┬─┬─╯'], width: 7, height: 5,
};

// Paint any character freehand, one to five cells wide (brush.js). The eraser clears painted cells only.
export const BRUSH_TOOL = { id: 'brush', label: 'Brush', category: 'Draw', template: ['█▓▒░'], width: 4, height: 1 };
export const ERASER_TOOL = { id: 'eraser', label: 'Eraser', category: 'Draw', template: ['█▓▒ '], width: 4, height: 1 };
// Drag to lay a ░ ▒ ▓ █ ramp, straight or round, as one stroke of paint (gradient.js).
export const GRADIENT_TOOL = { id: 'gradient', label: 'Gradient', category: 'Draw', template: ['░▒▓█'], width: 4, height: 1 };
// Drag a box for an adjustment layer: invert, dim, ASCII only or a box style for everything under it.
export const ADJUST_TOOL = { id: 'adjust', label: 'Adjust', category: 'Draw', template: ['┏━◐┓'], width: 4, height: 1 };
// Pick cells, not parts: a marquee drags a rectangle, the wand takes a run of one character (select.js).
export const MARQUEE_TOOL = { id: 'marquee', label: 'Select area', category: 'Draw', template: ['┌╌╌┐'], width: 4, height: 1 };
export const WAND_TOOL = { id: 'wand', label: 'Magic wand', category: 'Draw', template: ['╱✦'], width: 2, height: 1 };

// Opens a sheet where you type a whole screen in the typed syntax (src/lib/syntax.js).
export const TYPE_TOOL = { id: 'type', label: 'Type it', category: 'Draw', template: ['[OK] "Email"'], width: 12, height: 1 };
// Capture a page: a web address in, the page as typed lines out (capture.js, POST /api/capture).
export const CAPTURE_TOOL = { id: 'capture', label: 'Capture a page', category: 'Draw', template: ['www ⇣ [ ]'], width: 9, height: 1 };

// Opens a photo and draws it in block characters (src/lib/photo.js).
export const PHOTO_TOOL = { id: 'photo', label: 'Photo', category: 'Draw', template: ['▄█▀▄█'], width: 5, height: 1 };

// Shows a photo faintly under the grid to draw over. It is never saved or exported.
export const TRACE_TOOL = { id: 'trace', label: 'Trace a photo', category: 'Draw', template: ['░▒▓'], width: 3, height: 1 };
// The photo in its finer looks: braille (eight dots a cell) and soft shade (░ ▒ ▓ █). See photo.js.
export const BRAILLE_TOOL = { id: 'photo-braille', label: 'Braille photo', category: 'Draw', template: ['⣿⡣⡃⡀'], width: 4, height: 1 };
export const SHADE_PHOTO_TOOL = { id: 'photo-shade', label: 'Shade photo', category: 'Draw', template: ['█▓▒░'], width: 4, height: 1 };
// A shaded fill for emphasis or a backdrop: one shade character, any size. The inspector picks the shade.
export { FILLS } from './shapes.js';
export const FILL_TOOL = { id: 'fill', label: 'Shade', category: 'Draw', template: ['▒▒▒▒▒▒▒▒', '▒▒▒▒▒▒▒▒', '▒▒▒▒▒▒▒▒'], width: 8, height: 3 };

// A screen: a named frame that carries the parts inside it. Several sit side by side on one canvas.
export const SCREEN_TOOL = { id: 'screen', label: 'Screen', category: 'Draw', template: screenFrame('Screen', 40, 22), width: 40, height: 22, text: 'Screen' };
