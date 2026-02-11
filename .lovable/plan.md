

# 🛒 Marketplace de Compra Coletiva - MVP

## Visão Geral
Plataforma de compra coletiva com carteira digital, validação automática de ofertas e sistema de comissões. Visual colorido e vibrante, estilo promocional.

---

## 🎨 Design & Identidade Visual
- Paleta vibrante com cores quentes (laranja, vermelho, amarelo) para transmitir urgência e promoção
- Cards de ofertas chamativos com countdown, badges de desconto e barra de progresso (quantidade mínima)
- Layout responsivo mobile-first

---

## Fase 1: Autenticação & Perfis

### Cadastro e Login
- Tela de cadastro com seleção de perfil (Cliente ou Vendedor)
- Login com email/senha
- Redirecionamento por tipo de usuário após login

### Perfil do Usuário
- Dados pessoais (nome, telefone, WhatsApp)
- Gerenciamento de endereços (criar, editar, listar)

---

## Fase 2: Área do Vendedor

### Cadastro de Empresa
- Formulário com dados da empresa (nome, CNPJ, descrição)
- Status de aprovação (pendente/aprovado)

### Gestão de Ofertas
- Criar oferta com: título, descrição, imagem, preço original, preço oferta, quantidade mínima, prazo, opções de entrega
- Listar, editar e cancelar ofertas
- Dashboard com status das ofertas (ativa, validada, cancelada)

---

## Fase 3: Área do Cliente

### Vitrine de Ofertas
- Lista de ofertas ativas com filtros
- Card de oferta com: desconto percentual, barra de progresso da quantidade mínima, countdown do prazo
- Página de detalhes da oferta

### Reserva (Pedido)
- Selecionar quantidade, tipo de entrega (delivery/retirada), endereço
- Validação: oferta ativa, dentro do prazo, saldo suficiente
- Confirmação e criação do pedido com status RESERVADO

### Meus Pedidos
- Lista de pedidos com status (reservado, confirmado, cancelado, estornado)

---

## Fase 4: Carteira Digital

### Saldo e Extrato
- Visualização do saldo atual
- Extrato com transações (depósito, reserva, débito, estorno, crédito)

### Depósito via Mercado Pago
- Integração com API do Mercado Pago via Edge Function
- Geração de pagamento Pix e/ou cartão
- Webhook para confirmar pagamento e creditar saldo

---

## Fase 5: Validação Automática (CRON Job)

### Edge Function agendada (a cada 5 minutos)
- Verificar ofertas encerradas
- Se quantidade mínima atingida: validar oferta, converter reservas em débito, calcular comissão 10%, creditar vendedor (90%) e plataforma (10%)
- Se não atingida: cancelar oferta, estornar valores aos clientes
- Todas operações em transação atômica

---

## Fase 6: Painel Admin

### Dashboard
- KPIs: total vendas, comissões, usuários ativos, ofertas ativas
- Gráficos com Recharts

### Gestão
- Aprovar/rejeitar vendedores
- Gerenciar licenças por cidade
- Visualizar carteira da plataforma

---

## 🗄️ Banco de Dados (Lovable Cloud / Supabase)

### Tabelas principais:
- **profiles** — dados do usuário (nome, telefone, whatsapp)
- **user_roles** — tabela separada de roles (CLIENTE, VENDEDOR, ADMIN)
- **addresses** — endereços dos usuários
- **vendors** — dados da empresa do vendedor
- **offers** — ofertas com preços, prazos, quantidades
- **orders** — pedidos/reservas
- **wallets** — saldo do usuário
- **wallet_transactions** — extrato detalhado
- **platform_wallet** — saldo da plataforma
- **city_licenses** — licenças por cidade

### Segurança:
- RLS em todas as tabelas
- Roles em tabela separada com função `has_role()` security definer
- Edge Functions com validação JWT

---

## 🔌 Integrações

- **Mercado Pago**: Depósitos via Pix/cartão (Edge Function + webhook)
- **CRON Job**: Validação automática de ofertas via pg_cron + Edge Function

