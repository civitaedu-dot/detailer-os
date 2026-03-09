import type { Quote, QuoteItem, CompanySettings } from "@/hooks/useQuotes";

type Template = "modern" | "classic" | "minimal";

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  quote: Quote & { items: QuoteItem[] };
  settings: CompanySettings | null;
  template: Template;
}

export const QuotePDFPreview = ({ quote, settings, template }: Props) => {
  const primaryColor = settings?.primary_color || "#22c55e";
  const companyName = settings?.trade_name || settings?.business_name || "Minha Empresa";
  const createdFmt = new Date(quote.created_date + "T12:00:00").toLocaleDateString("pt-BR");
  const expiryFmt = quote.expiry_date
    ? new Date(quote.expiry_date + "T12:00:00").toLocaleDateString("pt-BR")
    : "-";

  const InfoRow = ({ label, value }: { label: string; value?: string | null }) =>
    value ? (
      <div className="flex gap-2 text-xs leading-tight">
        <span className="text-gray-500 flex-shrink-0">{label}:</span>
        <span className="text-gray-800">{value}</span>
      </div>
    ) : null;

  const ItemRow = ({ item, odd }: { item: QuoteItem; odd: boolean }) => (
    <tr style={{ background: odd ? "#f9fafb" : "#fff" }}>
      <td style={{ padding: "6px 8px", fontSize: 10, color: "#1a1a1a", maxWidth: 140 }}>
        <div style={{ fontWeight: 500 }}>{item.name}</div>
        {item.description && (
          <div style={{ color: "#888", fontSize: 9, marginTop: 1 }}>{item.description}</div>
        )}
      </td>
      <td style={{ padding: "6px 8px", fontSize: 10, textAlign: "center", color: "#444" }}>
        {item.quantity}
      </td>
      <td style={{ padding: "6px 8px", fontSize: 10, textAlign: "center", color: "#444" }}>
        {item.unit}
      </td>
      <td style={{ padding: "6px 8px", fontSize: 10, textAlign: "right", color: "#444" }}>
        {fmt(item.unit_price)}
      </td>
      <td style={{ padding: "6px 8px", fontSize: 10, textAlign: "center", color: "#444" }}>
        {item.discount_percentage > 0 ? `${item.discount_percentage}%` : "-"}
      </td>
      <td style={{ padding: "6px 8px", fontSize: 10, textAlign: "right", fontWeight: 600, color: "#1a1a1a" }}>
        {fmt(item.subtotal)}
      </td>
    </tr>
  );

  const Section = ({ title, content }: { title: string; content?: string | null }) =>
    content ? (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: primaryColor, marginBottom: 3 }}>
          {title}
        </div>
        <div style={{ fontSize: 9.5, color: "#444", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
          {content}
        </div>
      </div>
    ) : null;

  return (
    <div
      className="overflow-hidden rounded-xl border border-border shadow-lg"
      style={{ fontFamily: "Inter, system-ui, sans-serif", background: "#fff", maxHeight: 520, overflowY: "auto" }}
    >
      {/* Header */}
      {template === "classic" ? (
        <div style={{ borderTop: `4px solid ${primaryColor}`, padding: "16px 20px 8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a" }}>{companyName}</div>
              {settings?.cnpj && <div style={{ fontSize: 9, color: "#777" }}>CNPJ: {settings.cnpj}</div>}
              {settings?.phone && <div style={{ fontSize: 9, color: "#777" }}>{settings.phone}</div>}
              {settings?.email && <div style={{ fontSize: 9, color: "#777" }}>{settings.email}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: primaryColor }}>ORÇAMENTO</div>
              <div style={{ fontSize: 11, color: "#555" }}>Nº {quote.quote_number}</div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: primaryColor, padding: "16px 20px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{companyName}</div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
                {[settings?.cnpj, settings?.phone, settings?.email].filter(Boolean).join(" | ")}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                ORÇAMENTO {quote.quote_number}
              </div>
              {quote.title && (
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
                  {quote.title}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Client + dates */}
      <div style={{ background: "#f5f7fa", padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 8, fontWeight: 700, color: primaryColor, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
            Cliente
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#1a1a1a" }}>{quote.client_name || "—"}</div>
          {quote.client_company && <div style={{ fontSize: 9, color: "#666" }}>{quote.client_company}</div>}
          {(quote.client_phone || quote.client_email) && (
            <div style={{ fontSize: 9, color: "#888" }}>
              {[quote.client_phone, quote.client_email].filter(Boolean).join(" | ")}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <InfoRow label="Emissão" value={createdFmt} />
          <InfoRow label="Validade" value={expiryFmt} />
        </div>
      </div>

      {/* Items table */}
      <div style={{ padding: "0 20px 10px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
          <thead>
            <tr style={{ background: primaryColor }}>
              {["Descrição", "Qtd", "Un", "Unit.", "Desc.", "Subtotal"].map((h, i) => (
                <th
                  key={h}
                  style={{
                    padding: "6px 8px",
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#fff",
                    textAlign: i === 0 ? "left" : i >= 3 ? "right" : "center",
                    textTransform: "uppercase",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(quote.items || []).length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 12, textAlign: "center", fontSize: 10, color: "#aaa" }}>
                  Nenhum item adicionado
                </td>
              </tr>
            ) : (
              (quote.items || []).map((item, idx) => <ItemRow key={idx} item={item} odd={idx % 2 !== 0} />)
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <div style={{ minWidth: 180 }}>
            {[
              { label: "Subtotal:", value: fmt(quote.subtotal) },
              quote.total_item_discounts > 0 ? { label: "Descontos nos itens:", value: `-${fmt(quote.total_item_discounts)}` } : null,
              quote.discount_amount > 0 ? { label: "Desconto geral:", value: `-${fmt(quote.discount_amount)}` } : null,
              quote.tax_amount > 0 ? { label: `${quote.tax_type || "Imposto"}:`, value: fmt(quote.tax_amount) } : null,
            ].filter(Boolean).map((row, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 9.5, color: "#666", marginBottom: 3 }}>
                <span>{row!.label}</span><span>{row!.value}</span>
              </div>
            ))}
            <div style={{
              display: "flex", justifyContent: "space-between", gap: 16,
              background: primaryColor, color: "#fff",
              padding: "5px 8px", borderRadius: 6, marginTop: 4,
              fontSize: 12, fontWeight: 700,
            }}>
              <span>TOTAL</span><span>{fmt(quote.total)}</span>
            </div>
          </div>
        </div>

        {/* Text blocks */}
        <div style={{ marginTop: 12 }}>
          <Section title="Condições de Pagamento" content={quote.payment_conditions} />
          <Section title="Prazo de Entrega / Execução" content={quote.delivery_deadline} />
          <Section title="Observações" content={quote.observations} />
          <Section title="Termos e Condições" content={quote.terms_conditions} />
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 10, borderTop: "1px solid #e5e7eb", paddingTop: 8,
          fontSize: 9, color: "#999", textAlign: "center", fontStyle: "italic",
        }}>
          {settings?.closing_message || "Agradecemos a oportunidade e aguardamos seu retorno."}
        </div>
      </div>
    </div>
  );
};
