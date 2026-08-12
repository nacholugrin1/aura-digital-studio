/* ============================================================================
   Aura Digital Studio — JS del sitio.

   Es a propósito el archivo más corto del proyecto. Un sitio de una sola
   página con siete secciones no necesita JavaScript para existir: si esto no
   carga, el sitio sigue funcionando entero. Lo único que hace es (1) avisar
   cuando se toca un dato de contacto todavía sin completar y (2) marcar en
   qué sección estás parado.

   Cero librerías, cero credenciales, cero llamadas a servicios de terceros.
   ========================================================================== */

(function () {
  'use strict';

  /* --- Datos de contacto todavía sin completar -----------------------------
     Mismo criterio que en los tres demos: no se navega a "#" en silencio.
     Cuando Nacho cargue el WhatsApp y el mail reales, estos `data-pendiente`
     se reemplazan por el href de verdad y este bloque deja de hacer nada. */
  var PENDIENTES = document.querySelectorAll('[data-pendiente]');

  PENDIENTES.forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      console.warn(
        '[Aura] Dato de contacto sin completar: "' + el.dataset.pendiente + '". ' +
        'Ver el README del sitio, sección "Lo que falta antes de publicar".'
      );
    });
  });

  if (PENDIENTES.length) {
    console.info('[Aura] Este sitio todavía tiene ' + PENDIENTES.length +
                 ' enlaces de contacto sin completar. No publicar así.');
  }

  /* --- Sección activa en el menú ------------------------------------------
     No es decoración: en una página larga de scroll, saber dónde estás parado
     es orientación. Se apoya en IntersectionObserver, que es API nativa del
     navegador y no una librería (criterio ya fijado en 01_DECISIONES.md §3). */
  var enlaces = Array.prototype.slice.call(document.querySelectorAll('.menu a[href^="#"]'));
  if (!enlaces.length || !('IntersectionObserver' in window)) return;

  var secciones = enlaces
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  var observador = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (entrada) {
      if (!entrada.isIntersecting) return;
      enlaces.forEach(function (a) {
        var activo = a.getAttribute('href') === '#' + entrada.target.id;
        a.style.color = activo ? 'var(--papel)' : '';
        a.style.borderBottomColor = activo ? 'var(--oro)' : '';
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });

  secciones.forEach(function (s) { observador.observe(s); });
})();
