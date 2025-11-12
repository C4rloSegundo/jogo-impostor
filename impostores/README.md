# Fake It — protótipo

Protótipo simples do jogo "Fake It" (impostor), implementado em HTML/CSS/JS para rodar localmente no navegador.

Funcionalidades implementadas:
- Cadastro de jogadores (adicionar/remover nomes)
- Configurar número de impostores
- Sortear impostores e palavra secreta (com dica)
- Cada jogador recebe sua tela: toque ou arraste para cima para revelar a palavra (ou indicar impostor)
- Ao descer/continuar, passa para o próximo jogador
- Ao terminar a sequência, inicia um cronômetro de discussão configurável

Como usar:
1. Abra `index.html` no navegador (arraste para a barra de endereço ou use um servidor local).
2. Adicione jogadores usando o campo "Nome do jogador" e botão +.
3. Ajuste o número de impostores e a duração (segundos).
4. Clique em "Iniciar Jogo".
5. Entregue o celular para cada jogador: eles devem arrastar pra cima (ou tocar) para revelar a palavra/dica. Em seguida, clique em "Continuar" para o próximo jogador.

Observações e próximos passos possíveis:
- Melhorar animações do swipe e esconder automaticamente ao descer o banner.
- Suportar múltiplos rounds, votação e resultados.
- Sincronização entre vários dispositivos (WebSockets) para jogo remoto.

Autor: protótipo gerado por assistente
