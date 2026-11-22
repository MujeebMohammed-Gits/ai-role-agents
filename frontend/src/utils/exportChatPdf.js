import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { renderMermaidDiagrams } from './markdownRenderer.js';

export async function downloadConversationPdf(agent, conversation) {
  if (!agent || !conversation || conversation.length === 0) return;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  const pageFill = pageHeight - margin;

  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-9999px';
  wrapper.style.top = '0';
  wrapper.style.width = contentWidth + 'mm';
  wrapper.style.background = '#ffffff';
  wrapper.style.color = '#000000';
  wrapper.style.fontFamily = 'Inter, system-ui, -apple-system, sans-serif';
  wrapper.style.fontSize = '11.5px';
  wrapper.style.lineHeight = '1.55';
  wrapper.style.overflow = 'visible';
  wrapper.style.maxHeight = 'none';
  wrapper.style.padding = '0';
  wrapper.style.textAlign = 'left';

  const style = document.createElement('style');
  style.textContent = '* { color: #000 !important; background: #fff !important; } table { border: 1px solid #000; border-collapse: collapse; width: 100%; } th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; } h1, h2, h3, h4 { color: #000 !important; border: none !important; text-decoration: none !important; margin: 10px 0 6px !important; line-height: 1.55 !important; break-inside: avoid; } p { margin: 6px 0; line-height: 1.55 !important; break-inside: avoid; } li { margin: 3px 0; line-height: 1.55 !important; break-inside: avoid; } ul, ol { margin: 6px 0 6px 20px; break-inside: avoid; } blockquote { border-left: 3px solid #000; padding-left: 10px; margin: 8px 0; break-inside: avoid; } pre { margin: 6px 0; line-height: 1.55 !important; break-inside: avoid; } .mermaid-viewport { width: 100% !important; overflow: visible !important; margin: 8px 0; } .mermaid-viewport svg { max-width: 720px !important; max-height: 460px !important; width: auto !important; height: auto !important; display: block; margin: 0 auto; } .mermaid-rendered, .video-wrapper { break-inside: avoid; margin: 8px 0; } .message-block { break-inside: avoid; margin-bottom: 12px; } .role-label { font-size: 9px; font-weight: bold; margin: 0 0 2px; }';
  wrapper.appendChild(style);

  for (const message of conversation) {
    const isUser = message.role === 'user';
    const block = document.createElement('div');
    block.className = 'message-block';
    block.style.marginBottom = '14px';
    block.style.breakInside = 'avoid';
    const label = document.createElement('div');
    label.className = 'role-label';
    label.style.color = isUser ? '#003c8f' : '#141414';
    label.textContent = isUser ? 'User' : 'Agent';
    block.appendChild(label);
    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = message.rendered || message.content || '';
    contentDiv.querySelectorAll('iframe[src*="youtube.com/embed"]').forEach((iframe) => {
      const card = document.createElement('div');
      card.className = 'video-wrapper';
      card.style.border = '1px solid #000';
      card.style.background = '#f5f5f5';
      card.style.padding = '10px';
      card.style.margin = '8px 0';
      card.style.breakInside = 'avoid';
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
    block.appendChild(contentDiv);
    wrapper.appendChild(block);
  }

  document.body.appendChild(wrapper);

  try {
    await renderMermaidDiagrams(wrapper);
    await new Promise((resolve) => setTimeout(resolve, 400));

    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(String(agent.title || agent.role), margin, margin);
    let y = margin + 10;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    pdf.text('Role: ' + agent.role, margin, y);
    pdf.text('Exported: ' + new Date().toLocaleString(), margin, y + 6);
    y += 18;

    for (const block of wrapper.querySelectorAll('.message-block')) {
      const canvas = await html2canvas(block, {
        width: Math.floor((contentWidth * 96) / 25.4),
        scale: 2,
        logging: false,
        useCORS: true,
      });
      let imgHeight = (canvas.height * contentWidth) / canvas.width;
      const maxBlockHeight = pageHeight - 2 * margin;
      if (imgHeight > maxBlockHeight) { imgHeight = maxBlockHeight; }
      if (y + imgHeight > pageFill) {
        pdf.addPage();
        y = margin;
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      }
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, y, contentWidth, imgHeight);
      y += imgHeight + 10;
    }
  } finally {
    document.body.removeChild(wrapper);
  }

  const safeName = (agent.title || agent.role).replace(/[^a-z0-9]/gi, '_').toLowerCase();
  pdf.save(safeName + '_conversation.pdf');
}
