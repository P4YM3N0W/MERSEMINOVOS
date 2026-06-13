const express = require('express');
const multer  = require('multer');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');

const app  = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const DB_FILE     = path.join(__dirname, 'data', 'veiculos.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

[path.join(__dirname, 'data'), UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));

const readDB  = ()     => JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  }
});

// Listar veiculos
app.get('/api/veiculos', (req, res) => res.json(readDB()));

// Buscar por ID
app.get('/api/veiculos/:id', (req, res) => {
  const v = readDB().find(v => v.id === req.params.id);
  if (!v) return res.status(404).json({ error: 'Nao encontrado' });
  res.json(v);
});

// Criar veiculo
app.post('/api/veiculos', (req, res) => {
  const db = readDB();
  const veiculo = {
    id:           uuidv4(),
    criadoEm:     new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    documentos:   [],
    ...req.body
  };
  db.push(veiculo);
  writeDB(db);
  res.status(201).json(veiculo);
});

// Atualizar veiculo
app.put('/api/veiculos/:id', (req, res) => {
  const db  = readDB();
  const idx = db.findIndex(v => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Nao encontrado' });
  db[idx] = { ...db[idx], ...req.body, atualizadoEm: new Date().toISOString() };
  writeDB(db);
  res.json(db[idx]);
});

// Deletar veiculo
app.delete('/api/veiculos/:id', (req, res) => {
  let db  = readDB();
  const v = db.find(v => v.id === req.params.id);
  if (!v) return res.status(404).json({ error: 'Nao encontrado' });
  (v.documentos || []).forEach(doc => {
    const fp = path.join(UPLOADS_DIR, path.basename(doc.url));
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  });
  writeDB(db.filter(v => v.id !== req.params.id));
  res.json({ ok: true });
});

// Upload de documento
app.post('/api/veiculos/:id/documentos', upload.single('arquivo'), (req, res) => {
  const db  = readDB();
  const idx = db.findIndex(v => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Nao encontrado' });
  const doc = {
    id:       uuidv4(),
    nome:     req.body.nome || req.file.originalname,
    tipo:     req.body.tipo || 'Outro',
    url:      `/uploads/${req.file.filename}`,
    tamanho:  req.file.size,
    criadoEm: new Date().toISOString()
  };
  db[idx].documentos.push(doc);
  db[idx].atualizadoEm = new Date().toISOString();
  writeDB(db);
  res.status(201).json(doc);
});

// Deletar documento
app.delete('/api/veiculos/:id/documentos/:docId', (req, res) => {
  const db  = readDB();
  const idx = db.findIndex(v => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Nao encontrado' });
  const doc = db[idx].documentos.find(d => d.id === req.params.docId);
  if (!doc) return res.status(404).json({ error: 'Documento nao encontrado' });
  const fp = path.join(UPLOADS_DIR, path.basename(doc.url));
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  db[idx].documentos = db[idx].documentos.filter(d => d.id !== req.params.docId);
  db[idx].atualizadoEm = new Date().toISOString();
  writeDB(db);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`\n  MeR Seminovos rodando em http://localhost:${PORT}\n`);
});
