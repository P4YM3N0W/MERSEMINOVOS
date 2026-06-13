const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');

const app  = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const DB_DIR  = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'crm.json');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const defaultDB = {
  vendas: [],
  configuracoes: {
    etapas: [
      { id: 'documentacao',  label: 'Documentacao',   cor: '#ffb300' },
      { id: 'financiamento', label: 'Financiamento',  cor: '#ff7a18' },
      { id: 'transferencia', label: 'Transferencia',  cor: '#a855f7' },
      { id: 'entrega',       label: 'Entrega',        cor: '#3b82f6' },
      { id: 'concluido',     label: 'Concluido',      cor: '#22c55e' },
      { id: 'problema',      label: 'Problema',       cor: '#ef4444' }
    ]
  }
};

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2));
}

const readDB  = ()     => JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// ── VENDAS ─────────────────────────────────────────────────────

app.get('/api/vendas', (req, res) => {
  res.json(readDB().vendas);
});

app.get('/api/vendas/:id', (req, res) => {
  const db = readDB();
  const v  = db.vendas.find(v => v.id === req.params.id);
  if (!v) return res.status(404).json({ error: 'Nao encontrado' });
  res.json(v);
});

app.post('/api/vendas', (req, res) => {
  const db    = readDB();
  const venda = {
    id:           uuidv4(),
    criadoEm:     new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    etapa:        'documentacao',
    historico:    [],
    tarefas:      [],
    ...req.body
  };
  venda.historico.push({
    id:        uuidv4(),
    data:      new Date().toISOString(),
    tipo:      'criacao',
    descricao: 'Venda cadastrada no sistema'
  });
  db.vendas.push(venda);
  writeDB(db);
  res.status(201).json(venda);
});

app.put('/api/vendas/:id', (req, res) => {
  const db  = readDB();
  const idx = db.vendas.findIndex(v => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Nao encontrado' });
  const antiga = db.vendas[idx];
  db.vendas[idx] = {
    ...antiga,
    ...req.body,
    id:           antiga.id,
    criadoEm:     antiga.criadoEm,
    historico:    antiga.historico,
    tarefas:      antiga.tarefas,
    atualizadoEm: new Date().toISOString()
  };
  writeDB(db);
  res.json(db.vendas[idx]);
});

app.delete('/api/vendas/:id', (req, res) => {
  const db = readDB();
  db.vendas = db.vendas.filter(v => v.id !== req.params.id);
  writeDB(db);
  res.json({ ok: true });
});

// ── ETAPA ──────────────────────────────────────────────────────

app.patch('/api/vendas/:id/etapa', (req, res) => {
  const db  = readDB();
  const idx = db.vendas.findIndex(v => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Nao encontrado' });

  const { etapa, obs } = req.body;
  const etapaAnterior  = db.vendas[idx].etapa;

  db.vendas[idx].etapa        = etapa;
  db.vendas[idx].atualizadoEm = new Date().toISOString();
  db.vendas[idx].historico.push({
    id:        uuidv4(),
    data:      new Date().toISOString(),
    tipo:      'etapa',
    descricao: `Etapa alterada: ${etapaAnterior} → ${etapa}`,
    obs:       obs || ''
  });

  writeDB(db);
  res.json(db.vendas[idx]);
});

// ── HISTORICO ──────────────────────────────────────────────────

app.post('/api/vendas/:id/historico', (req, res) => {
  const db  = readDB();
  const idx = db.vendas.findIndex(v => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Nao encontrado' });

  const entry = {
    id:        uuidv4(),
    data:      new Date().toISOString(),
    tipo:      req.body.tipo || 'nota',
    descricao: req.body.descricao,
    autor:     req.body.autor || 'Sistema'
  };
  db.vendas[idx].historico.push(entry);
  db.vendas[idx].atualizadoEm = new Date().toISOString();
  writeDB(db);
  res.status(201).json(entry);
});

// ── TAREFAS ────────────────────────────────────────────────────

app.post('/api/vendas/:id/tarefas', (req, res) => {
  const db  = readDB();
  const idx = db.vendas.findIndex(v => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Nao encontrado' });

  const tarefa = {
    id:        uuidv4(),
    criadoEm:  new Date().toISOString(),
    feita:     false,
    ...req.body
  };
  db.vendas[idx].tarefas.push(tarefa);
  db.vendas[idx].atualizadoEm = new Date().toISOString();
  writeDB(db);
  res.status(201).json(tarefa);
});

app.patch('/api/vendas/:id/tarefas/:tid', (req, res) => {
  const db  = readDB();
  const idx = db.vendas.findIndex(v => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Nao encontrado' });

  const tidx = db.vendas[idx].tarefas.findIndex(t => t.id === req.params.tid);
  if (tidx === -1) return res.status(404).json({ error: 'Tarefa nao encontrada' });

  db.vendas[idx].tarefas[tidx] = {
    ...db.vendas[idx].tarefas[tidx],
    ...req.body
  };
  db.vendas[idx].atualizadoEm = new Date().toISOString();
  writeDB(db);
  res.json(db.vendas[idx].tarefas[tidx]);
});

app.delete('/api/vendas/:id/tarefas/:tid', (req, res) => {
  const db  = readDB();
  const idx = db.vendas.findIndex(v => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Nao encontrado' });
  db.vendas[idx].tarefas = db.vendas[idx].tarefas.filter(t => t.id !== req.params.tid);
  db.vendas[idx].atualizadoEm = new Date().toISOString();
  writeDB(db);
  res.json({ ok: true });
});

// ── EXPORT / IMPORT ────────────────────────────────────────────

app.get('/api/export', (req, res) => {
  const db = readDB();
  res.setHeader('Content-Disposition', 'attachment; filename="mer-crm-backup.json"');
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(db, null, 2));
});

app.post('/api/import', (req, res) => {
  try {
    const data = req.body;
    if (!data.vendas || !Array.isArray(data.vendas)) {
      return res.status(400).json({ error: 'Arquivo invalido' });
    }
    writeDB(data);
    res.json({ ok: true, total: data.vendas.length });
  } catch {
    res.status(500).json({ error: 'Erro ao importar' });
  }
});

// ── CONFIG ─────────────────────────────────────────────────────

app.get('/api/config', (req, res) => {
  res.json(readDB().configuracoes);
});

app.listen(PORT, () => {
  console.log(`\n  MeR Seminovos CRM rodando em http://localhost:${PORT}\n`);
});
