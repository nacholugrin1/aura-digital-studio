document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const targetId = link.getAttribute('href');
    if (targetId.length <= 1) return;
    const target = document.querySelector(targetId);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

document.querySelectorAll('a[data-placeholder]').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    console.warn(`Dato de ejemplo sin completar: ${link.dataset.placeholder}`);
  });
});

// Scroll reveal — vanilla JS, sin librerías (IntersectionObserver).
// Ver css/style.css (.reveal / .reveal-grow) y 01_DECISIONES.md para el porqué de esta técnica.
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target); // se revela una vez, no repite al subir/bajar
      }
    });
  },
  { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
);

document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));


/* ===========================================================================
   FORMULARIO DE RESERVA — conectado a Google Apps Script (Paquete 2)
   ---------------------------------------------------------------------------
   Ver automatizacion/Codigo.gs y automatizacion/README_DEPLOY.md.

   Importante: acá NO hay ninguna clave ni credencial. El navegador solo
   conoce una URL pública que recibe datos. Toda la autorización para tocar
   la planilla, el calendario y el mail vive del lado de Google, dentro del
   script. Esa es justamente la razón de usar Apps Script como intermediario.
   =========================================================================== */

const RESERVA_CONFIG = {
  // Pegar acá la URL del Web App (termina en /exec).
  // Mientras esté vacío, el formulario funciona en "modo demo": valida todo
  // pero no envía nada. Así el demo se puede mostrar sin tener nada publicado.
  SCRIPT_URL: '',

  // Espejo de CONFIG.HORARIOS del script. Sirve solo para que el usuario vea
  // horarios reales; la validación que cuenta es la del servidor.
  HORARIOS: {
    0: [],                            // domingo: cerrado
    1: ['09:00', '18:00', '19:30'],
    2: ['09:00', '18:00', '19:30'],
    3: ['09:00', '18:00', '19:30'],
    4: ['09:00', '18:00', '19:30'],
    5: ['09:00', '18:00', '19:30'],
    6: ['09:30']                      // sábado
  },

  DIAS_MAXIMOS: 60
};

