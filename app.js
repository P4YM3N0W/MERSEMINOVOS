// ══ STORAGE KEY ═══════════════════════════════════════════════
const STORAGE_KEY = 'mer_seminovos_veiculos';

// ══ STATE ═════════════════════════════════════════════════════
let veiculos    = [];
let currentView = 'dashboard';
let listMode    = false;
let searchQuery = '';
let editId      = null;
let detalheId   = null;

// ══ LOCAL STORAGE ═════════════════════════════════════════════
function salvarLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(veiculos));
}

function carregarLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ══ INIT ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  veiculos = carregarLocal();
  renderView('dashboard');
  bindEvents();
});

// ══ EVENTS ════════════════════════════════════════════════════
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
  document.getElementById('modalVeiculo').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  document.getElementById('closeDetalhe').addEventListener('click', closeDetalhe);
  document.getElementById('modalDetalhe').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeDetalhe();
  });

  document.getElementById('btnExportar').addEventListener('click', exportarXLS);

  document.getElementById('btnImportar').addEventListener('click', () => {
    document.getElementById('inputImportar').click();
  });
  document.getElementById('inputImportar').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) importarArquivo(file);
    e.target.value = '';
  });
}

// ══ VIEW ROUTER ═══════════════════════════════════════════════
function renderView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');
  const titles = { dashboard: 'Dashboard', veiculos: 'Veiculos', vencimentos: 'Vencimentos', documentos: 'Documentos' };
  document.getElementById('pageTitle').textContent = titles[view];
  if (view === 'dashboard')   renderDashboard();
  if (view === 'veiculos')    renderVeiculos();
  if (view === 'vencimentos') renderVencimentos();
  if (view === 'documentos')  renderDocumentos();
}

// ══ DASHBOARD ════════════════════════════════════════════════
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
    <div class="stat-card" style="animation-delay:${i * .07}s;border-top-color:${s.cor}">
      <div class="stat-value" style="color:${s.cor}">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    </div>`).join('');

  renderAlertas();
  renderUltimos();
}

function renderAlertas() {
  const hoje0 = new Date(); hoje0.setHours(0,0,0,0);
  const campos = [
    { key: 'ipva', label: 'IPVA' }, { key: 'licenciamento', label: 'Licenciamento' },
    { key: 'seguro', label: 'Seguro' }, { key: 'cnh', label: 'CNH' },
    { key: 'revisao', label: 'Revisao' }, { key: 'vistoria', label: 'Vistoria' }
  ];

  const alertas = [];
  veiculos.forEach(v => {
    campos.forEach(c => {
      if (!v[c.key]) return;
      const d    = new Date(v[c.key] + 'T00:00:00');
      const dias = Math.ceil((d - hoje0) / 86400000);
      if (dias <= 60) alertas.push({ veiculo: v.apelido || v.placa || 'Sem nome', tipo: c.label, dias, data: d, id: v.id });
    });
  });
  alertas.sort((a, b) => a.dias - b.dias);

  const countEl = document.getElementById('countAlertas');
  if (countEl) countEl.textContent = alertas.length;

  const el = document.getElementById('alertasVencimento');
  if (!alertas.length) {
    el.innerHTML = `<div class="empty-state" style="padding:24px"><p>Nenhum vencimento proximo nos proximos 60 dias</p></div>`;
    return;
  }
  el.innerHTML = alertas.slice(0, 7).map(a => {
    const cor = a.dias < 0 ? '#ef4444' : a.dias <= 15 ? '#f59e0b' : '#22c55e';
    const txt = a.dias < 0 ? `Vencido ha ${Math.abs(a.dias)}d` : a.dias === 0 ? 'Vence hoje' : `${a.dias}d restantes`;
    return `
      <div class="alerta-item" onclick="openDetalhe('${a.id}')">
        <div class="alerta-dot" style="background:${cor}"></div>
        <div class="alerta-info">
          <strong>${a.veiculo}</strong>
          <small>${a.tipo} — ${formatDate(a.data)}</small>
        </div>
        <span class="alerta-badge" style="background:${cor}22;color:${cor}">${txt}</span>
      </div>`;
  }).join('');
}

function renderUltimos() {
  const sorted = [...veiculos].sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
  const el = document.getElementById('ultimosCadastros');
  if (!sorted.length) {
    el.innerHTML = `<div class="empty-state" style="padding:24px"><p>Nenhum veiculo cadastrado ainda</p></div>`;
    return;
  }
  el.innerHTML = sorted.slice(0, 6).map(v => `
    <div class="alerta-item" onclick="openDetalhe('${v.id}')">
      <div style="width:34px;height:34px;background:rgba(255,179,0,.1);border:1px solid rgba(255,179,0,.2);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#ffb300;flex-shrink:0">
        ${svgCar(16)}
      </div>
      <div class="alerta-info">
        <strong>${v.apelido || 'Sem nome'}</strong>
        <small>${[v.marca, v.modelo, v.ano].filter(Boolean).join(' ')} — ${v.placa || ''}</small>
      </div>
      <span class="status-badge status-${v.status || 'Regular'}">${v.status || 'Regular'}</span>
    </div>`).join('');
}

// ══ VEÍCULOS ════════════════════════════════════════════════
function renderVeiculos() {
  const tipo   = document.getElementById('filtroTipo').value;
  const status = document.getElementById('filtroStatus').value;

  const filtered = veiculos.filter(v => {
    const q = !searchQuery ||
      (v.apelido||'').toLowerCase().includes(searchQuery) ||
      (v.placa||'').toLowerCase().includes(searchQuery) ||
      (v.marca||'').toLowerCase().includes(searchQuery) ||
      (v.modelo||'').toLowerCase().includes(searchQuery) ||
      (v.proprietario||'').toLowerCase().includes(searchQuery);
    return q && (!tipo || v.tipo === tipo) && (!status || v.status === status);
  });

  const grid = document.getElementById('veiculosGrid');
  if (listMode) grid.classList.add('list-view');
  else          grid.classList.remove('list-view');

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        ${svgCar(48)}<h3>Nenhum veiculo encontrado</h3>
        <p>Clique em "+ Novo Veiculo" para cadastrar</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map((v, i) => {
    const pv = proximoVencimento(v);
    return `
      <div class="veiculo-card" style="animation-delay:${i * .05}s" onclick="openDetalhe('${v.id}')">
        <div class="veiculo-card-top">
          <div class="veiculo-icon">${svgCar(22)}</div>
          <div>
            <div class="veiculo-name">${v.apelido || 'Sem nome'}</div>
            <div class="veiculo-plate">${v.placa || '---'}</div>
          </div>
        </div>
        <div class="veiculo-meta">
          ${v.marca ? `<span><strong>${v.marca}</strong> ${v.modelo||''} ${v.ano||''}</span>` : ''}
          ${v.cor   ? `<span>Cor: <strong>${v.cor}</strong></span>` : ''}
          ${v.proprietario ? `<span>Prop: <strong>${v.proprietario}</strong></span>` : ''}
          ${pv ? `<span style="color:${pv.cor}">${pv.label}: ${pv.txt}</span>` : ''}
        </div>
        <div class="veiculo-footer">
          <span class="status-badge status-${v.status||'Regular'}">${v.status||'Regular'}</span>
          <div class="veiculo-actions" onclick="event.stopPropagation()">
            <button class="icon-btn btn-sm" title="Editar" onclick="openModal('${v.id}')">${svgEdit()}</button>
            <button class="icon-btn btn-sm" title="Deletar" onclick="deletarVeiculo('${v.id}')">${svgTrash()}</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function proximoVencimento(v) {
  const campos = [
    {key:'ipva',label:'IPVA'},{key:'licenciamento',label:'Licenciamento'},
    {key:'seguro',label:'Seguro'},{key:'cnh',label:'CNH'},
    {key:'revisao',label:'Revisao'},{key:'vistoria',label:'Vistoria'}
  ];
  const hoje0 = new Date(); hoje0.setHours(0,0,0,0);
  let menor = null;
  campos.forEach(c => {
    if (!v[c.key]) return;
    const d    = new Date(v[c.key] + 'T00:00:00');
    const dias = Math.ceil((d - hoje0) / 86400000);
    if (!menor || dias < menor.dias) menor = {
      label: c.label, dias,
      cor: dias < 0 ? '#ef4444' : dias <= 15 ? '#f59e0b' : '#22c55e',
      txt: dias < 0 ? `Vencido ${Math.abs(dias)}d` : `${dias}d`
    };
  });
  return menor;
}

