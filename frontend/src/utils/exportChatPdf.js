import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function downloadConversationPdf(agent, conversation) {
  if (!agent || !conversation || conversation.length === 0) return;

  const threadEl = document.querySelector('[data-chat-thread="true"]') || document.querySelector('main .overflow-y-auto');
  if (!threadEl) return;

  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-12000px';
  wrapper.style.top = '0';
  wrapper.style.width = '840px';
  wrapper.style.background = '#ffffff';
  wrapper.style.padding = '28px 32px';
  wrapper.style.color = '#0f172a';
  wrapper.style.fontFamily = 'Inter, system-ui, -apple-system, sans-serif';

  // Crisp high-contrast style overrides so no animations or low-opacity classes make PDF text faint
  const styleFix = document.createElement('style');
  styleFix.textContent = `
    .pdf-export-root * {
      opacity: 1 !important;
      animation: none !important;
      transition: none !important;
      color: #0f172a;
    }
    .pdf-export-root table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin: 10px 0 !important;
      font-size: 12px !important;
    }
    .pdf-export-root th, .pdf-export-root td {
      border: 1px solid #cbd5e1 !important;
      padding: 7px 9px !important;
      color: #0f172a !important;
      background: #ffffff !important;
      word-break: break-word !important;
    }
    .pdf-export-root th {
      background: #f1f5f9 !important;
      font-weight: 700 !important;
    }
    .pdf-export-root .mermaid-viewport {
      overflow: visible !important;
      max-height: none !important;
      height: auto !important;
      padding: 8px 0 !important;
    }
    .pdf-export-root .mermaid-canvas {
      transform: none !important;
      width: 100% !important;
    }
    .pdf-export-root .mermaid-rendered svg {
      max-width: 740px !important;
      width: 100% !important;
      height: auto !important;
      margin: 0 auto !important;
      display: block !important;
    }
    .pdf-export-root .mermaid-zoom-controls {
      display: none !important;
    }
  `;
  wrapper.className = 'pdf-export-root';
  wrapper.appendChild(styleFix);

  const header = document.createElement('div');
  header.style.borderBottom = '2px solid #cbd5e1';
  header.style.paddingBottom = '14px';
  header.style.marginBottom = '20px';
  const hBar = document.createElement('div');
  hBar.style.cssText = 'height:6px;background:#4f46e5;border-radius:4px;margin-bottom:14px;';
  const hTitle = document.createElement('div');
  hTitle.style.cssText = 'font-size:22px;font-weight:700;color:#0f172a;';
  hTitle.textContent = `AI Role Agents ? ${agent.title}`;
  const hSub = document.createElement('div');
  hSub.style.cssText = 'font-size:12px;color:#334155;margin-top:4px;';
  hSub.textContent = `${agent.subtitle || ''}  |  Exported on ${new Date().toLocaleString()}  |  https://vercel.app`;
  header.appendChild(hBar);
  header.appendChild(hTitle);
  header.appendChild(hSub);
  wrapper.appendChild(header);

  const clone = threadEl.cloneNode(true);
  clone.style.height = 'auto';
  clone.style.maxHeight = 'none';
  clone.style.overflow = 'visible';
  clone.style.padding = '0';

  // Convert cross-origin video iframes into crisp reference cards for PDF
  clone.querySelectorAll('.video-wrapper').forEach((vw) => {
    const iframe = vw.querySelector('iframe');
    const src = iframe?.getAttribute('src') || '';
    const title = iframe?.getAttribute('title') || 'Official Reference Video';
    const watchUrl = src.replace('/embed/', '/watch?v=');
    vw.innerHTML = '';
    const card = document.createElement('div');
    card.style.cssText = 'padding:12px 16px;background:#f8fafc;border:1px solid #94a3b8;border-radius:10px;margin:10px 0;';
    const tag = document.createElement('div');
    tag.style.cssText = 'font-size:12px;font-weight:700;color:#4f46e5;';
    tag.textContent = '? Official Embedded Video Reference';
    const ttl = document.createElement('div');
    ttl.style.cssText = 'font-size:13px;font-weight:600;color:#0f172a;margin-top:3px;';
    ttl.textContent = title;
    const lnk = document.createElement('div');
    lnk.style.cssText = 'font-size:11px;color:#1d4ed8;margin-top:3px;';
    lnk.textContent = watchUrl;
    card.appendChild(tag);
    card.appendChild(ttl);
    card.appendChild(lnk);
    vw.appendChild(card);
  });

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    // Smart pagination: insert spacer margins before atomic blocks so no table row, heading, or Mermaid diagram splits across pages!
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 28;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;
    const pxPerPt = 840 / usableWidth;
    const pageHeightPx = usableHeight * pxPerPt;

    const atomicBlocks = wrapper.querySelectorAll(
      'h1, h2, h3, h4, p, li, tr, blockquote, pre, .mermaid-placeholder, .mermaid-rendered, .video-wrapper'
    );
    const wrapTop = wrapper.getBoundingClientRect().top;

    atomicBlocks.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.height <= 0 || rect.height > pageHeightPx * 0.92) return;
      const topRel = rect.top - wrapTop;
      const botRel = rect.bottom - wrapTop;
      const startPage = Math.floor(topRel / pageHeightPx);
      const endPage = Math.floor((botRel - 2) / pageHeightPx);
      if (endPage > startPage) {
        const nextPageStart = (startPage + 1) * pageHeightPx;
        const pushPx = Math.ceil(nextPageStart - topRel + 14);
const curMargin = parseFloat(window.getComputedStyle(el).marginTop) || 0;
el.style.marginTop = ${curMargin + pushPx}px;
}
});
const canvas = await html2canvas(wrapper, {
scale: 2.5,
useCORS: true,
backgroundColor: '#ffffff',
windowWidth: 840,
});
const totalPages = Math.ceil(canvas.height / (pageHeightPx * 2.5));
const sliceHeightPx = Math.floor(pageHeightPx * 2.5);
for (let p = 0; p < totalPages; p++) {
const srcY = p * sliceHeightPx;
const srcH = Math.min(sliceHeightPx, canvas.height - srcY);
if (srcH <= 0) break;
const pageCanvas = document.createElement('canvas');
pageCanvas.width = canvas.width;
pageCanvas.height = srcH;
const ctx = pageCanvas.getContext('2d');
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
if (p > 0) pdf.addPage();
const renderH = (srcH / (canvas.width / usableWidth));
pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', margin, margin, usableWidth, renderH);
}
const slug = (agent.role || 'agent').replace(/[^a-z0-9_-]/gi, '-');
pdf.save(ai-role-agents-${slug}-chat.pdf);
} finally {
document.body.removeChild(wrapper);
}
}