(function iniciarReserva() {
  const form = document.getElementById('form-reserva');
  if (!form) return; // esta página no tiene el formulario

  const inputFecha = document.getElementById('r-fecha');
  const selectHora = document.getElementById('r-hora');
  const boton = document.getElementById('r-enviar');
  const mensaje = document.getElementById('r-mensaje');

  /* --- Límites del selector de fecha --------------------------------------
     No se puede reservar en el pasado ni con dos años de anticipación.
     Usamos fechas locales armadas a mano, no toISOString(): toISOString()
     convierte a UTC, y en Argentina (UTC-3) eso devuelve el día anterior
     durante buena parte del día. Es un bug clásico y silencioso. */
  const hoy = new Date();
  inputFecha.min = aTextoFecha(hoy);
  const tope = new Date(hoy.getTime());
  tope.setDate(tope.getDate() + RESERVA_CONFIG.DIAS_MAXIMOS);
  inputFecha.max = aTextoFecha(tope);

  function aTextoFecha(fecha) {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }

  /* --- Horarios que dependen del día elegido ------------------------------ */
  inputFecha.addEventListener('change', () => {
    limpiarError(inputFecha);
    const texto = inputFecha.value;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      ponerOpciones(selectHora, [], 'Elegí primero el día');
      return;
    }

    // Desarmamos la fecha a mano por el mismo motivo de arriba:
    // new Date('2026-08-05') se interpreta como UTC y puede caer un día antes.
    const [anio, mes, dia] = texto.split('-').map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    const horarios = RESERVA_CONFIG.HORARIOS[fecha.getDay()] || [];

    if (horarios.length === 0) {
      ponerOpciones(selectHora, [], 'Ese día estamos cerrados');
      marcarError(inputFecha, 'Los domingos el gimnasio está cerrado.');
      return;
    }
    ponerOpciones(selectHora, horarios, 'Elegí un horario');
  });

  function ponerOpciones(select, valores, textoVacio) {
    select.innerHTML = '';
    const vacia = document.createElement('option');
    vacia.value = '';
    vacia.textContent = textoVacio;
    vacia.disabled = true;
    vacia.selected = true;
    select.appendChild(vacia);

    valores.forEach((v) => {
      const op = document.createElement('option');
      op.value = v;
      op.textContent = v + ' hs';
      select.appendChild(op);
    });
    select.disabled = valores.length === 0;
  }

  /* --- Errores por campo --------------------------------------------------- */
  function marcarError(campo, texto) {
    const contenedor = campo.closest('.field');
    if (!contenedor) return;
    contenedor.classList.add('has-error');
    let etiqueta = contenedor.querySelector('.field-error');
    if (!etiqueta) {
      etiqueta = document.createElement('span');
      etiqueta.className = 'field-error';
      contenedor.appendChild(etiqueta);
    }
    etiqueta.textContent = texto;
    campo.setAttribute('aria-invalid', 'true');
  }

  function limpiarError(campo) {
    const contenedor = campo.closest('.field');
    if (!contenedor) return;
    contenedor.classList.remove('has-error');
    const etiqueta = contenedor.querySelector('.field-error');
    if (etiqueta) etiqueta.remove();
    campo.removeAttribute('aria-invalid');
  }

  // Al corregir, el error desaparece solo: menos frustrante que dejarlo rojo
  // hasta el siguiente intento de envío.
  form.querySelectorAll('input, select, textarea').forEach((campo) => {
    campo.addEventListener('input', () => limpiarError(campo));
  });

  function validar(datos) {
    let primerError = null;
    const fallar = (id, texto) => {
      const campo = document.getElementById(id);
      marcarError(campo, texto);
      if (!primerError) primerError = campo;
    };

    if (datos.nombre.length < 2) fallar('r-nombre', 'Escribí tu nombre.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(datos.email)) fallar('r-email', 'Revisá el mail.');
    if (datos.telefono.replace(/\D/g, '').length < 8) fallar('r-telefono', 'Escribí un teléfono válido.');
    if (!datos.clase) fallar('r-clase', 'Elegí una clase.');
    if (!datos.fecha) fallar('r-fecha', 'Elegí un día.');
    if (!datos.hora) fallar('r-hora', 'Elegí un horario.');

    return primerError;
  }

  /* --- Envío --------------------------------------------------------------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    mensaje.textContent = '';
    mensaje.className = 'form-msg';

    const datos = {
      nombre: form.nombre.value.trim(),
      email: form.email.value.trim().toLowerCase(),
      telefono: form.telefono.value.trim(),
      clase: form.clase.value,
      fecha: form.fecha.value,
      hora: form.hora.value,
      comentario: form.comentario.value.trim(),
      website: form.website.value.trim() // honeypot
    };

    const error = validar(datos);
    if (error) {
      error.focus();
      mostrar('error', 'Revisá los campos marcados.');
      return;
    }

    if (!RESERVA_CONFIG.SCRIPT_URL) {
      mostrar('ok', 'Modo demo: los datos son válidos. En esta muestra pública la reserva no se envía de verdad.');
      return;
    }

    boton.disabled = true;
    const textoOriginal = boton.textContent;
    boton.textContent = 'Reservando…';

    try {
      /* Por qué 'text/plain' y no 'application/json':
         si el navegador manda application/json, primero dispara un pedido
         OPTIONS de permiso (preflight de CORS) que Apps Script no sabe
         responder — y el envío falla antes de llegar al script. Con
         text/plain el pedido se considera "simple", no hay preflight, y pasa
         derecho. El contenido sigue siendo JSON: lo parsea el script.
         Ver README_DEPLOY.md, sección "Por qué text/plain". */
      const respuesta = await fetch(RESERVA_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(datos),
        redirect: 'follow' // Apps Script redirige a googleusercontent.com
      });

      const resultado = await respuesta.json();

      if (resultado.ok) {
        mostrar('ok', resultado.mensaje || '¡Listo! Te reservamos el lugar.');
        form.reset();
        ponerOpciones(selectHora, [], 'Elegí primero el día');
      } else {
        mostrar('error', resultado.mensaje || 'No pudimos registrar la reserva.');
      }

    } catch (err) {
      // Sin internet, script caído o URL mal pegada. Nunca dejamos al usuario
      // sin salida: le damos el WhatsApp como plan B.
      console.error('Error al enviar la reserva:', err);
      mostrar('error', 'No pudimos conectar con el sistema de reservas. Escribinos por WhatsApp y te agendamos igual.');

    } finally {
      boton.disabled = false;
      boton.textContent = textoOriginal;
    }
  });

  function mostrar(tipo, texto) {
    mensaje.className = 'form-msg ' + tipo;
    mensaje.textContent = texto;
  }
})();
