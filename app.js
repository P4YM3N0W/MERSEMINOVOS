// ─────────────────────────────────────────────────────────────
//  MeR Seminovos — 100% localStorage, sem servidor, sem fetch
// ─────────────────────────────────────────────────────────────

var CHAVE       = 'mer_v3';
var DB          = [];
var VIEW        = 'dashboard';
var LISTA_MODE  = false;
var QUERY       = '';
var EDIT_ID     = null;
var DET_ID      = null;

// ── Banco local ───────────────────────────────────────────────
function dbSalvar() {
  localStorage.setItem(CHAVE, JSON.stringify(DB));
}
function dbCarregar() {
  try { var r = localStorage.getItem(CHAVE); return r ? JSON.parse(r) : []; }
  catch(e) { return []; }
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Boot ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', function() {
  DB = dbCarregar();
  bindAll();
  ir('dashboard');
});

// ── Bind geral ────────────────────────────────────────────────
function bindAll() {

  // Nav sidebar
  document.querySelectorAll('.nb').forEach(function(b) {
    b.addEventListener('click', function() {
      document.querySelectorAll('.nb').forEach(function(x) { x.classList.remove('active'); });
      b.classList.add('active');
      ir(b.dataset.view);
    });
  });

  // Toggle sidebar
  document.getElementById('btnToggleSidebar').addEventListener('click', function() {
    document.getElementById('sidebar').classList.toggle('col');
  });

  // Novo veiculo
  document.getElementById('btnNovoVeiculo').addEventListener('click', function() {
    abrirModal(null);
  });

  // Salvar veiculo
  document.getElementById('btnSalvarVeiculo').addEventListener('click', function() {
    salvarVeiculo();
  });

  // Cancelar / fechar modais
  document.getElementById('btnCancelarModal').addEventListener('click', fecharModal);
  document.getElementById('btnFecharModal').addEventListener('click', fecharModal);
  document.getElementById('btnFecharDetalhe').addEventListener('click', fecharDetalhe);

  document.getElementById('overlayVeiculo').addEventListener('click', function(e) {
    if (e.target === this) fecharModal();
  });
  document.getElementById('overlayDetalhe').addEventListener('click', function(e) {
    if (e.target === this) fecharDetalhe();
  });

  // Busca
  document.getElementById('searchInput').addEventListener('input', function() {
    QUERY = this.value.toLowerCase();
    if (VIEW === 'veiculos') renderVeiculos();
  });

  // Filtros
  document.getElementById('filtroTipo').addEventListener('change', function() {
    if (VIEW === 'veiculos') renderVeiculos();
  });
  document.getElementById('filtroStatus').addEventListener('change', function() {
    if (VIEW === 'veiculos') renderVeiculos();
  });

  // Grade / Lista
  document.getElementById('btnGrade').addEventListener('click', function() {
    LISTA_MODE = false;
    document.getElementById('btnGrade').classList.add('active');
    document.getElementById('btnLista').classList.remove('active');
    if (VIEW === 'veiculos') renderVeiculos();
  });
  document.getElementById('btnLista').addEventListener('click', function() {
    LISTA_MODE = true;
    document.getElementById('btnLista').classList.add('active');
    document.getElementById('btnGrade').classList.remove('active');
    if (VIEW === 'veiculos') renderVeiculos();
  });

  // Exportar / Importar
  document.getElementById('btnExportar').addEventListener('click', exportarXLS);
  document.getElementById('btnImportar').addEventListener('click', function() {
    document.getElementById('fileImport').click();
  });
  document.getElementById('fileImport').addEventListener('change', function() {
    if (this.files[0]) importarArquivo(this.files[0]);
    this.value = '';
  });
}

