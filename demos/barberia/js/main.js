/* Barbería Ramírez — JS del sitio.
   Sin librerías, sin credenciales, sin nada que no se pueda leer con
   clic derecho → ver código fuente. */

(function () {
  'use strict';

  /* --- Placeholders honestos: no navegan a ningún lado, avisan en consola --- */
  document.querySelectorAll('a[data-placeholder]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      console.warn('Dato de ejemplo sin completar: ' + link.dataset.placeholder);
    });
  });

  /* --- Reveal solo de los títulos de sección --- */
  var revelables = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' });
    revelables.forEach(function (el) { obs.observe(el); });
  } else {
    revelables.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* --- Carrusel de trabajos: se puede recorrer con flechas del teclado.
         El scroll-snap ya lo maneja el CSS; esto es solo accesibilidad. --- */
  var works = document.querySelector('.works');
  if (works) {
    works.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      var paso = 242;
      works.scrollBy({ left: e.key === 'ArrowRight' ? paso : -paso, behavior: 'smooth' });
    });
  }
})();
