let db = JSON.parse(localStorage.getItem('mer_db') || '[]');

function view(id) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    if(id === 'estoque') render();
}

function salvar() {
    const editIndex = parseInt(document.getElementById('editIndex').value);
    const v = {
        modelo: document.getElementById('mModelo').value,
        placa: document.getElementById('mPlaca').value.toUpperCase(),
        chassi: document.getElementById('mChassi').value,
        renavam: document.getElementById('mRenavam').value,
        telAtual: document.getElementById('mTelAtual').value,
        telAnterior: document.getElementById('mTelAnterior').value,
        ipva: document.getElementById('mIpva').value,
        multa: document.getElementById('mMulta').value,
        valor: document.getElementById('mValor').value
    };
    if(editIndex > -1) db[editIndex] = v; else db.push(v);
    localStorage.setItem('mer_db', JSON.stringify(db));
    alert('Operação realizada!');
    location.reload();
}

function render() {
    document.getElementById('lista').innerHTML = db.map((v, i) => `
        <div class="card ${v.ipva === 'Atrasado' || v.multa === 'Pendente' ? 'alerta' : ''}">
            <h3>${v.modelo}</h3>
            <p>Placa: ${v.placa}</p>
            <a class="btn-wa" href="https://wa.me/55${v.telAtual}" target="_blank">📞 Dono Atual</a>
            <a class="btn-wa" href="https://wa.me/55${v.telAnterior}" target="_blank">📞 Ex-Dono</a>
            <br><button onclick="editar(${i})">✏️ Editar</button>
            <button onclick="excluir(${i})">🗑️ Excluir</button>
        </div>
    `).join('');
}

function editar(i) {
    const v = db[i];
    document.getElementById('editIndex').value = i;
    document.getElementById('mModelo').value = v.modelo;
    document.getElementById('mPlaca').value = v.placa;
    view('cadastro');
}

function excluir(i) {
    if(confirm('Excluir?')) { db.splice(i, 1); localStorage.setItem('mer_db', JSON.stringify(db)); render(); }
}

function exportarBackup() {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(db)])); a.download = 'backup.json'; a.click();
}

function importar(e) {
    const reader = new FileReader(); reader.onload = (evt) => { db = JSON.parse(evt.target.result); localStorage.setItem('mer_db', JSON.stringify(db)); location.reload(); };
    reader.readAsText(e.target.files[0]);
}