// ── Roteamento de views ───────────────────────────────────────
function ir(view) {
  VIEW = view;
  document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
  document.getElementById('view-' + view).classList.add('active');
  var t = { dashboard:'Dashboard', veiculos:'Veiculos', vencimentos:'Vencimentos', documentos:'Documentos' };
  document.getElementById('pageTitle').textContent = t[view] || '';
  if (view === 'dashboard')   renderDashboard();
  if (view === 'veiculos')    renderVeiculos();
  if (view === 'vencimentos') renderVencimentos();
  if (view === 'documentos')  renderDocumentos();
}

// ── Dashboard ─────────────────────────────────────────────────
function renderDashboard() {
  var stats = [
    { l:'Total Veiculos', v: DB.length,                                                             c:'#ffb300' },
    { l:'Regulares',      v: DB.filter(function(x){ return x.status==='Regular';  }).length,         c:'#22c55e' },
    { l:'Pendentes',      v: DB.filter(function(x){ return x.status==='Pendente'; }).length,         c:'#f59e0b' },
    { l:'Vencidos',       v: DB.filter(function(x){ return x.status==='Vencido';  }).length,         c:'#ef4444' },
    { l:'Documentos',     v: DB.reduce(function(a,x){ return a+(x.docs?x.docs.length:0); }, 0),      c:'#ff7a18' }
  ];
  document.getElementById('statsGrid').innerHTML = stats.map(function(s, i) {
    return '<div class="stat-card" style="animation-delay:'+(i*.07)+'s;border-top-color:'+s.c+'">' +
      '<div class="stat-val" style="color:'+s.c+'">'+s.v+'</div>' +
      '<div class="stat-label">'+s.l+'</div></div>';
  }).join('');

  renderAlertas();
  renderUltimos();
}

function getHoje() { var h = new Date(); h.setHours(0,0,0,0); return h; }

var CAMPOS = [
  {k:'ipva',l:'IPVA'},{k:'licenciamento',l:'Licenciamento'},
  {k:'seguro',l:'Seguro'},{k:'cnh',l:'CNH'},
  {k:'revisao',l:'Revisao'},{k:'vistoria',l:'Vistoria'}
];

function diasParaVencer(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr+'T00:00:00') - getHoje()) / 86400000);
}
function corDias(d) { return d < 0 ? '#ef4444' : d <= 15 ? '#f59e0b' : '#22c55e'; }
function txtDias(d) { return d < 0 ? 'Vencido ha '+Math.abs(d)+'d' : d === 0 ? 'Vence hoje' : d+'d restantes'; }

function renderAlertas() {
  var lista = [];
  DB.forEach(function(v) {
    CAMPOS.forEach(function(c) {
      var d = diasParaVencer(v[c.k]);
      if (d !== null && d <= 60) lista.push({nome: v.apelido||v.placa||'Sem nome', tipo:c.l, dias:d, data:v[c.k], id:v.id});
    });
  });
  lista.sort(function(a,b){ return a.dias-b.dias; });

  document.getElementById('cntAlertas').textContent = lista.length;

  var el = document.getElementById('listaAlertas');
  if (!lista.length) { el.innerHTML = '<div class="ai" style="cursor:default"><div class="ai-info"><small>Nenhum vencimento nos proximos 60 dias</small></div></div>'; return; }

  el.innerHTML = lista.slice(0,7).map(function(a) {
    var c = corDias(a.dias);
    return '<div class="ai" onclick="openDetalhe(\''+a.id+'\')">'+
      '<div class="ai-dot" style="background:'+c+'"></div>'+
      '<div class="ai-info"><strong>'+a.nome+'</strong><small>'+a.tipo+' — '+fmtData(a.data)+'</small></div>'+
      '<span class="ai-tag" style="background:'+c+'22;color:'+c+'">'+txtDias(a.dias)+'</span></div>';
  }).join('');
}

