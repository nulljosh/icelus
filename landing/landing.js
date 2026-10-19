// Landing behaviour: the hero's scroll offset (--sy) for the parallax, and fade-up on scroll. Nothing here is needed to read the page.
(function () {
  document.documentElement.classList.add('js');
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function () {
    var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (still || !('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('in'); }); }
    else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -8% 0px' });
      items.forEach(function (el) { io.observe(el); });
    }
    var hero = document.getElementById('hero');
    if (!hero || still) return;
    var tick = false;
    window.addEventListener('scroll', function () {
      if (tick) return;
      tick = true;
      requestAnimationFrame(function () { hero.style.setProperty('--sy', Math.min(window.scrollY || 0, 1000)); tick = false; });
    }, { passive: true });
  });
})();
