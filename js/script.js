/* КБ «Энвил» — интерфейс и анимации (GSAP 3.12.5 + ScrollTrigger, self-hosted) */
(function () {
    'use strict';
    var root = document.documentElement;
    var $ = function (s, c) { return (c || document).querySelector(s); };
    var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

    /* ---------- Меню (мобильное) ---------- */
    var nav = $('#nav'), burger = $('#navBurger');
    if (burger) {
        burger.addEventListener('click', function () {
            var open = nav.classList.toggle('menu-open');
            burger.setAttribute('aria-expanded', open);
            burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
        });
        $$('.nav-links a').forEach(function (a) {
            a.addEventListener('click', function () {
                nav.classList.remove('menu-open');
                burger.setAttribute('aria-expanded', 'false');
            });
        });
    }

    /* ---------- Плавные якоря (без CSS scroll-behavior, чтобы не мешать ScrollTrigger) ---------- */
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    document.addEventListener('click', function (e) {
        var a = e.target.closest('a[href^="#"]');
        if (!a) return;
        var id = a.getAttribute('href');
        var target = id.length > 1 ? document.querySelector(id) : document.body;
        if (!target) return;
        e.preventDefault();
        var top = target === document.body ? 0 : target.getBoundingClientRect().top + window.pageYOffset - (nav ? nav.offsetHeight : 0);
        window.scrollTo({ top: top, behavior: reduce.matches ? 'auto' : 'smooth' });
        try { history.replaceState(null, '', id); } catch (err) { /* sandbox iframe */ }
    });

    /* ---------- Модальное окно ---------- */
    var overlay = $('#modalOverlay'), closeBtn = $('#modalClose'), title = $('#modalTitle');
    var defaultTitle = title ? title.textContent : '';
    var lastFocus = null;
    function openModal(topic) {
        lastFocus = document.activeElement;
        title.textContent = topic ? 'Направьте ТЗ: ' + topic : defaultTitle;
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        setTimeout(function () { closeBtn.focus(); }, 50);
    }
    function closeModal() {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (lastFocus) lastFocus.focus({ preventScroll: true });
    }
    $$('[data-open-modal]').forEach(function (el) {
        el.addEventListener('click', function () { openModal(el.getAttribute('data-topic')); });
        if (el.getAttribute('role') === 'button') {
            el.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(el.getAttribute('data-topic')); }
            });
        }
    });
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', function (e) {
        if (!overlay.classList.contains('active')) return;
        if (e.key === 'Escape') closeModal();
        if (e.key === 'Tab') { // простой focus-trap
            var f = $$('a, button', overlay), first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    });

    /* ---------- Анимации ---------- */
    if (!window.gsap || !window.ScrollTrigger) { root.className = 'no-anim'; return; }
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    var mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: reduce)', function () {
        window.__envilAnimReady = true;
        root.className = 'no-anim'; // всё видно сразу, галерея — первое фото статично
    });

    mm.add('(prefers-reduced-motion: no-preference)', function () {
        window.__envilAnimReady = true;
        root.className = 'anim';

        heroIntro();
        parallax();
        authorGallery();
        processScrub();
        counters();
        reveals();

        // шрифты и картинки могут поменять высоты — пересчитываем позиции триггеров
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
        if (document.readyState === 'complete') ScrollTrigger.refresh();
        else window.addEventListener('load', function () { ScrollTrigger.refresh(); }, { once: true });

        return function () { root.className = 'no-anim'; }; // пользователь включил reduce-motion на лету
    });

    /* 1. Hero: staggered reveal */
    function heroIntro() {
        var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.to('.hero-visual img', { scale: 1, duration: 1.6 }, 0)
          .to('.hero-eyebrow', { opacity: 1, y: 0, duration: 0.8 }, 0.15)
          .to('#heroTitle .line-inner', { y: 0, duration: 1.1, stagger: 0.12, ease: 'power4.out' }, 0.25)
          .to('.hero-subtitle', { opacity: 1, y: 0, duration: 0.8 }, 0.7)
          .to('.hero-btns', { opacity: 1, y: 0, duration: 0.8 }, 0.82);
    }

    /* 2. Parallax: картинка двигается внутри рамки — рамка не наезжает на соседние блоки */
    function parallax() {
        gsap.to('.hero-visual img', {
            yPercent: 8, ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
        });
        var about = $('.about-image img');
        if (about) gsap.fromTo(about, { yPercent: -5 }, {
            yPercent: 5, ease: 'none',
            scrollTrigger: { trigger: '.about-image', start: 'top bottom', end: 'bottom top', scrub: true }
        });
    }

    /* 3. Скролл-галерея автора: pin + clip-path reveal + scale/parallax */
    function authorGallery() {
        var section = $('.gallery');
        if (!section) return;
        var slides = $$('.gallery-slide', section);
        var imgs = slides.map(function (s) { return $('img', s); });
        var caps = $$('.gallery-caption', section);
        var counter = $('.gallery-counter .current', section);
        var bar = $('.gallery-progress i', section);
        var n = slides.length;
        if (n < 2) return; // одно фото — просто статично

        var pad = function (i) { return (i < 9 ? '0' : '') + (i + 1); };
        var current = 0;

        var tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
                trigger: section,
                start: 'top top',
                end: function () { return '+=' + Math.round(window.innerHeight * 0.9 * (n - 1)); },
                pin: true,
                scrub: 0.6,
                anticipatePin: 1,
                invalidateOnRefresh: true,
                snap: { snapTo: 1 / (n - 1), inertia: false, duration: { min: 0.2, max: 0.6 }, delay: 0.15, ease: 'power1.inOut' },
                onUpdate: function (self) {
                    bar.style.transform = 'scaleX(' + self.progress.toFixed(4) + ')';
                    var idx = Math.min(n - 1, Math.round(self.progress * (n - 1)));
                    if (idx !== current) { current = idx; counter.textContent = pad(idx); }
                }
            }
        });

        // лёгкая «жизнь» первого кадра
        tl.fromTo(imgs[0], { scale: 1.02 }, { scale: 1.08, duration: 1 }, 0);

        for (var i = 1; i < n; i++) {
            var at = i - 1;
            tl.fromTo(slides[i], { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power2.inOut' }, at)
              .fromTo(imgs[i], { scale: 1.25, yPercent: 6 }, { scale: 1.04, yPercent: 0, duration: 1 }, at)
              .to(imgs[i - 1], { yPercent: -8, scale: 1.14, duration: 1 }, at);
            if (caps[i]) {
                tl.to(caps[i - 1], { opacity: 0, y: -12, duration: 0.3 }, at + 0.3)
                  .fromTo(caps[i], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3 }, at + 0.55);
            }
        }
    }

    /* 4. Процесс: линия заполняется по скроллу (scrub), шаги подсвечиваются */
    function processScrub() {
        var track = $('#processSteps');
        if (!track) return;
        gsap.to('.process-line i', {
            scaleY: 1, ease: 'none',
            scrollTrigger: { trigger: track, start: 'top 65%', end: 'bottom 65%', scrub: 0.4 }
        });
        $$('.process-step', track).forEach(function (step) {
            ScrollTrigger.create({
                trigger: step, start: 'top 65%',
                onEnter: function () { step.classList.add('is-active'); },
                onLeaveBack: function () { step.classList.remove('is-active'); }
            });
        });
    }

    /* 5. Счётчики метрик (в HTML лежат финальные значения — fallback без JS) */
    function counters() {
        $$('.metric [data-count]').forEach(function (el) {
            var to = parseInt(el.getAttribute('data-count'), 10);
            var from = parseInt(el.getAttribute('data-from') || '0', 10);
            el.textContent = from;
            var obj = { v: from };
            ScrollTrigger.create({
                trigger: el, start: 'top 88%', once: true,
                onEnter: function () {
                    gsap.to(obj, {
                        v: to, duration: 1.8, ease: 'power2.out',
                        onUpdate: function () { el.textContent = Math.round(obj.v); }
                    });
                }
            });
        });
    }

    /* 6. Появление блоков (замена AOS: минус две внешние библиотеки) */
    function reveals() {
        ScrollTrigger.batch('[data-reveal]', {
            start: 'top 90%', once: true,
            onEnter: function (batch) {
                gsap.to(batch, {
                    opacity: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out', overwrite: true,
                    onComplete: function () {
                        batch.forEach(function (el) { el.classList.add('is-revealed'); });
                        gsap.set(batch, { clearProps: 'opacity,transform' }); // вернуть hover-эффекты CSS
                    }
                });
            }
        });
    }
})();
