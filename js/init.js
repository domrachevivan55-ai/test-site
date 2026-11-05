/* Выполняется до отрисовки страницы.
   Если пользователь не просил уменьшить движение — включаем стартовые состояния анимаций (класс .anim).
   Страховка: если GSAP не запустился за 4 секунды, показываем всё без анимаций. */
(function (root) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    root.className = 'anim';
    setTimeout(function () {
        if (!window.__envilAnimReady) root.className = 'no-anim';
    }, 4000);
})(document.documentElement);
