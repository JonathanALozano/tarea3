// ============================================
// LISTA DE TAREAS - versión mejorada
// ============================================

// DOM
const formulario = document.getElementById('form-tarea');
const inputTarea = document.getElementById('input-tarea');
const inputFecha = document.getElementById('input-fecha');
const inputCategoria = document.getElementById('input-categoria');

const listaTareas = document.getElementById('lista-tareas');
const contadorPendientes = document.getElementById('contador-pendientes');

const botonesFiltro = document.querySelectorAll('.filtro');
const filtroCategoriaSelect = document.getElementById('filtro-categoria');

const btnTema = document.getElementById('btn-tema');

// Estado
let tareas = [];
let filtroActual = 'todas';          // todas | pendientes | completadas
let filtroCategoria = 'todas';       // todas | personal | trabajo | escuela | otro
let editandoId = null;              // id que se está editando

// Utils fechas
function hoySinHora() {
  const d = new Date();
  d.setHours(0,0,0,0);
  return d;
}

function diasHasta(fechaYYYYMMDD) {
  const hoy = hoySinHora();
  const f = new Date(fechaYYYYMMDD + 'T00:00:00');
  return Math.ceil((f - hoy) / (1000 * 60 * 60 * 24));
}

// Seguridad
function escaparHTML(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

// Storage
function guardarTareas() {
  localStorage.setItem('tareas', JSON.stringify(tareas));
}

function migrarTarea(t) {
  // Por si ya tenías tareas guardadas sin los campos nuevos
  return {
    id: typeof t.id === 'number' ? t.id : Date.now(),
    texto: typeof t.texto === 'string' ? t.texto : '',
    completada: Boolean(t.completada),
    fechaLimite: t.fechaLimite ?? null,
    categoria: t.categoria ?? 'otro'
  };
}

function cargarTareas() {
  const guardadas = localStorage.getItem('tareas');
  if (guardadas) {
    try {
      const arr = JSON.parse(guardadas);
      tareas = Array.isArray(arr) ? arr.map(migrarTarea) : [];
    } catch {
      tareas = [];
    }
  }
  renderizarTareas();
}

// Tema
function aplicarTema(tema) {
  document.body.classList.toggle('dark', tema === 'dark');
  localStorage.setItem('tema', tema);
  btnTema.textContent = tema === 'dark' ? 'Modo claro' : 'Modo oscuro';
}

function cargarTema() {
  const tema = localStorage.getItem('tema') || 'light';
  aplicarTema(tema);
}

// CRUD
function agregarTarea(texto, fechaLimite, categoria) {
  const nueva = {
    id: Date.now(),
    texto,
    completada: false,
    fechaLimite: fechaLimite || null,
    categoria: categoria || 'otro'
  };
  tareas.unshift(nueva);
  guardarTareas();
  renderizarTareas();
}

function toggleTarea(id) {
  tareas = tareas.map(t => (t.id === id ? { ...t, completada: !t.completada } : t));
  guardarTareas();
  renderizarTareas();
}

function eliminarTarea(id) {
  const li = listaTareas.querySelector(`li[data-id="${id}"]`);
  if (!li) {
    tareas = tareas.filter(t => t.id !== id);
    guardarTareas();
    renderizarTareas();
    return;
  }

  li.classList.add('saliendo');
  setTimeout(() => {
    tareas = tareas.filter(t => t.id !== id);
    guardarTareas();
    renderizarTareas();
  }, 250);
}

// Edición inline
function iniciarEdicion(id) {
  editandoId = id;
  renderizarTareas();
}

function cancelarEdicion() {
  editandoId = null;
  renderizarTareas();
}

function guardarEdicion(id, nuevoTexto) {
  const limpio = nuevoTexto.trim();
  if (!limpio) return;

  tareas = tareas.map(t => (t.id === id ? { ...t, texto: limpio } : t));
  editandoId = null;
  guardarTareas();
  renderizarTareas();
}

// Filtros
function filtrarTareas() {
  let arr = [...tareas];

  // filtro principal
  if (filtroActual === 'pendientes') arr = arr.filter(t => !t.completada);
  if (filtroActual === 'completadas') arr = arr.filter(t => t.completada);

  // filtro por categoría
  if (filtroCategoria !== 'todas') arr = arr.filter(t => t.categoria === filtroCategoria);

  return arr;
}

// Contador
function actualizarContador() {
  const pendientes = tareas.filter(t => !t.completada).length;
  contadorPendientes.textContent = pendientes;
}

// Render
function renderizarTareas() {
  const tareasFiltradas = filtrarTareas();
  listaTareas.innerHTML = '';

  if (tareasFiltradas.length === 0) {
    listaTareas.innerHTML = `
      <li class="sin-tareas">
        ${filtroActual === 'todas' && filtroCategoria === 'todas'
          ? '¡No hay tareas! Agrega una nueva.'
          : 'No hay tareas para esos filtros.'}
      </li>
    `;
    actualizarContador();
    return;
  }

  tareasFiltradas.forEach(tarea => {
    const li = document.createElement('li');
    li.className = `tarea ${tarea.completada ? 'completada' : ''}`;
    li.dataset.id = tarea.id;

    // Estado de vencimiento
    let claseVencimiento = '';
    let textoVencimiento = '';
    if (tarea.fechaLimite && !tarea.completada) {
      const d = diasHasta(tarea.fechaLimite);
      if (d < 0) {
        claseVencimiento = 'vencida';
        textoVencimiento = ' • vencida';
      } else if (d <= 2) {
        claseVencimiento = 'por-vencer';
        textoVencimiento = ' • por vencer';
      }
    }
    if (claseVencimiento) li.classList.add(claseVencimiento);

    const etiquetaCat = `<small class="categoria">${escaparHTML(tarea.categoria)}</small>`;
    const etiquetaFecha = tarea.fechaLimite
      ? `<small class="fecha">📅 ${escaparHTML(tarea.fechaLimite)}${escaparHTML(textoVencimiento)}</small>`
      : '';

    const estaEditando = editandoId === tarea.id;

    li.innerHTML = `
      <input type="checkbox" ${tarea.completada ? 'checked' : ''} aria-label="Marcar tarea">
      <div class="tarea-info">
        ${
          estaEditando
            ? `<input class="editar-input" type="text" value="${escaparHTML(tarea.texto)}" maxlength="200" />`
            : `<span class="tarea-texto">${escaparHTML(tarea.texto)}</span>`
        }
        <div class="meta">
          ${etiquetaCat}
          ${etiquetaFecha}
        </div>
      </div>

      <div class="acciones">
        ${
          estaEditando
            ? `
              <button class="btn-guardar" type="button" aria-label="Guardar">✅</button>
              <button class="btn-cancelar" type="button" aria-label="Cancelar">✖️</button>
            `
            : `
              <button class="btn-editar" type="button" aria-label="Editar">✏️</button>
              <button class="btn-eliminar" type="button" aria-label="Eliminar">🗑️</button>
            `
        }
      </div>
    `;

    // Eventos
    const checkbox = li.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', () => toggleTarea(tarea.id));

    if (estaEditando) {
      const inputEdit = li.querySelector('.editar-input');
      const btnGuardar = li.querySelector('.btn-guardar');
      const btnCancelar = li.querySelector('.btn-cancelar');

      // Enter = guardar, Esc = cancelar
      inputEdit.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') guardarEdicion(tarea.id, inputEdit.value);
        if (e.key === 'Escape') cancelarEdicion();
      });

      btnGuardar.addEventListener('click', () => guardarEdicion(tarea.id, inputEdit.value));
      btnCancelar.addEventListener('click', cancelarEdicion);

      // foco automático
      setTimeout(() => inputEdit.focus(), 0);
    } else {
      const btnEditar = li.querySelector('.btn-editar');
      const btnEliminar = li.querySelector('.btn-eliminar');

      btnEditar.addEventListener('click', () => iniciarEdicion(tarea.id));
      btnEliminar.addEventListener('click', () => eliminarTarea(tarea.id));
    }

    listaTareas.appendChild(li);
  });

  actualizarContador();
}

// Eventos UI
formulario.addEventListener('submit', (e) => {
  e.preventDefault();

  const texto = inputTarea.value.trim();
  const fecha = inputFecha.value;
  const categoria = inputCategoria.value;

  if (!texto) return;

  agregarTarea(texto, fecha, categoria);

  inputTarea.value = '';
  inputFecha.value = '';
  inputCategoria.value = 'personal';
  inputTarea.focus();
});

// Filtros principales
botonesFiltro.forEach(boton => {
  boton.addEventListener('click', () => {
    botonesFiltro.forEach(b => b.classList.remove('activo'));
    boton.classList.add('activo');
    filtroActual = boton.dataset.filtro;
    editandoId = null;
    renderizarTareas();
  });
});

// Filtro categoría
filtroCategoriaSelect.addEventListener('change', () => {
  filtroCategoria = filtroCategoriaSelect.value;
  editandoId = null;
  renderizarTareas();
});

// Tema
btnTema.addEventListener('click', () => {
  const actual = document.body.classList.contains('dark') ? 'dark' : 'light';
  aplicarTema(actual === 'dark' ? 'light' : 'dark');
});

// Inicio
cargarTema();
cargarTareas();
