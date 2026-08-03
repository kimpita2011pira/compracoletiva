import type { Notification } from "@/hooks/useNotifications";

/**
 * Resolve o destino de uma notificação.
 *
 * Motivo: o campo `reference_id` não aponta sempre para uma oferta — dependendo
 * do tipo da notificação ele pode ser o id de um pedido, de um saque, de uma
 * transação de carteira ou de um vendedor. Navegar sempre para `/offers/:id`
 * fazia notificações de pedido caírem em "Oferta não encontrada".
 */
export function getNotificationRoute(n: Pick<Notification, "title" | "reference_id">): string {
  const title = (n.title ?? "").toLowerCase();

  // Pedidos / reservas → reference_id é um order.id
  if (
    title.includes("reserva") ||
    title.includes("pedido")
  ) {
    return "/orders";
  }

  // Carteira → reference_id é uma wallet_transaction.id
  if (title.includes("depósito") || title.includes("deposito")) {
    return "/wallet";
  }

  // Fluxos administrativos → reference_id é um withdrawal/vendor.id
  if (title.includes("saque") || title.includes("editou cadastro")) {
    return "/admin";
  }

  // Cadastro incompleto
  if (title.includes("complete seu cadastro")) {
    return "/profile/addresses";
  }

  // Restante (oferta validada/cancelada, meta atingida, sugestão virou oferta…)
  if (n.reference_id) {
    return `/offers/${n.reference_id}`;
  }

  return "/notifications";
}
