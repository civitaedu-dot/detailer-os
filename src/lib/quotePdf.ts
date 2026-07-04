import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const H = 297;
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

  const isClassic = template === 'classic';
  const headerH = isClassic ? 0 : (template === 'modern' ? 42 : 32);

  // ---------- HEADER ----------
  if (!isClassic) {
    // Header background
    doc.setFillColor(pr, pg, pb);
    doc.rect(0, 0, W, headerH, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(companyName, marginX, 16);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    let headerY = 23;
    // wrap company info so it doesn't overlap the quote number on the right
    const infoMaxW = W / 2 - marginX - 4;
    companyInfo.forEach(raw => {
      const wrapped = doc.splitTextToSize(raw, infoMaxW);
      doc.text(wrapped, marginX, headerY);
      headerY += 4;
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`ORÇAMENTO ${quote.quote_number}`, W - marginX, 16, { align: 'right' });
    if (quote.title) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const titleLines = doc.splitTextToSize(quote.title, W / 2 - marginX - 4);
      doc.text(titleLines, W - marginX, 22, { align: 'right' });
    }
  } else {
    doc.setFillColor(30, 30, 30);
    doc.rect(0, 0, W, 3, 'F');
    doc.setFillColor(pr, pg, pb);
    doc.rect(0, 3, W, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(30, 30, 30);
    doc.text(companyName, marginX, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    let cy = 21;
    companyInfo.forEach(raw => {
      const wrapped = doc.splitTextToSize(raw, W / 2 - marginX - 4);
      doc.text(wrapped, marginX, cy);
      cy += 4;
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(pr, pg, pb);
    doc.text('ORÇAMENTO', W - marginX, 15, { align: 'right' });
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(`Nº ${quote.quote_number}`, W - marginX, 24, { align: 'right' });
  }

  let y = (isClassic ? 40 : headerH) + 10;

  // ---------- CLIENT + DATES ----------
  const clientLines: string[] = [quote.client_name];
  if (quote.client_company) clientLines.push(quote.client_company);
  const contactLine = [quote.client_phone, quote.client_email].filter(Boolean).join(' | ');
  if (contactLine) clientLines.push(contactLine);
  if (quote.client_document) clientLines.push(quote.client_document);
  if (quote.client_address) clientLines.push(quote.client_address);

  // Wrap each line to available width (leave room for dates on the right)
  const clientMaxW = contentW - 60;
  const wrappedClient: string[] = [];
  clientLines.forEach(l => {
    doc.splitTextToSize(l, clientMaxW).forEach((s: string) => wrappedClient.push(s));
  });
  const clientBlockH = Math.max(28, 10 + wrappedClient.length * 4.5 + 4);

  doc.setTextColor(30, 30, 30);
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(marginX, y, contentW, clientBlockH, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(pr, pg, pb);
  doc.text('CLIENTE', marginX + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  let cly = y + 13;
  wrappedClient.forEach((line, idx) => {
    doc.setFontSize(idx === 0 ? 10 : 8.5);
    doc.text(line, marginX + 4, cly);
    cly += idx === 0 ? 5 : 4.2;
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Emissão:', W - marginX - 50, y + 10);
  doc.text('Validade:', W - marginX - 50, y + 17);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  const createdFmt = new Date(quote.created_date + 'T12:00:00').toLocaleDateString('pt-BR');
  const expiryFmt = quote.expiry_date
    ? new Date(quote.expiry_date + 'T12:00:00').toLocaleDateString('pt-BR')
    : '-';
  doc.text(createdFmt, W - marginX, y + 10, { align: 'right' });
  doc.text(expiryFmt, W - marginX, y + 17, { align: 'right' });

  y += clientBlockH + 6;

  // ---------- ITEMS TABLE (autoTable handles wrap + page breaks) ----------
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX, bottom: 25 },
    head: [['Descrição', 'Qtd', 'Un', 'Unit.', 'Desc.', 'Subtotal']],
    body: (quote.items || []).map(item => [
      item.description ? `${item.name}\n${item.description}` : item.name,
      String(item.quantity),
      item.unit,
      fmt(item.unit_price),
      item.discount_percentage > 0 ? `${item.discount_percentage}%` : '-',
      fmt(item.subtotal),
    ]),
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 2.5,
      overflow: 'linebreak',
      valign: 'middle',
      textColor: [30, 30, 30],
    },
    headStyles: {
      fillColor: [pr, pg, pb],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
    },
    alternateRowStyles: { fillColor: [250, 252, 250] },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'left' },
      1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Style the item description sub-line lighter
      if (data.section === 'body' && data.column.index === 0) {
        const raw = data.cell.raw as string;
        if (typeof raw === 'string' && raw.includes('\n')) {
          // Keep name bold-ish, description subtle by lowering font size overall
          data.cell.styles.fontSize = 8.5;
        }
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // ---------- TOTALS ----------
  const totalsX = W - marginX - 70;
  const totalsW = 70;

  const ensureSpace = (needed: number) => {
    if (y + needed > H - 25) {
      doc.addPage();
      y = 20;
    }
  };

  const addTotalRow = (label: string, value: string, highlight = false) => {
    ensureSpace(highlight ? 10 : 7);
    if (highlight) {
      doc.setFillColor(pr, pg, pb);
      doc.rect(totalsX - 2, y - 5, totalsW + 2, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
    } else {
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
    }
    doc.text(label, totalsX, y);
    doc.text(value, W - marginX, y, { align: 'right' });
    y += highlight ? 9 : 6;
  };

  addTotalRow('Subtotal:', fmt(quote.subtotal));
  if (quote.total_item_discounts > 0) addTotalRow('Descontos nos itens:', `-${fmt(quote.total_item_discounts)}`);
  if (quote.discount_amount > 0) {
    addTotalRow(
      `Desconto (${quote.discount_type === 'percentage' ? quote.discount_value + '%' : 'fixo'}):`,
      `-${fmt(quote.discount_amount)}`
    );
  }
  if (quote.tax_amount > 0) {
    addTotalRow(`${quote.tax_type || 'Imposto'} (${quote.tax_percentage}%):`, fmt(quote.tax_amount));
  }
  addTotalRow('TOTAL:', fmt(quote.total), true);

  y += 6;

  // ---------- TEXT BLOCKS ----------
  const addTextBlock = (title: string, content?: string | null) => {
    if (!content) return;
    const lines = doc.splitTextToSize(content, contentW);
    const blockH = 6 + lines.length * 4.5 + 4;
    ensureSpace(blockH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(pr, pg, pb);
    doc.text(title, marginX, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text(lines, marginX, y);
    y += lines.length * 4.5 + 5;
  };

  addTextBlock('Condições de Pagamento', quote.payment_conditions);
  addTextBlock('Prazo de Entrega / Execução', quote.delivery_deadline);
  addTextBlock('Observações', quote.observations);
  addTextBlock('Termos e Condições', quote.terms_conditions);

  // ---------- FOOTER on every page ----------
  const closing = settings?.closing_message || 'Agradecemos a oportunidade e aguardamos seu retorno.';
  const footerContact = [settings?.phone, settings?.email].filter(Boolean).join(' | ');
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const fy = H - 12;
    doc.setFillColor(240, 242, 245);
    doc.rect(0, fy - 6, W, 18, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text(closing, W / 2, fy, { align: 'center' });
    if (footerContact) {
      doc.setFont('helvetica', 'normal');
      doc.text(footerContact, W / 2, fy + 4, { align: 'center' });
    }
    doc.setFontSize(7);
    doc.text(`Página ${p} de ${pageCount}`, W - marginX, fy + 4, { align: 'right' });
  }

  const filename = `Orcamento-${quote.quote_number}.pdf`;
  savePdf(doc, filename);
};

// Reliable download across desktop + mobile (iOS Safari blocks doc.save silently).
// On iOS we open the PDF in a new tab so the user can use the Share sheet to save.
function savePdf(doc: jsPDF, filename: string) {
  try {
    const blob = doc.output('blob');
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);

    if (isIOS || isSafari) {
      // iOS/Safari: open blob in a new tab; user can save/share from there.
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) {
        // Popup blocked — fall back to navigating current tab.
        window.location.href = url;
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }

    // Other browsers: trigger a real download.
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    console.error('Falha ao gerar PDF:', err);
    // Last-resort fallback to jsPDF's own save.
    try { doc.save(filename); } catch {}
  }
}
