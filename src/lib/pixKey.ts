// Brazilian Pix key validation
// Supports: CPF (11 digits), CNPJ (14 digits), email, phone (+55DDDXXXXXXXXX), random UUID

const VALID_DDDS = new Set([
  "11","12","13","14","15","16","17","18","19",
  "21","22","24","27","28",
  "31","32","33","34","35","37","38",
  "41","42","43","44","45","46","47","48","49",
  "51","53","54","55",
  "61","62","63","64","65","66","67","68","69",
  "71","73","74","75","77","79",
  "81","82","83","84","85","86","87","88","89",
  "91","92","93","94","95","96","97","98","99",
]);

function isValidCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10) r = 0;
  if (r !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10) r = 0;
  return r === parseInt(d[10]);
}

function isValidCNPJ(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (len: number) => {
    const w = len === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    let s = 0;
    for (let i = 0; i < len; i++) s += parseInt(d[i]) * w[i];
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === parseInt(d[12]) && calc(13) === parseInt(d[13]);
}

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 77;
}

function isValidBrazilianPhonePix(v: string): boolean {
  // Pix phone format: +55DDDXXXXXXXXX (mobile, 9-digit starting with 9)
  const d = v.replace(/\D/g, "");
  // Accept either 11 digits or 13 digits (with country code 55)
  let local = d;
  if (d.length === 13 && d.startsWith("55")) local = d.slice(2);
  if (local.length !== 11) return false;
  return VALID_DDDS.has(local.slice(0, 2)) && local[2] === "9";
}

function isValidUUID(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.trim());
}

export type PixKeyType = "CPF" | "CNPJ" | "EMAIL" | "TELEFONE" | "ALEATORIA" | null;

export function detectPixKeyType(value: string): PixKeyType {
  const v = value.trim();
  if (!v) return null;
  if (isValidUUID(v)) return "ALEATORIA";
  if (v.includes("@")) return isValidEmail(v) ? "EMAIL" : null;
  const digits = v.replace(/\D/g, "");
  if (digits.length === 11 && isValidCPF(v)) return "CPF";
  if (digits.length === 14 && isValidCNPJ(v)) return "CNPJ";
  if (isValidBrazilianPhonePix(v)) return "TELEFONE";
  return null;
}

function maskCPF(d: string): string {
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskCNPJ(d: string): string {
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function maskPhone(d: string): string {
  // d may include country code 55
  let local = d;
  let prefix = "";
  if (d.length > 11 && d.startsWith("55")) {
    local = d.slice(2, 13);
    prefix = "+55 ";
  } else {
    local = d.slice(0, 11);
  }
  if (local.length <= 2) return prefix + (local.length ? `(${local}` : "");
  if (local.length <= 7) return `${prefix}(${local.slice(0, 2)}) ${local.slice(2)}`;
  return `${prefix}(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
}

/**
 * Apply a dynamic mask to a Pix key as the user types.
 * - Pure digits: detect CPF/CNPJ/phone by length and shape
 * - Contains @: treat as email (no mask, lowercase trim)
 * - Contains "-" with hex: treat as UUID (no mask)
 * - Starts with + or "55" + 11 digits: phone with country code
 */
export function formatPixKey(value: string): string {
  const v = value.replace(/^\s+/, "");
  if (!v) return "";
  // Email
  if (v.includes("@")) return v.trim().toLowerCase();
  // UUID-like (contains hex + dash and no leading +)
  if (/^[0-9a-fA-F-]+$/.test(v) && v.includes("-")) return v.trim().toLowerCase();
  // Phone with explicit country code
  if (v.startsWith("+")) {
    const d = v.replace(/\D/g, "").slice(0, 13);
    return maskPhone(d);
  }
  const digits = v.replace(/\D/g, "");
  if (!digits) return v.trim();
  // Phone heuristic: 11 digits starting with valid DDD and 9 in pos 2
  if (digits.length === 11 && VALID_DDDS.has(digits.slice(0, 2)) && digits[2] === "9") {
    return maskPhone(digits);
  }
  if (digits.length <= 11) return maskCPF(digits);
  return maskCNPJ(digits.slice(0, 14));
}

export function validatePixKey(value: string): { valid: boolean; type: PixKeyType; error?: string } {
  const v = value.trim();
  if (!v) return { valid: false, type: null, error: "Informe a chave Pix" };
  const type = detectPixKeyType(v);
  if (!type) {
    return {
      valid: false,
      type: null,
      error: "Chave Pix inválida. Use CPF, CNPJ, e-mail, telefone (+55DDD9XXXXXXXX) ou UUID aleatório.",
    };
  }
  return { valid: true, type };
}
