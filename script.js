let db = JSON.parse(localStorage.getItem('mer_db') || '[]');

function show(view) {
    const app = document.getElementById('app');
    if(view === 'cadastro') {
        app.innerHTML = `
            <div class="card">
                <h2>Dados do Veículo</h2>
                <input type="text" id="modelo" placeholder="Modelo">
                <input type="text" id="placa" placeholder="Placa">
                <button class="btn-main" onclick="salvar()">Salvar Veículo</button>
            </div>
        `;
    } else {
        renderEstoque();
    }
}

function salvar() {
    const v = { id: Date.now(), modelo: document.getElementById('modelo').value, placa: document.getElementById('placa').value };
    db.push(v);
    localStorage.setItem('mer_db', JSON.stringify(db));
    alert('Veículo registrado!');
    show('estoque');
}

function renderEstoque() {
    const app = document.getElementById('app');
    app.innerHTML = `<div class="grid">${db.map(v => `<div class="card"><h3>${v.modelo}</h3><p>Placa: ${v.placa}</p></div>`).join('')}</div>`;
}

function exportar() {
    const data = JSON.stringify(db);
    const blob = new Blob([data], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'estoque.json';
    a.click();
}
