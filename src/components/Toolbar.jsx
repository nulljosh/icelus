import { useState } from 'react';
import { t, partLabel } from '../i18n.js';
import './Toolbar.css';
import { PRESETS as STAMPS, CATEGORIES as STAMP_CATEGORIES, PACKS, PACK_CATEGORIES, LINE_TOOL, TEXT_TOOL, BANNER_TOOL, BOXY_TOOL, TYPE_TOOL, PHOTO_TOOL, TRACE_TOOL, SCREEN_TOOL,
  BRAILLE_TOOL, SHADE_PHOTO_TOOL, FILL_TOOL, CAPTURE_TOOL, BRUSH_TOOL, ERASER_TOOL, MARQUEE_TOOL, WAND_TOOL, GRADIENT_TOOL, ADJUST_TOOL } from '../lib/presets.js';
import { SCREEN_TEMPLATES } from '../lib/syntax.js';
import { RealThumb } from './RealLayer.jsx';

// The drawing tools sit with the parts so they are picked the same way. A beginner sees the parts first and
// four everyday tools; the rest wait in closed sections (search still finds everything).
const PRESETS = [LINE_TOOL, TEXT_TOOL, PHOTO_TOOL, SCREEN_TOOL, BRUSH_TOOL, ERASER_TOOL, GRADIENT_TOOL, ADJUST_TOOL, MARQUEE_TOOL, WAND_TOOL, TYPE_TOOL, CAPTURE_TOOL, BRAILLE_TOOL, SHADE_PHOTO_TOOL, TRACE_TOOL, FILL_TOOL, BANNER_TOOL, BOXY_TOOL, ...SCREEN_TEMPLATES, ...STAMPS, ...PACKS];
// The tools past the everyday four, in three closed sections so none of them crowds the basics.
const TOOL_GROUPS = {
  Paint: [BRUSH_TOOL, ERASER_TOOL, GRADIENT_TOOL, FILL_TOOL, ADJUST_TOOL],
  Pick: [MARQUEE_TOOL, WAND_TOOL],
  More: [TYPE_TOOL, CAPTURE_TOOL, BRAILLE_TOOL, SHADE_PHOTO_TOOL, TRACE_TOOL, BANNER_TOOL, BOXY_TOOL],
};
const GROUP_OF = new Map(Object.entries(TOOL_GROUPS).flatMap(([g, tools]) => tools.map(p => [p.id, g])));
const groupOf = p => GROUP_OF.get(p.id) ?? p.category;
const CATEGORIES = [...STAMP_CATEGORIES, LINE_TOOL.category, 'Screens', 'Paint', 'Pick', 'More', ...PACK_CATEGORIES];
const CLOSED = new Set(['Paint', 'Pick', 'More', ...PACK_CATEGORIES]);

// The row with the most marks says the most about a part, so that is the one previewed.
const preview = p => p.template.reduce((a, b) => (b.replace(/ /g, '').length > a.replace(/ /g, '').length ? b : a)).trim().slice(0, 12);

// In the real look a part shows as its control beside its name; tools and character parts keep their glyphs.
function Item({ preset, real }) {
  const thumb = real ? RealThumb({ preset }) : null;
  return thumb ? <><span className="toolbar-item-label">{partLabel(preset)}</span>{thumb}</>
    : <><span className="toolbar-item-preview">{preview(preset)}</span><span className="toolbar-item-label">{partLabel(preset)}</span></>;
}

export default function Toolbar({ selectedPreset, onSelectPreset, isOpen, mine = [], onRemoveMine, real = false }) {
  const [search, setSearch] = useState('');
  const all = [...PRESETS, ...mine];
  const at = CATEGORIES.indexOf('Paint');
  const categories = mine.length ? [...CATEGORIES.slice(0, at), 'Mine', ...CATEGORIES.slice(at)] : CATEGORIES;

  const query = search.trim().toLowerCase();
  const filtered = query
    ? all.filter(p => p.label.toLowerCase().includes(query) || partLabel(p).toLowerCase().includes(query))
    : null;

  return (
    <aside className={`toolbar${isOpen ? ' toolbar--mobile-open' : ''}`}>
      <div className="toolbar-search">
        <input
          className="toolbar-search-input"
          type="text"
          placeholder={t('search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label={t('search_label')}
        />
        {search && (
          <button
            className="toolbar-search-clear"
            onClick={() => setSearch('')}
            aria-label={t('clear_search')}
          >
            ×
          </button>
        )}
      </div>
      <div className="toolbar-body">
        {filtered ? (
          filtered.length > 0 ? (
            <section className="toolbar-section">
              {filtered.map(preset => (
                <button
                  key={preset.id}
                  className={`toolbar-item${selectedPreset?.id === preset.id ? ' toolbar-item--active' : ''}`}
                  onClick={() => onSelectPreset(preset)}
                  title={`${preset.template.join('\n')}`}
                >
                  <Item preset={preset} real={real} />
                </button>
              ))}
            </section>
          ) : (
            <div className="toolbar-no-results">{t('no_results')}</div>
          )
        ) : (
          categories.map(category => {
            const title = t(`cat_${category}`) === `cat_${category}` ? category : t(`cat_${category}`);
            const items = all.filter(p => groupOf(p) === category).map(preset => (
                <div key={preset.id} className="toolbar-item-wrap">
                  <button
                    className={`toolbar-item${selectedPreset?.id === preset.id ? ' toolbar-item--active' : ''}`}
                    onClick={() => onSelectPreset(preset)}
                    title={`${preset.template.join('\n')}`}
                  >
                    <Item preset={preset} real={real} />
                  </button>
                  {category === 'Mine' && (
                    <button className="toolbar-remove" onClick={() => onRemoveMine(preset.id)} aria-label={t('remove_from_palette', { name: partLabel(preset) })}>×</button>
                  )}
                </div>
            ));
            return CLOSED.has(category) ? (
              <details key={category} className="toolbar-section toolbar-section--closed">
                <summary className="toolbar-category">{title}</summary>
                {items}
              </details>
            ) : (
              <section key={category} className="toolbar-section">
                <div className="toolbar-category">{title}</div>
                {items}
              </section>
            );
          })
        )}
      </div>
    </aside>
  );
}
