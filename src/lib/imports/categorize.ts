// Intelligent categorization engine for cash transactions.
// Order of resolution:
//   1. User manual rules (auto_created = false)
//   2. User learned rules (auto_created = true), sorted by hit_count desc
//   3. Built-in dictionary
//   4. Fallback: "Outros"

export type CategorySource = "user_rule" | "learned" | "builtin" | "default";

export interface CategoryRule {
  id?: string;
  pattern: string;
  match_type: "contains" | "exact" | "starts_with";
  direction: "in" | "out" | "any";
  category: string;
  auto_created?: boolean;
  hit_count?: number;
  priority?: number;
}

export interface CategorySuggestion {
  category: string;
  source: CategorySource;
  matchedPattern?: string;
}

// Built-in dictionary — key = category, value = regex patterns (lowercase, no accents)
const BUILTIN: Array<{ category: string; patterns: RegExp[] }> = [
  { category: "Taxas de Cartão", patterns: [/stone|cielo|\brede\b|getnet|pagseguro|pagbank|mercado ?pago|sumup|infinitepay|safrapay|ton\b|pag ?seguro/i] },
  { category: "Taxas Bancárias", patterns: [/tarifa|iof|anuidade|manuten[cç][aã]o de conta|pacote de servi[cç]os/i] },
  { category: "Internet", patterns: [/\bvivo\b|\bclaro\b|\btim\b|\boi\s|net ?fibra|algar|sky|nextel/i] },
  { category: "Energia", patterns: [/cpfl|enel|light|neoenergia|energisa|coelba|celesc|copel|equatorial|edp/i] },
  { category: "Água", patterns: [/sabesp|copasa|cedae|sanepar|caern|casan|corsan|embasa/i] },
  { category: "Aluguel", patterns: [/aluguel|loca[cç][aã]o|imobili[aá]ria/i] },
  { category: "Impostos", patterns: [/\bdas\b|simples nacional|darf|inss|fgts|iss|icms|ipva|iptu/i] },
  { category: "Combustível", patterns: [/posto\b|shell|ipiranga|petrobras|\bale\b|combust[ií]vel|gasolina|etanol/i] },
  { category: "Produtos Químicos", patterns: [/vonixx|\b3m\b|meguiars|sonax|kers|granitize|nobrecar|autoshine|dryw|carpro|gyeon/i] },
  { category: "Insumos", patterns: [/mercado ?livre|magalu|magazine luiza|amazon|shopee|americanas|leroy/i] },
  { category: "Salários", patterns: [/sal[aá]rio|folha de pagamento|holerite/i] },
  { category: "Pró-labore", patterns: [/pr[oó][- ]?labore|retirada s[oó]cio/i] },
  { category: "Comissões", patterns: [/comiss[aã]o/i] },
  { category: "Marketing", patterns: [/facebook|meta ?ads|google ?ads|instagram ?ads|marketing|tr[aá]fego pago|canva/i] },
  { category: "Manutenção", patterns: [/manuten[cç][aã]o|conserto|reparo|assist[eê]ncia t[eé]cnica/i] },
];

function matches(rule: CategoryRule, desc: string, direction: "in" | "out"): boolean {
  if (rule.direction !== "any" && rule.direction !== direction) return false;
  const d = desc.toLowerCase();
  const p = rule.pattern.toLowerCase().trim();
  if (!p) return false;
  if (rule.match_type === "exact") return d === p;
  if (rule.match_type === "starts_with") return d.startsWith(p);
  return d.includes(p);
}

export function suggestCategory(
  description: string,
  direction: "in" | "out",
  userRules: CategoryRule[] = [],
): CategorySuggestion {
  const desc = description || "";

  const manual = userRules.filter((r) => !r.auto_created);
  for (const r of manual) {
    if (matches(r, desc, direction)) return { category: r.category, source: "user_rule", matchedPattern: r.pattern };
  }

  const learned = userRules
    .filter((r) => r.auto_created)
    .sort((a, b) => (b.hit_count || 0) - (a.hit_count || 0));
  for (const r of learned) {
    if (matches(r, desc, direction)) return { category: r.category, source: "learned", matchedPattern: r.pattern };
  }

  const d = desc.toLowerCase();
  for (const entry of BUILTIN) {
    for (const re of entry.patterns) {
      if (re.test(d)) return { category: entry.category, source: "builtin", matchedPattern: re.source };
    }
  }

  return { category: "Outros", source: "default" };
}

// Extract a stable token from a raw description to store as a learned rule pattern.
// Removes numbers, dates, common bank noise, keeps 2-3 leading meaningful words.
export function extractLearningToken(description: string): string {
  if (!description) return "";
  const cleaned = description
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(pix|ted|doc|transferencia|transf|pagto|pagamento|compra|debito|credito|cartao|recebido|enviado|de|para|em|do|da)\b/g, " ")
    .replace(/\d{2}[\/\-\.]\d{2}([\/\-\.]\d{2,4})?/g, " ") // dates
    .replace(/\d{4,}/g, " ") // long numbers
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter((w) => w.length >= 3);
  return words.slice(0, 3).join(" ").trim();
}

export const DEFAULT_CATEGORIES = [
  "Aluguel","Salários","Pró-labore","Produtos Químicos","Insumos","Comissões",
  "Energia","Água","Internet","Impostos","Taxas Bancárias","Taxas de Cartão",
  "Equipamentos","Marketing","Combustível","Manutenção","Fornecedores","Investimentos","Outros",
];