let db = JSON.parse(localStorage.getItem('mer_db') || '[]');

function view(id) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    if(id === 'estoque') render();
}

function salvar() {
    const v = {
        id: Date.now(),
        modelo: document.getElementById('modelo').value,
        placa: document.getElementById('placa').value
    };
    db.push(v);
    localStorage.setItem('mer_db', JSON.stringify(db));
    alert('Veículo salvo!');
    location.reload();
}

function render() {
    document.getElementById('lista').innerHTML = db.map(v => `
        <div class="card">
            <h3>${v.modelo}</h3>
            <p>Placa: ${v.placa}</p>
        </div>
    `).join('');
}

function backup() {
    const data = JSON.stringify(db);
    const blob = new Blob([data], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'backup_crm.json';
    a.click();
}
