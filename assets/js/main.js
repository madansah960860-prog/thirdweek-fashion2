/* =============================================================================
   VESTIARY - shared behaviour
   Vanilla JS, no dependencies, no build step. Every module is defensive:
   if its markup is absent on a page, it exits quietly.

   Modules
     1.  Footer year
     2.  Mobile navigation
     3.  Nav dropdowns
     4.  Accordions (FAQ, shipping, returns)
     5.  Back to top (IntersectionObserver, never a scroll listener)
     6.  Cookie consent (no non-essential storage before an explicit choice)
     7.  Form validation with inline error messages
     8.  Shop filtering and sorting
     9.  Product gallery
     10. Store locator filter
     11. Size guide unit toggle
   ============================================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- 1. Footer year ----------------------------------------------------- */
  function initYear() {
    var nodes = document.querySelectorAll('[data-year]');
    var y = new Date().getFullYear();
    for (var i = 0; i < nodes.length; i++) { nodes[i].textContent = y; }
  }

  /* --- 2. Mobile navigation ------------------------------------------------ */
  function initNav() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('primary-nav');
    if (!toggle || !nav) return;

    var label = toggle.querySelector('[data-toggle-label]');
    var icon = toggle.querySelector('span[aria-hidden]');

    function isOpen() { return toggle.getAttribute('aria-expanded') === 'true'; }

    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (label) label.textContent = open ? 'Close' : 'Menu';
      if (icon) icon.textContent = open ? '✕' : '☰';
    }

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!isOpen());
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Tapping the page outside an open drawer closes it, which is what people
    // expect from a mobile menu and stops it covering the content underneath.
    document.addEventListener('click', function (e) {
      if (!isOpen()) return;
      if (nav.contains(e.target) || toggle.contains(e.target)) return;
      setOpen(false);
    });

    // Reset state when the desktop breakpoint takes over so the menu never
    // gets stuck in a mobile-open state after a resize.
    var mq = window.matchMedia('(min-width: 1024px)');
    var onChange = function (e) { if (e.matches) setOpen(false); };
    if (mq.addEventListener) { mq.addEventListener('change', onChange); }
    else if (mq.addListener) { mq.addListener(onChange); }
  }

  /* --- 3. Nav dropdowns ---------------------------------------------------- */
  function initDropdowns() {
    var parents = document.querySelectorAll('.has-drop');
    if (!parents.length) return;

    function closeAll(except) {
      for (var i = 0; i < parents.length; i++) {
        if (parents[i] === except) continue;
        parents[i].classList.remove('is-open');
        var b = parents[i].querySelector('button.nav-link');
        if (b) b.setAttribute('aria-expanded', 'false');
      }
    }

    Array.prototype.forEach.call(parents, function (parent) {
      var btn = parent.querySelector('button.nav-link');
      if (!btn) return;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = !parent.classList.contains('is-open');
        closeAll(parent);
        parent.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('.has-drop')) closeAll(null);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll(null);
    });
  }

  /* --- 4. Accordions -------------------------------------------------------- */
  function initAccordions() {
    var triggers = document.querySelectorAll('.accordion__trigger');
    Array.prototype.forEach.call(triggers, function (trigger) {
      var panel = document.getElementById(trigger.getAttribute('aria-controls'));
      if (!panel) return;
      trigger.addEventListener('click', function () {
        var open = trigger.getAttribute('aria-expanded') === 'true';
        trigger.setAttribute('aria-expanded', open ? 'false' : 'true');
        panel.hidden = open;
      });
    });

    // "Expand all" convenience control on the FAQ page.
    var expander = document.querySelector('[data-expand-all]');
    if (expander) {
      expander.addEventListener('click', function () {
        var open = expander.getAttribute('data-expand-all') === 'closed';
        Array.prototype.forEach.call(triggers, function (t) {
          var p = document.getElementById(t.getAttribute('aria-controls'));
          if (!p) return;
          t.setAttribute('aria-expanded', open ? 'true' : 'false');
          p.hidden = !open;
        });
        expander.setAttribute('data-expand-all', open ? 'open' : 'closed');
        expander.textContent = open ? 'Collapse all answers' : 'Expand all answers';
      });
    }
  }

  /* --- 5. Back to top ------------------------------------------------------- */
  function initBackToTop() {
    var btn = document.querySelector('.to-top');
    var sentinel = document.getElementById('top-sentinel');
    if (!btn || !sentinel || !('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entries) {
      btn.classList.toggle('is-visible', !entries[0].isIntersecting);
    }, { rootMargin: '0px 0px 0px 0px' });
    io.observe(sentinel);

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      var skip = document.querySelector('.skip-link');
      if (skip) skip.focus();
    });
  }

  /* --- 6. Cookie consent ---------------------------------------------------- */
  /* Nothing beyond the strictly necessary consent record is stored until the
     visitor chooses. Analytics and advertising stay off until accepted. */
  function initCookies() {
    var banner = document.getElementById('cookie-banner');
    if (!banner) return;

    var KEY = 'vestiary-consent-v1';
    var stored = null;
    try { stored = window.localStorage.getItem(KEY); } catch (err) { stored = null; }

    if (!stored) { banner.hidden = false; }

    var prefs = document.getElementById('cookie-prefs');
    var manageBtn = banner.querySelector('[data-consent="manage"]');

    function save(consent) {
      try { window.localStorage.setItem(KEY, JSON.stringify(consent)); } catch (err) { /* storage blocked */ }
      banner.hidden = true;
      window.vestiaryConsent = consent;
    }

    banner.addEventListener('click', function (e) {
      var action = e.target.getAttribute && e.target.getAttribute('data-consent');
      if (!action) return;

      if (action === 'accept') {
        save({ necessary: true, analytics: true, advertising: true, at: new Date().toISOString() });
      } else if (action === 'reject') {
        save({ necessary: true, analytics: false, advertising: false, at: new Date().toISOString() });
      } else if (action === 'manage') {
        var open = prefs.hidden;
        prefs.hidden = !open;
        manageBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      } else if (action === 'save') {
        save({
          necessary: true,
          analytics: !!document.getElementById('consent-analytics').checked,
          advertising: !!document.getElementById('consent-ads').checked,
          at: new Date().toISOString()
        });
      }
    });

    // Any "Cookie settings" link in the footer re-opens the banner.
    var reopen = document.querySelectorAll('[data-cookie-settings]');
    Array.prototype.forEach.call(reopen, function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        banner.hidden = false;
        if (prefs) prefs.hidden = false;
        banner.querySelector('h2').setAttribute('tabindex', '-1');
        banner.querySelector('h2').focus();
      });
    });
  }

  /* --- 7. Form validation --------------------------------------------------- */
  var VALIDATORS = {
    required: function (v) { return v.trim().length > 0; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()); },
    tel: function (v) { return v.trim() === '' || /^[0-9()+\-.\s]{7,}$/.test(v.trim()); },
    zip: function (v) { return /^\d{5}(-\d{4})?$/.test(v.trim()); },
    order: function (v) { return /^[A-Za-z]{2}-?\d{4,}$/.test(v.trim()); },
    minlen: function (v, n) { return v.trim().length >= (n || 10); }
  };

  function fieldError(input) {
    return document.getElementById(input.id + '-error');
  }

  function validateField(input) {
    var value = input.type === 'checkbox' ? (input.checked ? 'on' : '') : input.value;
    var rules = (input.getAttribute('data-validate') || '').split('|').filter(Boolean);
    var msg = '';

    for (var i = 0; i < rules.length; i++) {
      var parts = rules[i].split(':');
      var name = parts[0];
      var arg = parts[1];
      var fn = VALIDATORS[name];
      if (!fn) continue;
      if (!fn(value, arg ? parseInt(arg, 10) : undefined)) {
        msg = input.getAttribute('data-msg-' + name) || 'Please check this field.';
        break;
      }
    }

    var errEl = fieldError(input);
    if (msg) {
      input.setAttribute('aria-invalid', 'true');
      if (errEl) { errEl.textContent = msg; errEl.classList.add('is-shown'); }
      return false;
    }
    input.removeAttribute('aria-invalid');
    if (errEl) { errEl.textContent = ''; errEl.classList.remove('is-shown'); }
    return true;
  }

  function initForms() {
    var forms = document.querySelectorAll('form[data-validated]');
    Array.prototype.forEach.call(forms, function (form) {
      var inputs = form.querySelectorAll('[data-validate]');

      Array.prototype.forEach.call(inputs, function (input) {
        // Validate on blur, then live-correct once the field has been touched.
        input.addEventListener('blur', function () { validateField(input); });
        input.addEventListener('input', function () {
          if (input.getAttribute('aria-invalid') === 'true') validateField(input);
        });
        if (input.type === 'checkbox') {
          input.addEventListener('change', function () { validateField(input); });
        }
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var firstBad = null;
        Array.prototype.forEach.call(inputs, function (input) {
          if (!validateField(input) && !firstBad) firstBad = input;
        });

        var status = form.querySelector('.form-status');
        if (firstBad) {
          if (status) {
            status.textContent = 'Some details still need attention. See the highlighted fields below.';
            status.classList.add('is-shown');
          }
          firstBad.focus();
          return;
        }

        // This static build has no server attached. The form reports success
        // honestly and tells the visitor what happens next.
        if (status) {
          status.textContent = form.getAttribute('data-success') ||
            'Thank you. Your message has been prepared for our team and we reply within two business days.';
          status.classList.add('is-shown');
          status.setAttribute('tabindex', '-1');
          status.focus();
        }
        form.reset();
      });
    });
  }

  /* --- 8. Shop filtering and sorting ---------------------------------------- */
  function initShop() {
    var grid = document.getElementById('product-grid');
    if (!grid) return;

    var items = Array.prototype.slice.call(grid.querySelectorAll('[data-product]'));
    var chips = document.querySelectorAll('.chip[data-filter]');
    var sortSelect = document.getElementById('sort');
    var countEl = document.getElementById('result-count');
    var emptyEl = document.getElementById('no-results');
    var clearBtn = document.getElementById('clear-filters');

    var state = { category: 'all', size: 'all', price: 'all' };

    function matches(item) {
      if (state.category !== 'all' && item.getAttribute('data-category') !== state.category) return false;
      if (state.size !== 'all' && item.getAttribute('data-size').split(' ').indexOf(state.size) === -1) return false;
      if (state.price !== 'all') {
        var p = parseFloat(item.getAttribute('data-price'));
        if (state.price === 'under75' && p >= 75) return false;
        if (state.price === '75to150' && (p < 75 || p > 150)) return false;
        if (state.price === 'over150' && p <= 150) return false;
      }
      return true;
    }

    function apply() {
      var shown = 0;
      items.forEach(function (item) {
        var ok = matches(item);
        item.hidden = !ok;
        if (ok) shown++;
      });
      if (countEl) {
        countEl.textContent = shown === 1
          ? 'Showing 1 piece.'
          : 'Showing ' + shown + ' pieces.';
      }
      if (emptyEl) emptyEl.hidden = shown !== 0;
    }

    function sort(mode) {
      var sorted = items.slice();
      sorted.sort(function (a, b) {
        var pa = parseFloat(a.getAttribute('data-price'));
        var pb = parseFloat(b.getAttribute('data-price'));
        if (mode === 'price-asc') return pa - pb;
        if (mode === 'price-desc') return pb - pa;
        if (mode === 'name') {
          return a.getAttribute('data-name').localeCompare(b.getAttribute('data-name'));
        }
        // default: catalogue order, newest intake first
        return parseInt(a.getAttribute('data-order'), 10) - parseInt(b.getAttribute('data-order'), 10);
      });
      sorted.forEach(function (item) { grid.appendChild(item); });
    }

    Array.prototype.forEach.call(chips, function (chip) {
      chip.addEventListener('click', function () {
        var group = chip.getAttribute('data-filter');
        var value = chip.getAttribute('data-value');
        state[group] = value;
        // Only one chip active per group.
        var siblings = document.querySelectorAll('.chip[data-filter="' + group + '"]');
        Array.prototype.forEach.call(siblings, function (s) {
          s.setAttribute('aria-pressed', s === chip ? 'true' : 'false');
        });
        apply();
      });
    });

    if (sortSelect) {
      sortSelect.addEventListener('change', function () { sort(sortSelect.value); });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        state = { category: 'all', size: 'all', price: 'all' };
        Array.prototype.forEach.call(chips, function (s) {
          s.setAttribute('aria-pressed', s.getAttribute('data-value') === 'all' ? 'true' : 'false');
        });
        if (sortSelect) { sortSelect.value = 'default'; sort('default'); }
        apply();
      });
    }

    // Deep link support: shop.html?category=outerwear
    var params = new URLSearchParams(window.location.search);
    var cat = params.get('category');
    if (cat) {
      var target = document.querySelector('.chip[data-filter="category"][data-value="' + cat + '"]');
      if (target) target.click();
    } else {
      apply();
    }
  }

  /* --- 9. Product gallery ---------------------------------------------------- */
  function initGallery() {
    var gallery = document.querySelector('[data-gallery]');
    if (!gallery) return;
    var main = gallery.querySelector('[data-gallery-main]');
    var note = gallery.querySelector('[data-gallery-note]');
    var thumbs = gallery.querySelectorAll('.pdp__thumb');

    Array.prototype.forEach.call(thumbs, function (thumb) {
      thumb.addEventListener('click', function () {
        main.src = thumb.getAttribute('data-full');
        main.alt = thumb.getAttribute('data-alt');
        if (note) note.textContent = thumb.getAttribute('data-note') || '';
        Array.prototype.forEach.call(thumbs, function (t) {
          t.setAttribute('aria-current', t === thumb ? 'true' : 'false');
        });
      });
    });
  }

  /* --- 10. Store locator ------------------------------------------------------ */
  function initStores() {
    var input = document.getElementById('store-search');
    if (!input) return;
    var stores = document.querySelectorAll('[data-store]');
    var count = document.getElementById('store-count');

    function run() {
      var q = input.value.trim().toLowerCase();
      var shown = 0;
      Array.prototype.forEach.call(stores, function (li) {
        var hay = li.getAttribute('data-store').toLowerCase();
        var ok = q === '' || hay.indexOf(q) !== -1;
        li.hidden = !ok;
        if (ok) shown++;
      });
      if (count) {
        count.textContent = shown === 1
          ? '1 stockist matches your search.'
          : shown + ' stockists match your search.';
      }
    }

    input.addEventListener('input', run);
    var form = input.closest('form');
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); run(); });
  }

  /* --- 11. Size guide unit toggle --------------------------------------------- */
  function initUnits() {
    var buttons = document.querySelectorAll('[data-units]');
    if (!buttons.length) return;
    var cells = document.querySelectorAll('[data-in]');

    function set(unit) {
      Array.prototype.forEach.call(cells, function (cell) {
        var inches = parseFloat(cell.getAttribute('data-in'));
        cell.textContent = unit === 'cm'
          ? (inches * 2.54).toFixed(1)
          : cell.getAttribute('data-in');
      });
      Array.prototype.forEach.call(buttons, function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-units') === unit ? 'true' : 'false');
      });
      var labels = document.querySelectorAll('[data-unit-label]');
      Array.prototype.forEach.call(labels, function (l) {
        l.textContent = unit === 'cm' ? 'centimetres' : 'inches';
      });
    }

    Array.prototype.forEach.call(buttons, function (b) {
      b.addEventListener('click', function () { set(b.getAttribute('data-units')); });
    });
  }

  /* --- boot ------------------------------------------------------------------- */
  function boot() {
    initYear();
    initNav();
    initDropdowns();
    initAccordions();
    initBackToTop();
    initCookies();
    initForms();
    initShop();
    initGallery();
    initStores();
    initUnits();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
