function importarBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        
        // Se for JSON, trata como backup do sistema
        if (file.type === "application/json" || text.trim().startsWith("[")) {
            db = JSON.parse(text);
        } 
        // Se for XML, faz a varredura inteligente
        else {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");
            
            // Procura por qualquer tag que contenha dados de veículo
            const nodes = xmlDoc.querySelectorAll("*"); 
            
            nodes.forEach(node => {
                // Tenta extrair dados baseados em nomes comuns de campos
                const modelo = node.querySelector("modelo, name, title")?.textContent;
                const placa = node.querySelector("placa, plate, doc")?.textContent;
                
                if (modelo && placa) {
                    db.push({
                        modelo: modelo,
                        placa: placa.toUpperCase(),
                        telAtual: "",
                        telAnterior: "",
                        ipva: "Pago",
                        multa: "Sem",
                        valor: "0"
                    });
                }
            });
        }
        
        localStorage.setItem('mer_db', JSON.stringify(db));
        alert('Importação concluída com sucesso!');
        render();
    };
    reader.readAsText(file);
}
