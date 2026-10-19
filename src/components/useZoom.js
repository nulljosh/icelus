// Zoom, pinch and scroll for the canvas. Zoom scales the cell, not the page, so text redraws sharp and the
// cell maths stay exact. Split from Canvas.jsx to keep each file small.
import { useRef, useEffect, useLayoutEffect, useCallback, useState } from 'react';

export function useZoom(hoverRef) {
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  zoomRef.current = zoom;
  const scrollRef = useRef(null);
  const anchorRef = useRef(null); // the point to keep under the cursor while zooming
  const zoomTo = useCallback((next, clientX, clientY) => {
    const z = Math.min(3, Math.max(0.5, next));
    const el = scrollRef.current;
    if (el && clientX !== undefined) {
      const r = el.getBoundingClientRect();
      anchorRef.current = { x: clientX - r.left, y: clientY - r.top, cx: el.scrollLeft + clientX - r.left, cy: el.scrollTop + clientY - r.top, ratio: z / zoomRef.current };
    }
    setZoom(z);
  }, []);
  useLayoutEffect(() => {
    const a = anchorRef.current, el = scrollRef.current;
    if (!a || !el) return;
    el.scrollLeft = a.cx * a.ratio - a.x;
    el.scrollTop = a.cy * a.ratio - a.y;
    anchorRef.current = null;
  }, [zoom]);
  // Only visible cells are drawn, so a scroll redraws (once per frame) through the canvas's latest draw.
  const drawRef = useRef(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => drawRef.current?.(hoverRef.current)); };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, [hoverRef]);
  // Pinch on a trackpad arrives as ctrl+wheel (Chrome, Firefox) or gesture events (Safari).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let start = 1;
    const wheel = e => {
      if (!e.ctrlKey && !e.metaKey) return; // plain two-finger scroll pans
      e.preventDefault();
      zoomTo(zoomRef.current * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
    };
    const gStart = e => { e.preventDefault(); start = zoomRef.current; };
    const gChange = e => { e.preventDefault(); zoomTo(start * e.scale, e.clientX, e.clientY); };
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('gesturestart', gStart);
    el.addEventListener('gesturechange', gChange);
    return () => {
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('gesturestart', gStart);
      el.removeEventListener('gesturechange', gChange);
    };
  }, [zoomTo]);
  return { zoom, zoomRef, zoomTo, scrollRef, drawRef };
}
