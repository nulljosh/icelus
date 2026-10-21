// UI strings. English is the source; a key missing from a locale falls back to English, so a partial
// translation is safe to ship. The language is the viewer's (browser, or the picker), read once at load;
// picking another reloads. Same 27 languages as Atlin. Part labels translate by `part_<id>` keys.
// Each language is its own file, loaded only when it is the one in use (loadLanguage, before first render).
const loaders = import.meta.glob('./locales/*.json');
export const LOCALES = {};

export const en = {
  // header and menus
  undo: 'Undo', redo: 'Redo', undo_hint: 'Undo (Ctrl+Z)', redo_hint: 'Redo (Ctrl+Y)', clear: 'Clear', clear_canvas: 'Clear canvas',
  open: 'Open', open_file: 'Open file', export: 'Export', more: 'More', info: 'Info', add: 'Add', toggle_dark: 'Toggle dark mode',
  copy_text: 'Copy text', copy_markdown: 'Copy as Markdown', copy_lines: 'Copy as typed lines', copy_screens: 'Copy all screens',
  download_html: 'Download HTML', copy_share: 'Copy share link', copy_embed: 'Copy embed code', download_txt: 'Download .txt',
  download_image: 'Download image', save_project: 'Save project', plain_ascii: 'Plain ASCII only', stop_tracing: 'Stop tracing',
  // tour and sheets
  tour_title: 'Sketch a screen in plain text', tour_1: 'Pick a part on the left.',
  tour_2: 'Click the grid to stamp it. Drag to move, double-click to edit the text.',
  tour_3: 'Copy it, or export it as text, Markdown or an image.', tour_start: 'Start sketching',
  type_title: 'Type a screen', type_label: 'Screen in the typed syntax', type_help: 'Two spaces put parts side by side.',
  cancel: 'Cancel', draw_it: 'Draw it', save: 'Save', edit_text: 'Edit text', element_text: 'Element text',
  empty_title: 'A blank frame', empty_hint: 'Pick a part, then click the grid.',
  // palette
  search: 'Search...', search_label: 'Search components', clear_search: 'Clear search', no_results: 'No results',
  remove_from_palette: 'Remove {name} from the palette',
  // inspector
  inspector: 'Inspector', canvas: 'Canvas', col: 'Col', row: 'Row', size: 'Size', history: 'History', placing: 'Placing',
  click_to_place: 'Click canvas to place', selected: 'Selected', name: 'Name', position: 'Position', box_style: 'Box style', cat_More: 'More tools', describe: 'Describe', describe_title: 'Describe a screen', describe_hint: 'Say what the screen is for, and it appears on the canvas. Pick a screen first to change it.', describe_placeholder: 'A sign up screen with name, email and a terms checkbox', send: 'Send', describe_busy: 'Drawing your screen', describe_drew: 'Drew this', describe_changing: 'Changing {name}', describe_new: 'A new screen', describe_failed: 'Describe it did not answer. Try again.', look: 'Look', look_real: 'Real', look_text: 'Text', cat_Paint: 'Paint', cat_Pick: 'Pick', inspector_empty: 'Pick a part on the left to place it, or tap one on the canvas to change it.', done: 'Done',
  account: 'Account', profile: 'Profile', settings: 'Settings', menu_copy: 'Copy', menu_download: 'Download', menu_share: 'Share',
  snapshots: 'Snapshots', snapshot_name: 'Snapshot name', take_snapshot: 'Take Snapshot', restore: 'Restore', delete_snapshot: 'Delete snapshot', steps: 'Steps',
  actions: 'Actions', action_name: 'Action name', play_action: 'Play on selection', play_needs_selection: 'Select a part to play this on', delete_action: 'Delete action', record_action: 'Record Action', add_item: 'Add Item', auto_layout: 'Auto layout', make_sizes: 'Make sizes', own_text: 'Own words', own_style: 'Own style', swap_symbol: 'Swap', swap_pick: 'Another symbol', size_label: 'Size', size_phone: 'Phone', size_tablet: 'Tablet', size_desktop: 'Desktop', pin_x: 'Pin across', pin_y: 'Pin down', pin_left: 'Left', pin_right: 'Right', pin_both_x: 'Left and right', pin_center: 'Center', pin_top: 'Top', pin_bottom: 'Bottom', pin_both_y: 'Top and bottom', stop_recording: 'Stop Recording ({n} steps)',
  step_start: 'Opened', step_add: 'Add {part}', step_add_n: 'Add {n} parts', step_delete: 'Delete {part}', step_delete_n: 'Delete {n} parts',
  step_move: 'Move {part}', step_move_n: 'Move {n} parts', step_edit: 'Edit {part}', step_edit_n: 'Edit {n} parts', step_edit_canvas: 'Edit canvas',
  step_reorder: 'Reorder parts', step_replace: 'Replace canvas', step_clear: 'Clear canvas', step_change_n: 'Change {n} parts', sign_in: 'Sign in', sign_out: 'Sign out',
  create_account: 'Create account', email: 'Email', password: 'Password', password_hint: 'At least 8 characters.',
  forgot_password: 'Forgot password?', send_reset: 'Send reset link', check_inbox: 'Check your email',
  check_email: 'We sent a link to confirm your account. Open it, then sign in here.',
  reset_sent: 'If that address has an account, a reset link is on its way.',
  new_password: 'New password', save_password: 'Save password', password_saved: 'Password saved. You are signed in.',
  have_account: 'I have an account', no_account: 'Create an account',
  account_short: 'Optional, keeps your name', account_why: 'An account keeps your name with your work. Everything works without one.',
  signed_in_as: 'Signed in as {email}', display_name: 'Name', name_saved: 'Name saved.',
  delete_account: 'Delete account', delete_for_good: 'Delete for good', account_deleted: 'Your account is deleted.',
  delete_confirm: 'This deletes your account for good. Your sketches stay on this device.',
  auth_email: 'Enter a valid email address.', auth_password: 'Passwords need at least 8 characters.',
  auth_wrong: 'That email and password do not match.', auth_unconfirmed: 'Confirm your email first. The link is in your inbox.',
  auth_slow: 'Too many tries. Wait a minute and try again.', auth_offline: 'Could not reach the server. Check your connection.',
  auth_link_expired: 'That link has expired or was already used.', auth_failed: 'Something went wrong. Try again.',
  not_now: 'Not now', copy_handoff: 'Copy for Claude Code', drag_to_paint: 'Drag on the canvas to paint', drag_to_erase: 'Drag over paint to erase it', part_marquee: 'Select area', part_wand: 'Magic wand', cells_picked: '{n} cells', drag_to_pick: 'Drag to pick cells', tap_to_pick: 'Tap a mark to pick its run', copy_cells: 'Copy', cut_cells: 'Cut', fill_cells: 'Fill', deselect: 'Deselect', copied_cells: 'Copied {n} cells', part_gradient: 'Gradient', ramp_straight: 'Straight', ramp_round: 'Round', drag_to_ramp: 'Drag to lay a ramp', color_0: 'Black', color_1: 'Red', color_2: 'Green', color_3: 'Yellow', color_4: 'Blue', color_5: 'Magenta', color_6: 'Cyan', color_7: 'White', color_bright: 'Bright {name}', color_ink: 'Ink', color_paper: 'Paper', color_none: 'None', mask_crop: 'Crop', mask_top: 'Crop top', mask_right: 'Crop right', mask_bottom: 'Crop bottom', mask_left: 'Crop left', clip_to: 'Clip to', blend: 'Blend', blend_join: 'Join lines', blend_over: 'Over', blend_under: 'Under', blend_knockout: 'Knock out', copy_ansi: 'Copy as ANSI', copied_ansi: 'Copied with terminal colors', part_adjust: 'Adjust', part_adjustment: 'Adjustment', adjust_invert: 'Invert', adjust_dim: 'Dim', adjust_ascii: 'ASCII only', adjust_single: 'Single lines', adjust_double: 'Double lines', adjust_rounded: 'Rounded corners', adjust_heavy: 'Heavy lines', drag_to_adjust: 'Drag a box to adjust what is under it', part_brush: 'Brush', part_eraser: 'Eraser', part_paint: 'Paint', brush_size: 'Size', brush_mark: 'Mark', play: 'Play', back: 'Back', files: 'Files', not_on_screen: 'Not on a screen', new_file: 'New file', your_files: 'Your files', rename: 'Rename', open_now: 'Open now', just_now: 'Just now', minutes_ago: '{n} min ago', hours_ago: '{n} h ago', template_blank: 'Blank', template_sign_in: 'Sign in', template_onboarding: 'Onboarding', template_settings: 'Settings', template_inbox: 'Inbox', template_checkout: 'Checkout', present: 'Present', no_slides: 'Draw a screen first', previous: 'Previous', next: 'Next', slide_count: '{n} of {of}', save_pdf: 'Save as PDF', download_deck: 'Download deck', copy_react: 'Copy React code', copy_swiftui: 'Copy SwiftUI code', copied_react: 'Copied a React component', copied_swiftui: 'Copied a SwiftUI view', download_handoff: 'Download build brief', copied_handoff: 'Copied a build brief for Claude Code', handoff_name: 'Icelus project', show_variations: 'Show variations', keep_this: 'Keep this one', var_stacked: 'stacked', var_split: 'split', var_dense: 'dense', theme: 'Appearance', theme_light: 'Light', theme_dark: 'Dark', show_more: 'Show all controls', part_capture: 'Capture a page',
  capture_title: 'Capture a page', capture_label: 'Page address', capture_go: 'Capture', capture_busy: 'Reading the page…',
  capture_help: 'Icelus reads the page and writes it as typed lines. Change them if you like, then draw.',
  capture_failed: 'Could not read that page.',
  tour_lead: 'Put a screen together from parts, then copy it as plain text. Want a quick walk through?',
  tour_lesson: 'Show me how', tour_explore: 'I’ll look around', tutorial: 'Tutorial',
  lesson_count: 'Step {n} of {of}', lesson_skip: 'Skip', lesson_finish: 'Got it',
  lesson_pick: 'Pick Button from the parts on the left.', lesson_pick_phone: 'Tap Add, then pick Button.',
  lesson_place: 'Click anywhere on the grid to put the button there.', lesson_place_phone: 'Tap anywhere on the grid to put the button there.',
  lesson_edit: 'Press Edit text under the button, type new words like Sign up, then Save.',
  lesson_move: 'Now drag the button to a new spot.',
  lesson_copy: 'Open Export and choose Copy text.', lesson_copy_phone: 'Tap More, then Copy text.',
  lesson_done: 'Done. Your screen is plain text now. Paste it into a chat, a doc or a pull request.', opens: 'Opens', opens_none: 'Nothing', note: 'Note', note_hint: 'A note for you or an agent', resolve: 'Resolve',
  review: 'Review', review_run: 'Check now', review_clean: 'Nothing to fix',
  crit_off_grid: '{part} runs off the grid', crit_overlap: '{part} overlaps {other}', crit_broken_box: 'A box here is cut open',
  crit_vague_label: '{part} says "{word}", which is placeholder text', crit_no_empty_state: '{part} has no empty state',
  crit_no_error_state: '{part} has no error state', crit_open_note: 'Note on {part}: {note}', crit_off_system: '{part} is off the {style} style',
  crit_focus_order: '{part} is out of reading order, so focus jumps', crit_no_label: '{part} has no label: put words in it or just before it', crit_small_target_narrow: '{part} is too narrow to tap', crit_small_target_crowded: '{part} touches another control', crit_low_contrast: '{part} is hard to read on its paper: try {color} ink', fix_focus_order: 'Fix Focus Order',
  crit_distraction_stray: '{part}: a few stray marks', crit_distraction_empty: '{part} shows nothing', remove_distractions: 'Remove {n} distractions',
  design_system: 'Design system', remove_system: 'Remove {name}', system_loaded: 'Loaded {name}, {n} parts in Mine', spacing: 'Spacing', padding: 'Padding', every_box: 'Every box', copy_deck: 'Copy', copy_empty: 'No words on the canvas yet.', translate_to: 'Language', translate: 'Translate', translating: 'Translating', translate_failed: 'Translate did not answer. Try again.', code: 'Code', copy_code: 'Copy Code', copied_code: 'Copied', spacing_sides: 'Left {left}, right {right}, top {top}, bottom {bottom}', grid_columns: 'Columns', grid_off: 'Off', grid_gutter: 'Gutter', grid_everywhere: 'Use on Every Screen', download_library: 'Download library', library_name: 'Library', library_loaded: 'Opened {name}: {n} parts in Mine, linked copies updated', canvas_lines: 'Lines', canvas_lines_own: 'Each part its own', add_var: 'Add Spacing', remove_var: 'Remove {name}', use_var: 'Variable for {name}', own_value: 'Own value',
  highlight: 'Highlight', duplicate: 'Duplicate', save_to_palette: 'Save to palette', to_front: 'To front', to_back: 'To back',
  delete: 'Delete', language: 'Language', rows: 'Rows', columns: 'Columns', add_row: 'Add row', remove_row: 'Remove row',
  add_column: 'Add column', remove_column: 'Remove column', head: 'Head', group_n: 'Group {n}', ungroup: 'Ungroup',
  layers: 'Layers', hide: 'Hide', show: 'Show', lock: 'Lock', unlock: 'Unlock', layer_up: 'Move up', layer_down: 'Move down',
  symbol: 'Symbol', symbol_uses: '{n} copies', make_symbol: 'Make symbol', detach: 'Detach',
  state: 'State', variant_default: 'Default', variant_pressed: 'Pressed', variant_disabled: 'Disabled', variant_error: 'Error',
  fill: 'Shade', fill_light: 'Light', fill_medium: 'Medium', fill_dark: 'Dark', fill_solid: 'Solid',
  keys_hint: 'Drag to move. Arrows nudge, Shift for 5. Cmd+D duplicates, [ and ] reorder, Delete removes.',
  // toasts
  copied: 'Copied', copied_markdown: 'Copied as Markdown', copied_screens: 'Copied every screen as one document',
  copied_lines: 'Copied as typed lines', copied_lines_skipped: 'Copied, without {n} parts the syntax has no word for',
  share_copied: 'Share link copied', embed_copied: 'Embed code copied', copy_blocked: 'Copy was blocked',
  open_failed: 'Could not open that file', file_too_big: 'That file is too big', opened: 'Opened {name}',
  imported: 'Imported {name} as parts you can edit', pasted: 'Pasted as parts you can edit',
  photo_failed: 'That photo could not be opened', share_broken: 'That share link is broken',
  share_opened: 'Opened a shared sketch. Undo brings yours back.', in_palette: '{name} is in your palette, under Mine',
  // the grid, for screen readers
  canvas_label: 'Canvas. Arrows move the cursor, Enter places the chosen part or selects one, Tab moves between parts, Escape lets go.',
  grid_role: 'wireframe grid', at_cell: 'Column {col}, row {row}', on_part: '{cell}, on {part}', placed: 'Placed {name} at column {col}, row {row}',
  selected_part: 'Selected {part}', arrow_start: 'Arrow starts here. Move, then press Enter where it ends.', arrow_drawn: 'Arrow drawn',
  nothing_selected: 'Nothing selected. Arrows move the cursor.', part_where: '{label}{words}, column {col}, row {row}, {w} by {h}',
};