// ══ VENCIMENTOS ══════════════════════════════════════════════
function renderVencimentos() {
  const campos = [
    {key:'ipva',label:'IPVA'},{key:'licenciamento',label:'Licenciamento'},
    {key:'seguro',label:'Seguro'},{key:'cnh',label:'CNH'},
    {key:'revisao',label:'Revisao'},{key:'vistoria',label:'Vistoria'}
  ];
  const hoje0 = new Date(); hoje0.setHours(0,0,0,0);
  const rows  = [];
  veiculos.forEach(v => {
    campos.forEach(c => {
      if (!v[c.key]) return;
      const d    = new Date(v[c.key] + 'T00:00:00');
      const dias = Math.ceil((d - hoje0) / 86400000);
      rows.push({ v, c, d, dias });
    });
  });
  rows.sort((a, b) => a.dias - b.dias);

  const el = document.getElementById('vencimentosWrap');
  if (!rows.length) {
    el.innerHTML = `<div class="empty-state">${svgCal(48)}<h3>Nenhuma data cadastrada</h3><p>Adicione datas nos veiculos para acompanhar aqui</p></div>`;
    return;
  }
  el.innerHTML = rows.map((r, i) => {
    const cor = r.dias < 0 ? '#ef4444' : r.dias <= 15 ? '#f59e0b' : '#22c55e';
    const cls = r.dias < 0 ? 'venc-danger' : r.dias <= 15 ? 'venc-warning' : 'venc-ok';
    const txt = r.dias < 0 ? `Vencido ha ${Math.abs(r.dias)} dias` : r.dias === 0 ? 'Vence hoje' : `${r.dias} dias restantes`;
    return `
      <div class="venc-row ${cls}" style="animation-delay:${i * .04}s" onclick="openDetalhe('${r.v.id}')">
        <div>
          <div class="venc-name">${r.v.apelido || 'Sem nome'}</div>
          <div class="venc-tipo">${r.v.placa||''} — ${r.v.marca||''} ${r.v.modelo||''}</div>
        </div>
        <div class="venc-date">${r.c.label}</div>
        <div class="venc-date">${formatDate(r.d)}</div>
        <div class="venc-dias" style="color:${cor}">${txt}</div>
      </div>`;
  }).join('');
}

// ══ DOCUMENTOS ═══════════════════════════════════════════════
function renderDocumentos() {
  const el      = document.getElementById('documentosWrap');
  const comDocs = veiculos.filter(v => (v.documentos||[]).length > 0);
  if (!comDocs.length) {
    el.innerHTML = `<div class="empty-state">${svgDoc(48)}<h3>Nenhum documento salvo</h3><p>Abra um veiculo e adicione documentos nos detalhes</p></div>`;
    return;
  }
  el.innerHTML = comD