function renderUltimos() {
  var sorted = DB.slice().sort(function(a,b){ return new Date(b.criadoEm)-new Date(a.criadoEm); });
  var el = document.getElementById('listaUltimos');
  if (!sorted.length) { el.innerHTML = '<div class="ai" style="cursor:default"><div class="ai-info"><small>Nenhum veiculo cadastrado</small></div></div>'; return; }
  el.innerHTML = sorted.slice(0,6).map(function(v) {
    var sub = [v.marca,v.modelo,v.ano].filter(Boolean).join(' ')+(v.placa?' — '+v.placa:'');
    return '<div class="ai" onclick="openDetalhe(\''+v.id+'\')">'+
      '<div style="width:34px;height:34px;background:rgba(255,179,0,.1);border:1px solid rgba(255,179,0,.2);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#ffb300;flex-shrink:0">'+iCar(16)+'</div>'+
      '<div class="ai-info"><strong>'+(v.apelido||'Sem nome')+'</strong><small>'+sub+'</small></div>'+
      '<span class="sb-reg s-'+(v.status||'Regular')+'">'+(v.status||'Regular')+'</span></div>';
  }).join('');
}

// ── Veiculos ──────────────────────────────────────────────────
function renderVeiculos() {
  var tipo   = document.getElementById('filtroTipo').value;
  var status = document.getElementById('filtroStatus').value;

  var lista = DB.filter(function(v) {
    var q = !QUERY ||
      (v.apelido||'').toLowerCase().includes(QUERY) ||
      (v.placa||'').toLowerCase().includes(QUERY) ||
      (v.marca||'').toLowerCase().includes(QUERY) ||
      (v.modelo||'').toLowerCase().includes(QUERY) ||
      (v.proprietario||'').toLowerCase().includes(QUERY);
    return q && (!tipo||v.tipo===tipo) && (!status||v.status===status);
  });

  var el = document.getElementById('gradeVeiculos');
  LISTA_MODE ? el.classList.add('lista') : el.classList.remove('lista');

  if (!lista.length) {
    el.innerHTML = '<div class="empty" style="grid-column:1/-1">'+iCar(48)+
      '<h3>Nenhum veiculo encontrado</h3><p>Clique em "+ Novo Veiculo" para cadastrar</p></div>';
    return;
  }

  el.innerHTML = lista.map(function(v, i) {
    var pv   = proxVenc(v);
    var meta = '';
    if (v.marca)        meta += '<span><strong>'+v.marca+'</strong> '+(v.modelo||'')+' '+(v.ano||'')+'</span>';
    if (v.cor)          meta += '<span>Cor: <strong>'+v.cor+'</strong></span>';
    if (v.proprietario) meta += '<span>Prop: <strong>'+v.proprietario+'</strong></span>';
    if (pv)             meta += '<span style="color:'+pv.c+'">'+pv.l+': '+pv.t+'</span>';

    return '<div class="vc" style="animation-delay:'+(i*.05)+'s" onclick="openDetalhe(\''+v.id+'\')">'+
      '<div class="vc-top"><div class="vc-icon">'+iCar(22)+'</div>'+
      '<div><div class="vc-nome">'+(v.apelido||'Sem nome')+'</div>'+
      '<div class="vc-placa">'+(v.placa||'---')+'</div></div></div>'+
      '<div class="vc-meta">'+meta+'</div>'+
      '<div class="vc-foot">'+
      '<span class="sb-reg s-'+(v.status||'Regular')+'">'+(v.status||'Regular')+'</span>'+
      '<div class="vc-acoes" onclick="event.stopPropagation()">'+
      '<button class="btn-icon" onclick="abrirModal(\''+v.id+'\')">'+iEdit()+'</button>'+
      '<button class="btn-icon" onclick="deletarVeiculo(\''+v.id+'\')">'+iTrash()+'</button>'+
      '</div></div></div>';
  }).join('');
}

function proxVenc(v) {
  var menor = null;
  CAMPOS.forEach(function(c) {
    var d = diasParaVencer(v[c.k]);
    if (d === null) return;
    if (!menor || d < menor.d) menor = { l:c.l, d:d, c:corDias(d), t:d<0?'Vencido '+Math.abs(d)+'d':d+'

