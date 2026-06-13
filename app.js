(function () {
  'use strict';

  /* ── Constantes ─────────────────────────────────────── */
  var KEY = 'mer_seminovos_v1';

  var CAMPOS = [
    { k: 'ipva',          l: 'IPVA'          },
    { k: 'licenciamento', l: 'Licenciamento'  },
    { k: 'seguro',        l: 'Seguro'         },
    { k: 'cnh',           l: 'CNH'            },
    { k: 'revisao',       l: 'Revisao'        },
    { k: 'vistoria',      l: 'Vistoria'       }
  ];

  /* ── Estado ─────────────────────────────────────────── */
  var DB          = [];
  var VIEW        = 'dashboard';
  var QUERY       = '';
  var LISTA       = false;
  var EDIT_ID     = null;
  var DET_ID      = null;

  /* ── Banco ──────────────────────────────────────────── */
  function dbLoad() {
    try {
      var r = localStorage.getItem(KEY);
      var p = r ? JSON.parse(r) : [];
      return Array.isArray(p) ? p : [];
    } catch (e) { return []; }
  }

  function dbSave() {
    localStorage.setItem(KEY, JSON.stringify(DB));
  }

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }

  /* ── Init ───────────────────────────────────────────── */
  window.addEventListener('DOMContentLoaded', function () {
    DB = dbLoad();
    bind();
    goView('dashboard');
  });

  /* ── Bind ───────────────────────────────────────────── */
  function bind() {

    /* Nav */
    qsa('.nb').forEach(function (b) {
      b.addEventListener('click', function () {
        qsa('.nb').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        goView(b.dataset.view);
      });
    });

    /* Sidebar toggle */
    on('btnToggle', 'click', function () {
      qs('sidebar').classList.toggle('col');
    });

    /* Novo veículo */
    on('btnNovoVeiculo', 'click', function () { abrirModal(null); });

    /* Salvar */
    on('btnSalvar', 'click', salvarVeiculo);

    /* Fechar modal */
    on('btnFecharModal', 'click', fecharModal);
    on('btnCancelar', 'click', fecharModal);
    qs('overlayVeiculo').addEventListener('click', function (e) {
      if (e.target === qs('overlayVeiculo')) fecharModal();
    });

    /* Fechar detalhe */
    on('btnFecharDetalhe', 'click', fecharDetalhe);
    qs('overlayDetalhe').addEventListener('click', function (e) {
      if (e.target === qs('overlayDetalhe')) fecharDetalhe();
    });

    /* Busca */
    on('searchInput', 'input', function () {
      QUERY = qs('searchInput').value.toLowerCase().trim();
      if (VIEW === 'veiculos') renderVeiculos();
    });

    /* Filtros */
    on('filtroTipo', 'change', function () { if (VIEW === 'veiculos') renderVeiculos(); });
    on('filtroStatus', 'change', function () { if (VIEW === 'veiculos') renderVeiculos(); });

    /* Grade / Lista */
    on('btnGrade', 'click', function () {
      LISTA = false;
      qs('btnGrade').classList.add('active');
      qs('btnLista').classList.remove('active');
      if (VIEW === 'veiculos') renderVeiculos();
    });
    on('btnLista', 'click', function () {
      LISTA = true;
      qs('btnLista').classList.add('active');
      qs('btnGrade').classList.remove('active');
      if (VIEW === 'veiculos') renderVeiculos();
    });

    /* Export / Import */
    on('btnExportar', 'click', exportarXLS);
    on('btnImportar', 'click', function () { qs('fileImport').click(); });
    qs('fileImport').addEventListener('change', function () {
      var f = qs('fileImport').files[0];
      if (f) importarArquivo(f);
      qs('fileImport').value = '';
    });
  }

  /* ── Router ─────────────────────────────────────────── */
  function goView(v) {
    VIEW = v;
    qsa('.view').forEach(function (el) { el.classList.remove('active'); });
    qs('view-' + v).classList.add('active');
    var t = { dashboard: 'Dashboard', veiculos: 'Veiculos', vencimentos: 'Vencimentos', documentos: 'Documentos' };
    qs('pageTitle').textContent = t[v] || v;
    if (v === 'dashboard')   renderDashboard();
    if (v === 'veiculos')    renderVeiculos();
    if (v === 'vencimentos') renderVencimentos();
    if (v === 'documentos')  renderDocumentos();
  }

  /* ── Dashboard ──────────────────────────────────────── */
  function renderDashboard() {
    var s = [
      { l: 'Total Veiculos', v: DB.length,                                                          c: '#ffb300' },
      { l: 'Regulares',      v: DB.filter(function (x) { return x.status === 'Regular'; }).length,  c: '#22c55e' },
      { l: 'Pendentes',      v: DB.filter(function (x) { return x.status === 'Pendente'; }).length, c: '#f59e0b' },
      { l: 'Vencidos',       v: DB.filter(function (x) { return x.status === 'Vencido'; }).length,  c: '#ef4444' },
      { l: 'Documentos',     v: DB.reduce(function (a, x) { return a + (x.docs ? x.docs.length : 0); }, 0), c: '#ff7a18' }
    ];
    html('statsGrid', s.map(function (x, i) {
      return '<div class="stat-card" style="animation-delay:' + (i * .07) + 's;border-top-color:' + x.c + '">' +
        '<div class="stat-val" style="color:' + x.c + '">' + x.v + '</div>' +
        '<div class="stat-label">' + x.l + '</div></div>';
    }).join(''));
    renderAlertas();
    renderUltimos();
  }

  function hoje0() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function dias(ds) { if (!ds) return null; return Math.ceil((new Date(ds + 'T00:00:00') - hoje0()) / 86400000); }
  function corDias(d) { return d < 0 ? '#ef4444' : d <= 15 ? '#f59e0b' : '#22c55e'; }
  function txDias(d)  { return d < 0 ? 'Vencido ha ' + Math.abs(d) + 'd' : d === 0 ? 'Vence hoje' : d + 'd restantes'; }

  function renderAlertas() {
    var lista = [];
    DB.forEach(function (v) {
      CAMPOS.forEach(function (c) {
        var d = dias(v[c.k]);
        if (d !== null && d <= 60) lista.push({ id: v.id, nome: v.apelido || v.placa || 'Sem nome', tipo: c.l, d: d, data: v[c.k] });
      });
    });
    lista.sort(function (a, b) { return a.d - b.d; });
    qs('cntAlertas').textContent = String(lista.length);
    if (!lista.length) {
      html('listaAlertas', '<div class="ai" style="cursor:default"><div class="ai-info"><small>Nenhum vencimento nos proximos 60 dias</small></div></div>');
      return;
    }
    html('listaAlertas', lista.slice(0, 7).map(function (a) {
      var c = corDias(a.d);
      return '<div class="ai" onclick="window._det(\'' + a.id + '\')">' +
        '<div class="ai-dot" style="background:' + c + '"></div>' +
        '<div class="ai-info"><strong>' + esc(a.nome) + '</strong><small>' + a.tipo + ' — ' + fmtD(a.data) + '</small></div>' +
        '<span class="ai-tag" style="background:' + c + '22;color:' + c + '">' + txDias(a.d) + '</span></div>';
    }).join(''));
  }

  function renderUltimos() {
    var sorted = DB.slice().sort(function (a, b) { return new Date(b.criadoEm) - new Date(a.criadoEm); });
    if (!sorted.length) {
      html('listaUltimos', '<div class="ai" style="cursor:default"><div class="ai-info"><small>Nenhum veiculo cadastrado</small></div></div>');
      return;
    }
    html('listaUltimos', sorted.slice(0, 6).map(function (v) {
      var sub = [v.marca, v.modelo, v.ano].filter(Boolean).join(' ') + (v.placa ? ' — ' + v.placa : '');
      return '<div class="ai" onclick="window._det(\'' + v.id + '\')">' +
        '<div class="ai-icon">' + iCar(16) + '</div>' +
        '<div class="ai-info"><strong>' + esc(v.apelido || 'Sem nome') + '</strong><small>' + esc(sub) + '</small></div>' +
        '<span class="status s-' + esc(v.status || 'Regular') + '">' + esc(v.status || 'Regular') + '</span></div>';
    }).join(''));
  }

  /* ── Veiculos ───────────────────────────────────────── */
  function renderVeiculos() {
    var tipo   = qs('filtroTipo').value;
    var status = qs('filtroStatus').value;
    var lista  = DB.filter(function (v) {
      var q = !QUERY ||
        (v.apelido || '').toLowerCase().includes(QUERY) ||
        (v.placa || '').toLowerCase().includes(QUERY) ||
        (v.marca || '').toLowerCase().includes(QUERY) ||
        (v.modelo || '').toLowerCase().includes(QUERY) ||
        (v.proprietario || '').toLowerCase().includes(QUERY);
      return q && (!tipo || v.tipo === tipo) && (!status || v.status === status);
    });

    var el = qs('gradeVeiculos');
    LISTA ? el.classList.add('lista') : el.classList.remove('lista');

    if (!lista.length) {
      el.innerHTML = '<div class="empty" style="grid-column:1/-1">' + iCar(48) +
        '<h3>Nenhum veiculo encontrado</h3><p>Clique em "+ Novo Veiculo" para cadastrar</p></div>';
      return;
    }

    el.innerHTML = lista.map(function (v, i) {
      var pv   = proxVenc(v);
      var meta = [];
      if (v.marca || v.modelo || v.ano) meta.push('<span><strong>' + esc(v.marca || '') + '</strong> ' + esc(v.modelo || '') + ' ' + esc(v.ano || '') + '</span>');
      if (v.cor)          meta.push('<span>Cor: <strong>' + esc(v.cor) + '</strong></span>');
      if (v.proprietario) meta.push('<span>Prop: <strong>' + esc(v.proprietario) + '</strong></span>');
      if (pv)             meta.push('<span style="color:' + pv.c + '">' + pv.l + ': ' + pv.t + '</span>');
      return '<div class="vc" style="animation-delay:' + (i * .05) + 's" onclick="window._det(\'' + v.id + '\')">' +
        '<div class="vc-top"><div class="vc-icon">' + iCar(22) + '</div>' +
        '<div><div class="vc-nome">' + esc(v.apelido || 'Sem nome') + '</div>' +
        '<div class="vc-placa">' + esc(v.placa || '---') + '</div></div></div>' +
        '<div class="vc-meta">' + meta.join('') + '</div>' +
        '<div class="vc-foot">' +
        '<span class="status s-' + esc(v.status || 'Regular') + '">' + esc(v.status || 'Regular') + '</span>' +
        '<div class="vc-acoes" onclick="event.stopPropagation()">' +
        '<button class="btn-sm" title="Editar" onclick="window._edit(\'' + v.id + '\')">' + iEdit() + '</button>' +
        '<button class="btn-sm" title="Deletar" onclick="window._del(\'' + v.id + '\')">' + iTrash() + '</button>' +
        '</div></div></div>';
    }).join('');
  }

  function proxVenc(v) {
    var h = hoje0(); var menor = null;
    CAMPOS.forEach(function (c) {
      if (!v[c.k]) return;
      var d = Math.ceil((new Date(v[c.k] + 'T00:00:00') - h) / 86400000);
      if (!menor || d < menor.d) menor = { l: c.l, d: d, c: corDias(d), t: d < 0 ? 'Vencido ' + Math.abs(d) + 'd' : d + 'd' };
    });
    return menor;
  }

  /* ── Vencimentos ────────────────────────────────────── */
  function renderVencimentos() {
    var h = hoje0(); var rows = [];
    DB.forEach(function (v) {
      CAMPOS.forEach(function (c) {
        if (!v[c.k]) return;
        var d = Math.ceil((new Date(v[c.k] + 'T00:00:00') - h) / 86400000);
        rows.push({ v: v, c: c, d: d, data: v[c.k] });
      });
    });
    rows.sort(function (a, b) { return a.d - b.d; });
    var el = qs('listaVencimentos');
    if (!rows.length) {
      el.innerHTML = '<div class="empty">' + iCal(48) + '<h3>Nenhuma data cadastrada</h3><p>Adicione datas nos veiculos</p></div>';
      return;
    }
    el.innerHTML = rows.map(function (r, i) {
      var cor = corDias(r.d);
      var txt = r.d < 0 ? 'Vencido ha ' + Math.abs(r.d) + ' dias' : r.d === 0 ? 'Vence hoje' : r.d + ' dias restantes';
      return '<div class="venc-row" style="animation-delay:' + (i * .04) + 's;border-left:3px solid ' + cor + '" onclick="window._det(\'' + r.v.id + '\')">' +
        '<div><div class="venc-nome">' + esc(r.v.apelido || 'Sem nome') + '</div><div class="venc-sub">' + esc(r.v.placa || '') + ' ' + esc(r.v.marca || '') + ' ' + esc(r.v.modelo || '') + '</div></div>' +
        '<div class="venc-tipo">' + r.c.l + '</div>' +
        '<div class="venc-data">' + fmtD(r.data) + '</div>' +
        '<div class="venc-dias" style="color:' + cor + '">' + txt + '</div></div>';
    }).join('');
  }

  /* ── Documentos view ────────────────────────────────── */
  function renderDocumentos() {
    var el

