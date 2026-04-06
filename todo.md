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

## Fase 5 - Simplificação de Acesso
- [x] Remover landing page com planos e preços
- [x] Rota raiz / redireciona direto para o painel (login se não autenticado)

## Fase 6 - Tela Ao Vivo Profissional
- [x] Fundo azul estrelado animado (gradiente + partículas/estrelas)
- [x] Cabeçalho com logo/nome do bingo, badge AO VIVO, doação e acumulado
- [x] Bola grande 3D animada com número sorteado em destaque central
- [x] Histórico de últimas bolas sorteadas em miniatura (estilo bolas coloridas)
- [x] Painel de números 1-75 com destaque nos sorteados (colunas B-I-N-G-O)
- [x] Lista de jogadores/cartelas à esquerda com últimos números de cada cartela
- [x] Mini-cartelas dos ganhadores na parte inferior
- [x] Contador de bolas sorteadas
- [x] Prêmio total e prêmio atual em destaque

## Bugs
- [x] Coluna status não existe no banco real da tabela bingo_cards — tabela criada com SQL compatível com TiDB (sem DEFAULT em JSON)

## Fase 7 - Limpeza de Menu
- [x] Remover item "Assinatura" do menu lateral

## Fase 8 - Dashboard Premium
- [x] Remover banner "Plano Free / Fazer upgrade" do Dashboard
- [x] Adicionar seção de recursos ativos: Salas ilimitadas, Cartelas ilimitadas, API PagSeguro, Marca branca, Servidor dedicado

## Fase 9 - Preço e Quantidades de Cartela
- [x] Atualizar preço fixo de R$0,01 para R$0,50 por cartela
- [x] Ampliar opões de quantidade na tela de venda (mais botões de seleção)

## Fase 10 - Correção de Impressão
- [x] Corrigir erro NotFoundError ao clicar em "Pagamento Aprovado — Gerar e Imprimir"
- [x] Impressão deve mostrar grid completo de números de cada cartela
- [x] QR Code na impressão deve apontar para a tela de transmissão da sala (/show/:slug)

## Fase 11 - Correção Definitiva do Erro de Impressão
- [x] Corrigir definitivamente NotFoundError ao clicar em "Pagamento Aprovado — Gerar e Imprimir" (useEffect + requestAnimationFrame para aguardar Dialog fechar)

## Fase 12 - Salas Ilimitadas
- [x] Remover verificação de limite de salas no backend (router rooms.create)
- [x] Remover aviso/bloqueio de limite de salas no frontend (RoomCreate, RoomList) — sem avisos encontrados

## Fase 13 - Prêmios por Condição de Vitória
- [x] Adicionar colunas prizeQuadra, prizeQuina, prizeFullCard na tabela bingo_rooms
- [x] Atualizar motor de bingo para detectar quadra (4 números em linha/coluna), quina (5 números linha/coluna) e cartela cheia
- [x] Atualizar formulário de criação com campos de prêmio para cada condição
- [x] Exibir os 3 prêmios em destaque no telão de transmissão (/show/:slug)
- [x] Anunciar voz e overlay específico por tipo de vitória (Quadra / Quina / Bingo!)

## Fase 14 - Cartelas com 15 Números e Prêmios Automáticos
- [x] Cartela com 15 números únicos (1-75) em vez de grade 5x5 com 24 números
- [x] Ao criar bingo, sortear automaticamente os números premiados (Quadra=4, Quina=5, Cartela Cheia=todos os 15)
- [x] Armazenar os números premiados na tabela bingo_rooms (prizeNumbers JSON)
- [x] Atualizar motor de bingo: geração de cartela com 15 números aleatórios únicos
- [x] Atualizar verificação de vitória: baseada em quantos números da cartela coincidem com os sorteados
- [x] Atualizar tela de venda: exibir cartela como lista/grid de 15 números
- [x] Atualizar tela do jogador: exibir 15 números com marcação automática
- [x] Atualizar tela de transmissão TV: exibir os números premiados sorteados
- [x] Atualizar impressão térmica: mostrar 15 números da cartela

## Fase 15 - Tela de Transmissão TV Profissional
- [x] Atualizar sorteio para 1 a 90 (em vez de 1 a 75)
- [x] Expor lista de cartelas com números no getShowData
- [x] Reformular BingoShow: fundo azul estrelado, layout de 4 zonas
- [x] Zona esquerda: lista de cartelas com últimos números sorteados
- [x] Zona central: bola animada grande + histórico de bolas + contador
- [x] Zona direita: painel de números 1-90 organizado em grid
- [x] Zona inferior: mini-cartelas dos ganhadores (Quadra/Quina/Bingo)
- [x] Header: nome do bingo, badge AO VIVO, prêmios Quadra/Quina/Bingo
- [x] Exibir ganhadores de cada tipo ao final do sorteio

