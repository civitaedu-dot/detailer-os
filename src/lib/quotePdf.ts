import jsPDF from 'jspdf';
import type { Quote, QuoteItem, CompanySettings } from '@/hooks/useQuotes';

const fmt = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const hexToRgb = (hex: string): [number, number, number] => {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
};

export type PdfTemplate = 'modern' | 'classic' | 'minimal';

export const generateQuotePdf = (
  quote: Quote & { items: QuoteItem[] },
  settings: CompanySettings | null,
  template: PdfTemplate = 'modern'
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const marginX = 15;
  const contentW = W - marginX * 2;
  const primaryColor = settings?.primary_color || '#22c55e';
  const [pr, pg, pb] = hexToRgb(primaryColor);

  const companyName = settings?.trade_name || settings?.business_name || 'Minha Empresa';
  const companyInfo = [
    settings?.cnpj ? `CNPJ: ${settings.cnpj}` : null,
    settings?.address || null,
    settings?.phone || null,
    settings?.email || null,
    settings?.website || null,
  ].filter(Boolean) as string[];

  // ---- MODERN TEMPLATE ----
  if (template === 'modern' || template === 'minimal') {
    // Header background
    doc.setFillColor(pr, pg, pb);
    doc.rect(0, 0, W, template === 'modern' ? 42 : 32, 'F');

    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(companyName, marginX, 16);

    // Company details
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    let headerY = 23;
    companyInfo.forEach(line => {
      doc.text(line, marginX, headerY);
      headerY += 4;
    });

    // Quote number on right
    const headerH = template === 'modern' ? 42 : 32;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`ORÇAMENTO ${quote.quote_number}`, W - marginX, 16, { align: 'right' });
    if (quote.title) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(quote.title, W - marginX, 22, { align: 'right' });
    }

    let y = headerH + 10;

    // Client + dates block
    doc.setTextColor(30, 30, 30);
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(marginX, y, contentW, 28, 3, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(pr, pg, pb);
    doc.text('CLIENTE', marginX + 4, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.text(quote.client_name, marginX + 4, y + 14);

    if (quote.client_company) {
      doc.setFontSize(8);
      doc.text(quote.client_company, marginX + 4, y + 19);
    }
    const clientContact = [quote.client_phone, quote.client_email].filter(Boolean).join(' | ');
    if (clientContact) {
      doc.setFontSize(8);
      doc.text(clientContact, marginX + 4, y + 24);
    }

    // Dates on right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Emissão:', W - marginX - 50, y + 10, { align: 'left' });
    doc.text('Validade:', W - marginX - 50, y + 17, { align: 'left' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    const createdFmt = new Date(quote.created_date + 'T12:00:00').toLocaleDateString('pt-BR');
    const expiryFmt = quote.expiry_date
      ? new Date(quote.expiry_date + 'T12:00:00').toLocaleDateString('pt-BR')
      : '-';
    doc.text(createdFmt, W - marginX - 20, y + 10, { align: 'right' });
    doc.text(expiryFmt, W - marginX - 20, y + 17, { align: 'right' });

    y += 36;

    // Items table header
    doc.setFillColor(pr, pg, pb);
    doc.rect(marginX, y, contentW, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    const cols = { desc: marginX + 2, qty: marginX + 100, unit: marginX + 118, price: marginX + 140, disc: marginX + 158, sub: W - marginX - 2 };
    doc.text('DESCRIÇÃO', cols.desc, y + 5.5);
    doc.text('QTD', cols.qty, y + 5.5);
    doc.text('UN', cols.unit, y + 5.5);
    doc.text('UNIT.', cols.price, y + 5.5);
    doc.text('DESC.', cols.disc, y + 5.5);
    doc.text('SUBTOTAL', cols.sub, y + 5.5, { align: 'right' });

    y += 8;

    // Items rows
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    (quote.items || []).forEach((item, idx) => {
      const rowH = item.description ? 14 : 9;
      if (idx % 2 === 0) {
        doc.setFillColor(250, 252, 250);
        doc.rect(marginX, y, contentW, rowH, 'F');
      }
      doc.setFontSize(8.5);
      doc.text(item.name.substring(0, 45), cols.desc, y + 5.5);
      if (item.description) {
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(item.description.substring(0, 60), cols.desc, y + 10);
        doc.setFontSize(8.5);
        doc.setTextColor(30, 30, 30);
      }
      doc.text(String(item.quantity), cols.qty, y + 5.5);
      doc.text(item.unit, cols.unit, y + 5.5);
      doc.text(fmt(item.unit_price), cols.price, y + 5.5);
      doc.text(item.discount_percentage > 0 ? `${item.discount_percentage}%` : '-', cols.disc, y + 5.5);
      doc.text(fmt(item.subtotal), cols.sub, y + 5.5, { align: 'right' });

      y += rowH;

      if (y > 240) {
        doc.addPage();
        y = 20;
      }
    });

    // Bottom line
    doc.setDrawColor(pr, pg, pb);
    doc.line(marginX, y, W - marginX, y);
    y += 8;

    // Totals block
    const totalsX = W - marginX - 65;
    const totalsW = 65;

    const addTotalRow = (label: string, value: string, bold = false, highlight = false) => {
      if (highlight) {
        doc.setFillColor(pr, pg, pb);
        doc.rect(totalsX - 2, y - 5, totalsW + 4, 9, 'F');
        doc.setTextColor(255, 255, 255);
      } else {
        doc.setTextColor(80, 80, 80);
      }
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(highlight ? 10 : 8.5);
      doc.text(label, totalsX, y, { align: 'left' });
      doc.text(value, W - marginX, y, { align: 'right' });
      if (highlight) doc.setTextColor(30, 30, 30);
      y += 7;
    };

    addTotalRow('Subtotal:', fmt(quote.subtotal));
    if (quote.total_item_discounts > 0) {
      addTotalRow('Descontos nos itens:', `-${fmt(quote.total_item_discounts)}`);
    }
    if (quote.discount_amount > 0) {
      addTotalRow(`Desconto geral (${quote.discount_type === 'percentage' ? quote.discount_value + '%' : 'fixo'}):`, `-${fmt(quote.discount_amount)}`);
    }
    if (quote.tax_amount > 0) {
      addTotalRow(`${quote.tax_type || 'Imposto'} (${quote.tax_percentage}%):`, fmt(quote.tax_amount));
    }
    addTotalRow('TOTAL:', fmt(quote.total), true, true);

    y += 6;

    // Payment, Deadline, Observations, Terms
    const addTextBlock = (title: string, content: string) => {
      if (!content) return;
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(pr, pg, pb);
      doc.text(title, marginX, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);
      const lines = doc.splitTextToSize(content, contentW);
      doc.text(lines, marginX, y);
      y += lines.length * 4.5 + 6;
    };

    addTextBlock('Condições de Pagamento', quote.payment_conditions || '');
    addTextBlock('Prazo de Entrega / Execução', quote.delivery_deadline || '');
    addTextBlock('Observações', quote.observations || '');
    addTextBlock('Termos e Condições', quote.terms_conditions || '');

    // Footer
    const footerY = 285;
    doc.setFillColor(240, 242, 245);
    doc.rect(0, footerY - 6, W, 12, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    const closing = settings?.closing_message || 'Agradecemos a oportunidade e aguardamos seu retorno.';
    doc.text(closing, W / 2, footerY, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(
      [settings?.phone, settings?.email].filter(Boolean).join(' | '),
      W / 2, footerY + 5, { align: 'center' }
    );
  }

  // ---- CLASSIC TEMPLATE ----
  else if (template === 'classic') {
    doc.setFillColor(30, 30, 30);
    doc.rect(0, 0, W, 3, 'F');
    doc.setFillColor(pr, pg, pb);
    doc.rect(0, 3, W, 2, 'F');

    let y = 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(30, 30, 30);
    doc.text(companyName, marginX, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    y += 6;
    companyInfo.forEach(line => {
      doc.text(line, marginX, y);
      y += 4;
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(pr, pg, pb);
    doc.text('ORÇAMENTO', W - marginX, 15, { align: 'right' });
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(`Nº ${quote.quote_number}`, W - marginX, 24, { align: 'right' });

    y = Math.max(y, 35) + 5;
    doc.setDrawColor(pr, pg, pb);
    doc.setLineWidth(0.5);
    doc.line(marginX, y, W - marginX, y);
    y += 8;

    // Client
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text('Para:', marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    doc.text(quote.client_name, marginX + 12, y);
    y += 5;
    if (quote.client_company) {
      doc.setFontSize(8.5);
      doc.setTextColor(80, 80, 80);
      doc.text(quote.client_company, marginX + 12, y);
      y += 4;
    }
    const dateStr = `Emissão: ${new Date(quote.created_date + 'T12:00:00').toLocaleDateString('pt-BR')}   Validade: ${quote.expiry_date ? new Date(quote.expiry_date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}`;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(dateStr, W - marginX, y - 5, { align: 'right' });
    y += 8;

    // Table (same structure as modern)
    doc.setFillColor(pr, pg, pb);
    doc.rect(marginX, y, contentW, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    const cols2 = { desc: marginX + 2, qty: marginX + 100, unit: marginX + 118, price: marginX + 140, disc: marginX + 158, sub: W - marginX - 2 };
    doc.text('DESCRIÇÃO', cols2.desc, y + 5.5);
    doc.text('QTD', cols2.qty, y + 5.5);
    doc.text('UN', cols2.unit, y + 5.5);
    doc.text('UNIT.', cols2.price, y + 5.5);
    doc.text('DESC.', cols2.disc, y + 5.5);
    doc.text('SUBTOTAL', cols2.sub, y + 5.5, { align: 'right' });
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    (quote.items || []).forEach((item, idx) => {
      const rowH = item.description ? 14 : 9;
      if (idx % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(marginX, y, contentW, rowH, 'F');
      }
      doc.setFontSize(8.5);
      doc.text(item.name.substring(0, 45), cols2.desc, y + 5.5);
      if (item.description) {
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(item.description.substring(0, 60), cols2.desc, y + 10);
        doc.setFontSize(8.5);
        doc.setTextColor(30, 30, 30);
      }
      doc.text(String(item.quantity), cols2.qty, y + 5.5);
      doc.text(item.unit, cols2.unit, y + 5.5);
      doc.text(fmt(item.unit_price), cols2.price, y + 5.5);
      doc.text(item.discount_percentage > 0 ? `${item.discount_percentage}%` : '-', cols2.disc, y + 5.5);
      doc.text(fmt(item.subtotal), cols2.sub, y + 5.5, { align: 'right' });
      y += rowH;
      if (y > 240) { doc.addPage(); y = 20; }
    });

    doc.setDrawColor(pr, pg, pb);
    doc.setLineWidth(0.5);
    doc.line(marginX, y, W - marginX, y);
    y += 8;

    const totalsX2 = W - marginX - 65;
    const addTR2 = (label: string, value: string, bold = false, hl = false) => {
      if (hl) {
        doc.setFillColor(pr, pg, pb);
        doc.rect(totalsX2 - 2, y - 5, 67, 9, 'F');
        doc.setTextColor(255, 255, 255);
      } else {
        doc.setTextColor(80, 80, 80);
      }
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(hl ? 10 : 8.5);
      doc.text(label, totalsX2, y);
      doc.text(value, W - marginX, y, { align: 'right' });
      if (hl) doc.setTextColor(30, 30, 30);
      y += 7;
    };

    addTR2('Subtotal:', fmt(quote.subtotal));
    if (quote.total_item_discounts > 0) addTR2('Descontos:', `-${fmt(quote.total_item_discounts)}`);
    if (quote.discount_amount > 0) addTR2('Desconto geral:', `-${fmt(quote.discount_amount)}`);
    if (quote.tax_amount > 0) addTR2(`${quote.tax_type || 'Imposto'}:`, fmt(quote.tax_amount));
    addTR2('TOTAL:', fmt(quote.total), true, true);

    y += 6;
    const addTB2 = (title: string, content: string) => {
      if (!content) return;
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(pr, pg, pb);
      doc.text(title, marginX, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);
      const lines = doc.splitTextToSize(content, contentW);
      doc.text(lines, marginX, y);
      y += lines.length * 4.5 + 6;
    };

    addTB2('Condições de Pagamento', quote.payment_conditions || '');
    addTB2('Prazo de Entrega', quote.delivery_deadline || '');
    addTB2('Observações', quote.observations || '');
    addTB2('Termos e Condições', quote.terms_conditions || '');

    const footerY2 = 285;
    doc.setDrawColor(pr, pg, pb);
    doc.line(marginX, footerY2 - 4, W - marginX, footerY2 - 4);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text(settings?.closing_message || 'Agradecemos a oportunidade.', W / 2, footerY2, { align: 'center' });
  }

  const filename = `Orcamento-${quote.quote_number}.pdf`;
  doc.save(filename);
};