export const RTL = ['ar', 'he', 'fa', 'ur'];
export const LANGUAGES = ['en', ...Object.keys(loaders).map(p => p.slice(10, -5))];
const KEY = 'glyphic-language';

// Browser preference to a language we have. Script matters for Chinese.
export function resolveLanguage(preferred) {
  for (const raw of preferred) {
    if (!raw) continue;
    let tag;
    try { tag = new Intl.Locale(raw); } catch { continue; }
    if (tag.language === 'zh') return tag.maximize().script === 'Hant' ? 'zh-Hant' : 'zh-Hans';
    if (LANGUAGES.includes(tag.baseName)) return tag.baseName;
    if (LANGUAGES.includes(tag.language)) return tag.language;
  }
  return 'en';
}

const stored = (() => { try { return localStorage.getItem(KEY); } catch { return null; } })();
export const language = LANGUAGES.includes(stored) ? stored
  : resolveLanguage(typeof navigator === 'undefined' ? [] : navigator.languages || [navigator.language]);

export async function loadLanguage(lang = language) {
  if (lang === 'en' || LOCALES[lang]) return;
  try { LOCALES[lang] = (await loaders[`./locales/${lang}.json`]()).default; } catch { /* offline first load: English */ }
}

export function t(key, vars = {}, lang = language) {
  const s = LOCALES[lang]?.[key] ?? en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

// A part's label in the viewer's language, falling back to its English label.
export const partLabel = (p, lang = language) => LOCALES[lang]?.[`part_${p.id}`] ?? p.label;

export function languageName(code) {
  try { return new Intl.DisplayNames([code], { type: 'language' }).of(code) || code; } catch { return code; }
}

export function setLanguage(code) {
  try { localStorage.setItem(KEY, code); } catch { /* blocked storage: stays for this load only */ }
  window.location.reload();
}

if (typeof document !== 'undefined') {
  document.documentElement.lang = language;
  document.documentElement.dir = RTL.includes(language) ? 'rtl' : 'ltr';
}
