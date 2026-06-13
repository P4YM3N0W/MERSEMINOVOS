// ══ CONFIG ═════════════════════════════════════════════════════
const API = 'http://localhost:3000/api';

// ══ STATE ══════════════════════════════════════════════════════
let veiculos    = [];
let currentView = 'dashboard';
let listMode    = false;
let searchQuery = '';
let editId      = null;

// ══ INIT ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  await loadVeiculos();
  renderView('dashboard');
  bindEvents();
});

// ══ API ═════════════════════════════════════════════════════════
async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function loadVeiculos() {
  try {
    veiculos = await api('GET', '/veiculos');
  } catch {
    toast('Erro ao conectar com o servidor', 'error');
    veiculos = [];
  }
}

// ══ EVENTS ══════════════════════════════════════════════════════
function bindEvents() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderView(btn.dataset.view);
    });
  });

  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
  });

  document.getElementById('btnNovoVeiculo').addEventListener('click', () => openModal());
  document.getElementById('btnGrid').addEventListener('click', () => setListMode(false));
  document.getElementById('btnList').addEventListener('click', () => setListMode(true));

  document.getElementById('searchInput').addEventListener('input', e => {
    searchQuery = e.target.value.toLowerCase();
    if (currentView === 'veiculos') renderVeiculos();
  });

  document.getElementById('filtroTipo').addEventListener('change', renderVeiculos);
  document.getElementById('filtroStatus').addEventListener('change', renderVeiculos);

  document.getElementById('formVeiculo').addEventListener('submit', saveVeiculo);
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('cancelModal').addEventListener('click', closeModal);
  document.getElementById('closeDetalhe').addEventListener('click', closeDetalhe);

  document.getElementById('modalVeiculo').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('modalDetalhe').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeDetalhe();
  });
}

// ══ VIEW ROUTER ══════════════════════════════════════════════════
function renderView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');

  const titles = {
    dashboard:   'Dashboard',
    veiculos:    'Veiculos',
    vencimentos: 'Vencimentos',
    documentos:  'Documentos'
  };
  document.getElementById('pageTitle').textContent = titles[view];

  if (view === 'dashboard')   renderDashboard();
  if (view === 'veiculos')    renderVeiculos();
  if (view === 'vencimentos') renderVencimentos();
  if (view === 'documentos')  renderDocumentos();
}

// ══ DASHBOARD ════════════════════════════════════════════════════
function renderDashboard() {
  const total     = veiculos.length;
  const regulares = veiculos.filter(v => v.status === 'Regular').length;
  const pendentes = veiculos.filter(v => v.status === 'Pendente').length;
  const vencidos  = veiculos.filter(v => v.status === 'Vencido').length;
  const totalDocs = veiculos.reduce((a, v) => a + (v.documentos || []).length, 0);

  const stats = [
    { label: 'Total Veiculos', value: total,     cor: '#ffb300' },
    { label: 'Regulares',      value: regulares, cor: '#22c55e' },
    { label: 'Pendentes',      value: pendentes, cor: '#f59e0b' },
    { label: 'Vencidos',       value: vencidos,  cor: '#ef4444' },
    { label: 'Documentos',     value: totalDocs, cor: '#ff7a18' }
  ];

  document.getElementById('statsGrid').innerHTML = stats.map((s, i) => `
    <div class="stat-card" style="animation-delay:${i * .07}s; border-top-color:${s.cor}">
      <div class="stat-value" style="color:${s.cor}">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    </div>
  `).join('');

  renderAlertas();
  renderUltimos();
}

function renderAlertas() {
  const hoje   = new Date();
  const campos = [
    { key: 'ipva',          label: 'IPVA'         },
    { key: 'licenciamento', label: 'Licenciamento' },
    { key: 'seguro',        label: 'Seguro'        },
    { key: 'cnh',           label: 'CNH'           },
    { key: 'revisao',       label: 'Revisao'       },
    { key: 'vistoria',      label: 'Vistoria'      }
  ];