## Fase 16 - Rodada com 15 Bolas e Ganhadores Sequenciais
- [x] Sortear exatamente 15 números por rodada (de 1 a 90)
- [x] Detectar Quadra (4 acertos) primeiro — apenas 1 ganhador
- [x] Detectar Quina (5 acertos) depois — apenas 1 ganhador
- [x] Detectar Cartela Cheia (15 acertos) por último — apenas 1 ganhador
- [x] Encerrar sorteio automaticamente após 15 bolas ou quando os 3 prêmios forem distribuídos
- [x] Atualizar tela do operador para mostrar progresso dos 15 sorteios
- [x] Atualizar tela de transmissão TV para mostrar contador de bolas restantes

## Fase 17 - Autenticação Própria (Email/Senha)
- [x] Adicionar coluna passwordHash na tabela users
- [x] Criar funções hashPassword e verifyPassword com bcrypt
- [x] Criar procedure auth.register (email, nome, senha)
- [x] Criar procedure auth.loginLocal (email, senha) que gera JWT próprio
- [x] Atualizar contexto de auth para aceitar sessão local
- [x] Criar tela /login com formulário email/senha
- [x] Criar tela /register com formulário de cadastro
- [x] Atualizar App.tsx para redirecionar para /login em vez do OAuth Manus
- [x] Remover botão "Entrar com Manus" da interface

## Fase 18 - Correções de Bugs
- [x] Corrigir redirecionamento OAuth Manus na página inicial (Home.tsx → /login)
- [x] Corrigir erro de DOM "insertBefore" no SellCards ao gerar e imprimir cartelas

## Fase 19 - Correção Definitiva do Erro insertBefore
- [x] Refatorar SellCards para eliminar erro de DOM ao fechar Dialog e imprimir

## Fase 20 - PWA (Progressive Web App)
- [x] Gerar ícones personalizados (192x192 e 512x512) para o Bingo Digital
- [x] Criar manifest.json com nome, cores e ícones
- [x] Configurar vite-plugin-pwa para service worker automático
- [x] Adicionar meta tags de PWA no index.html
- [x] Testar instalação como app no celular

## Fase 21 - Sistema de Roles Admin/Vendedor
- [x] Atualizar enum de roles para admin/seller no banco e schema
- [x] Adicionar campos de estabelecimento (nome, endereço, telefone) na tabela users
- [x] Criar adminProcedure no backend para proteger rotas de admin
- [x] Criar sellerProcedure para proteger rotas de vendedor
- [x] Painel admin: gerenciar usuários (criar vendedor, editar role, bloquear)
- [x] Painel admin: ver todos os bingos de todos os vendedores
- [x] Painel vendedor: configurar dados do estabelecimento
- [x] Painel vendedor: listar apenas bingos ativos/abertos para vender cartelas
- [x] Painel vendedor: vender cartelas (tela SellCards restrita ao vendedor)
- [x] Redirecionar admin para /dashboard e vendedor para /seller após login
- [x] Bloquear acesso do vendedor a criação/operação de bingos

## Fase 22 - Impressão Direta no POS Android
- [x] Substituir window.print() por impressão direta sem diálogo de visualização
- [x] Gerar página de impressão que dispara automaticamente ao abrir
- [x] Otimizar layout para impressora térmica 58mm/80mm do POS
- [x] Testar fluxo completo: pagamento aprovado → cartelas impressas sem travar

## Fase 23 - Melhorias Visuais na Tela de Transmissão
- [x] Remover faixa/linha verde da tela de transmissão
- [x] Lista vermelha (esquerda): expandir de topo a topo (full height)
- [x] Área branca (cartelas rodapé): mostrar 3 cartelas em vez de 2
- [x] Azul claro (tabela direita): trocar "GOLF" e "OMEGA" por "Bingo da Sorte"
- [x] Centro azul (bolas): adicionar globo girando com bolas animadas
- [x] KN da Sorte (topo centro): colocar nome "Bingo da Sorte"

## Fase 24 - Simplificação da Tela de Venda
- [x] Remover campos de nome e telefone da tela de venda de cartelas

## Fase 25 - Sistema Completo de Vendedores e Agendamento
- [x] Opção "Sou Vendedor" na tela de login/cadastro
- [x] Após cadastro de vendedor, redirecionar para dashboard do vendedor
- [x] Dashboard do vendedor: aba Cartelas (grande, para vender)
- [x] Dashboard do vendedor: aba Rodadas (próximas rodadas disponíveis)
- [x] Dashboard do vendedor: aba Premiados (prêmios saídos na loja)
- [x] Dashboard do vendedor: aba Relatórios (kit, prêmio, comissão, valor líquido para admin, histórico de rodadas e vendas)
- [x] Programação de bingo por horários na área de operador

## Fase 26 - Correções de Preço e Agendamento
- [x] Corrigir preço das cartelas no dashboard do vendedor (usar cardPrice da sala, não hardcoded)
- [x] Igualar botões de quantidade do vendedor ao padrão do admin (1,2,3,4,5,6,7,8,9,10,15,20)
- [x] Garantir campo de horário no formulário de criar novo bingo
