(() => {
    "use strict";

    document.addEventListener("DOMContentLoaded", () => {
        const showroom = document.querySelector("#showroom-grid");
        
        if (!showroom) return;

        // Número de telefone da JM AUTOCAR (DDD + Número, apenas dígitos)
        const TELEFONE_WHATSAPP = "5531999999999"; 

        /* 
           OTIMIZAÇÃO: Delegação de Eventos. 
           Um único ponto de escuta para todos os botões de carros atuais e futuros.
        */
        showroom.addEventListener("click", (event) => {
            const botao = event.target.closest('[data-action="negociar"]');
            
            if (botao) {
                const modeloCarro = botao.getAttribute("data-vehicle");
                abrirConversaWhatsApp(modeloCarro, TELEFONE_WHATSAPP);
            }
        });
    });

    function abrirConversaWhatsApp(carro, telefone) {
        // Mensagem personalizada automática para o lead chegar pronto
        const mensagem = `Olá Jarod, tenho interesse no veículo: ${carro} que vi no catálogo.`;
        const urlFormatada = `https://api.whatsapp.com/send?phone=${telefone}&text=${encodeURIComponent(mensagem)}`;
        
        // Abre em uma nova aba de forma segura e performática
        window.open(urlFormatada, "_blank", "noopener,noreferrer");
    }
})();
