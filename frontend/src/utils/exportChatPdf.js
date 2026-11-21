import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Download a conversation as a high-contrast PDF.
 *
 * Renders each message block with Mermaid diagrams scaled to full width,
 * video references as cards, and block-aware page breaks between messages.
 */
export async function downloadConversationPdf(agent, conversation) {
  if (!agent || !conversation || conversation.length === 0) return;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  let y = margin;

  // High-contrast base: black text on white background.
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Document header.
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text(agent.title || agent.role, margin, y);
  y += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80, 80, 80);
  pdf.text(`Role: ${agent.role}`, margin, y);
  pdf.text(`Exported: ${new Date().toLocaleString()}`, margin, y + 6);
  y += 18;

  for (let i = 0; i < conversation.length; i++) {
    const message = conversation[i];
    const isUser = message.role === 'user';

    // Block-aware page break: start a fresh page before each agent block
    // when there isn't enough vertical room left.
    if (!isUser && i > 0 && y + 35 > pageHeight - margin) {
      pdf.addPage();
      y = margin;
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    }

    // Message role / time header.
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(isUser ? 0 : 20, isUser ? 60 : 60, isUser ? 120 : 60);
    pdf.text(isUser ? 'User' : 'Agent', margin, y);

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(110, 110, 110);
    pdf.text(new Date(message.ts || Date.now()).toLocaleTimeString(), margin + 22, y);
    y += 8;

    // Build a high-contrast HTML block for this message so html2canvas can
    // capture it faithfully (including Mermaid SVGs and video cards).
    const container = document.createElement('div');
    container.style.width = `${contentWidth}mm`;
    container.style.background = '#ffffff';
    container.style.color = '#000000';
    container.style.padding = '10px';
    container.style.fontFamily = 'Inter, system-ui, -apple-system, sans-serif';
    container.style.fontSize = '11.5px';
    container.style.lineHeight = '1.5';

    const style = document.createElement('style');
    style.textContent = `
      * { color: #000 !important; background: #fff !important; }
      table { border: 1px solid #000; border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; }
      h1, h2, h3, h4 { color: #000; border-bottom: 1px solid #000; margin: 10px 0 6px; }
      p { margin: 6px 0; }
      ul, ol { margin: 6px 0 6px 20px; }
      blockquote { border-left: 3px solid #000; padding-left: 10px; margin: 8px 0; }
      .mermaid-viewport { width: 100% !important; overflow: auto !important; margin: 8px 0; }
      .mermaid-viewport svg { max-width: 100% !important; width: auto !important; height: auto !important; display: block; margin: 0 auto; }
      .video-reference-card { border: 1px solid #000; background: #f5f5f5; padding: 10px; margin: 8px 0; }
      .video-reference-card iframe { border: 1px solid #000; width: 100%; height: auto; }
    `;
    container.appendChild(style);

    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = message.rendered || message.content || '';

    // Replace YouTube iframes with reference cards so PDFs show a link
    // instead of an unplayable embedded player.
    contentDiv.querySelectorAll('iframe[src*="youtube.com/embed"]').forEach((iframe) => {
      const card = document.createElement('div');
      card.className = 'video-reference-card';
      card.style.border = '1px solid #000';
      card.style.background = '#f5f5f5';
      card.style.padding = '10px';
      card.style.margin = '8px 0';

      const title = document.createElement('div');
      title.style.fontWeight = 'bold';
      title.style.marginBottom = '4px';
      title.textContent = 'Video Reference';

      const url = document.createElement('div');
      url.style.fontSize = '11px';
      url.textContent = iframe.src;

      card.appendChild(title);
      card.appendChild(url);
      iframe.replaceWith(card);
    });

    container.appendChild(contentDiv);
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, {
        width: Math.floor((contentWidth * 96) / 25.4),
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (y + imgHeight > pageHeight - margin) {
        pdf.addPage();
        y = margin;
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      }

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, y, imgWidth, imgHeight);
      y += imgHeight + 10;
    } finally {
      document.body.removeChild(container);
    }
  }

  const safeName = (agent.title || agent.role).replace(/[^a-z0-9]/gi, '_').toLowerCase();
  pdf.save(`${safeName}_conversation.pdf`);
}
