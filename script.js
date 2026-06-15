let db = JSON.parse(localStorage.getItem('mer_db') || '[]');

function view(id) {
    const app = document.getElementById('app');
    if(id === 'cadastro') {
        app.innerHTML = `<div class="card">
            <h2>Gestão de Veículo</h2>
            <input type="hidden" id="editIndex" value="-1">
            <input type="text" id="modelo" placeholder="Modelo">
            <input type="text" id="placa" placeholder="Placa">
            <input type="text" id="telAtual" placeholder="Tel. Dono Atual">
            <input type="text" id="telAnterior" placeholder="Tel. Ex-Dono">
            <select id="ipva"><option value="Pago">IPVA Pago</option><option value="Atrasado">IPVA Atrasado</option></select>
            <select id="multa"><option value="Sem">Sem Multa</option><option value="Pendente">Multa Pendente</option></select>
            <button class="btn-main" onclick="salvar()">Salvar</button>
        </div>`;
    } else {
        app.innerHTML = `<div class="grid" id="lista"></div>`;
        render();
    }
}

function salvar() {
    const idx = parseInt(document.getElementById('editIndex').value);
    const v = {
        modelo: document.getElementById('modelo').value,
        placa: document.getElementById('placa').value.toUpperCase(),
        telAtual: document.getElementById('telAtual').value,
        telAnterior: document.getElementById('telAnterior').value,
        ipva: document.getElementById('ipva').value,
        multa: document.getElementById('multa').value
    };
    if(idx > -1) db[idx] = v; else db.push(v);
    localStorage.setItem('mer_db', JSON.stringify(db));
    alert('Operação concluída!');
    view('estoque');
}

function render() {
    document.getElementById('lista').innerHTML = db.map((v, i) => `
        <div class="card ${v.ipva === 'Atrasado' || v.multa === 'Pendente' ? 'alerta' : ''}">
            <h3>${v.modelo}</h3>
            <p>Placa: ${v.placa}</p>
            <a class="btn-wa" href="https://wa.me/55${v.telAtual}" target="_blank">📞 Dono</a>
            <a class="btn-wa" href="https://wa.me/55${v.telAnterior}" target="_blank">📞 Ex-Dono</a>
            <br><button class="nav-btn" onclick="editar(${i})">✏️</button>
            <button class="nav-btn" onclick="excluir(${i})">🗑️</button>
        </div>
    `).join('');
}

function editar(i) {
    view('cadastro');
    const v = db[i];
    document.getElementById('editIndex').value = i;
    document.getElementById('modelo').value = v.modelo;
    document.getElementById('placa').value = v.placa;
}

function excluir(i) { if(confirm('Excluir?')) { db.splice(i, 1); localStorage.setItem('mer_db', JSON.stringify(db)); render(); } }

function exportarBackup() {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(db)])); a.download = 'backup.json'; a.click();
}

function importarBackup(e) {
    const reader = new FileReader(); reader.onload = (evt) => { db = JSON.parse(evt.target.result); localStorage.setItem('mer_db', JSON.stringify(db)); location.reload(); };
    reader.readAsText(e.target.files[0]);
}

view('estoque');
