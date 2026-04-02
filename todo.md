# Bingo Digital SaaS - TODO

## Banco de Dados
- [x] Schema: tabela users (já existe, estender com plano)
- [x] Schema: tabela bingo_rooms (salas de bingo por operador)
- [x] Schema: tabela bingo_cards (cartelas únicas com token criptografado)
- [x] Schema: tabela drawn_numbers (números sorteados por sala)
- [x] Schema: tabela transactions (transações de pagamento)
- [x] Schema: tabela subscription_plans (planos de assinatura)
- [x] Schema: tabela winners (ganhadores por sala)
- [x] Migrations geradas e aplicadas

## Backend (tRPC + WebSocket)
- [x] Router: bingo rooms (criar, listar, configurar, iniciar, pausar, encerrar)
- [x] Router: cards (gerar cartela única, listar, buscar por token/QR)
- [x] Router: draw (sorteio automático, verificação de ganhadores)
- [x] Router: transactions (registrar, listar, relatórios)
- [x] Router: subscriptions (planos, controle de acesso)
- [x] Router: admin (dashboard, relatórios consolidados)
- [x] Motor de bingo: geração de cartelas únicas 1-75
- [x] Motor de bingo: verificação de vitória (linha, coluna, cartela cheia)
- [x] WebSocket: sincronização em tempo real (números sorteados, ganhadores)
- [x] Segurança: tokens criptografados para cartelas
- [x] Isolamento de dados por operador (middleware de autorização)

## Frontend - Landing Page
- [x] Landing page pública com apresentação do produto
- [x] Seção de planos de assinatura
- [x] CTA para cadastro/login

## Frontend - Autenticação
- [x] Login via OAuth Manus
- [x] Redirecionamento pós-login para dashboard

## Frontend - Dashboard do Operador
- [x] Layout com sidebar (DashboardLayout)
- [x] Página inicial: resumo de bingos ativos, cartelas vendidas, faturamento
- [x] Gerenciamento de bingos: criar, listar, editar
- [x] Configuração de bingo: valor de cartelas, prêmio, nome
- [x] Controles de sorteio: iniciar, pausar, encerrar
- [x] Visualização de cartelas vendidas
- [x] Lista de jogadores por bingo
- [x] Lista de ganhadores
- [x] Relatórios de vendas e faturamento
- [x] Configurações de conta e plano

## Frontend - Área do Jogador
- [x] Página acessível via QR Code (rota pública /play/:token)
- [x] Exibição da cartela do jogador (grid 5x5)
- [x] Marcação automática dos números em tempo real
- [x] Notificação quando número está na cartela
- [x] Notificação "Bingo realizado!"
- [x] Conexão WebSocket para atualizações em tempo real

## Frontend - Tela Pública ao Vivo
- [x] Rota pública /live/:slug
- [x] Último número sorteado em destaque
- [x] Histórico de números sorteados
- [x] Animação de sorteio (ball-pop)
- [x] Sincronização em tempo real via WebSocket
- [x] Painel completo de números B-I-N-G-O

## Impressão Térmica
- [x] Layout otimizado para impressão térmica (80mm)
- [x] QR Code grande e legível
- [x] ID da cartela e informações básicas
- [x] Rota /print/:token para impressão

## Planos de Assinatura
- [x] Definição dos planos: Free, Básico, Profissional, Premium
- [x] Controle de limites por plano (nº de bingos, cartelas)
- [x] Página de gerenciamento de assinatura
- [x] Preparação para integração PagSeguro

## Testes
- [x] Testes do motor de bingo (geração de cartelas únicas)
- [x] Testes de verificação de ganhadores (linha, coluna, cartela cheia)
- [x] Testes de getColumnLabel
- [x] Testes de auth.logout
- [x] 17 testes passando (2 arquivos)
- [x] Checkpoint final

## Novos Requisitos (Fase 2)
- [x] Tela de Operação ao Vivo (BingoOperator): painel completo para o operador conduzir o bingo
- [x] Painel B-I-N-G-O com todos os 75 números destacando sorteados
- [x] Botão de sorteio manual grande e visível
- [x] Sorteio automático com contagem regressiva
- [x] Último número sorteado em destaque animado
- [x] Lista de ganhadores em tempo real
- [x] Controles de status (iniciar/pausar/encerrar) integrados
- [x] Seleção de cartelas estilo Moderninha Smart (CardSelector)
- [x] Botões numerados (1 a N cartelas) com preço por cartela
- [x] Preço acumulado conforme seleção
- [x] Informações de prêmios (Prêmio 1, 2, 3) no topo
- [x] Navegação por páginas quando há muitas cartelas
- [x] Integração da seleção com geração de cartelas

## Fase 3 - Compra Pública e Tela de Transmissão
- [x] Router público para buscar sala por slug (sem autenticação)
- [x] Router público para comprar cartelas (nome + telefone + quantidade)
- [x] Página de compra pública /buy/:slug estilo Moderninha
- [x] Tela de transmissão ao vivo /show/:slug para TV/telão
- [x] Bola animada grande com número sorteado em destaque
- [x] Painel B-I-N-G-O completo com todos os 75 números
- [x] Histórico dos últimos números sorteados
- [x] Contador de cartelas vendidas e prêmio em destaque
- [x] Animação de ganhador (overlay de celebração)
- [x] Links de compartilhamento no painel do operador

## Fase 4 - Simplificação e Fluxo Maquininha
- [x] Formulário de criação de bingo simplificado (só nome + quantidade de cartelas)
- [x] Preço fixo de R$ 0,01 por cartela (hardcoded no sistema)
- [x] Tela de venda na maquininha: selecionar quantidade, confirmar pagamento, imprimir
- [x] Impressão automática das cartelas após confirmação de pagamento
- [x] QR Code de cada cartela impresso junto para o jogador assistir ao vivo
- [x] Layout de impressão otimizado para impressora térmica 80mm
