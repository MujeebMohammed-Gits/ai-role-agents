import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function downloadConversationPdf(agent, conversation) {
  if (!agent || !conversation || conversation.length === 0) return;

  const threadEl = document.querySelector('[data-chat-thread="true"]') || document.querySelector('main .overflow-y-auto');
  if (!threadEl) return;

  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-10000px';
  wrapper.style.top = '0';
  wrapper.style.width = '920px';
  wrapper.style.background = '#ffffff';
  wrapper.style.padding = '32px 36px';
  wrapper.style.color = '#0f172a';
  wrapper.style.fontFamily = 'Inter, system-ui, -apple-system, sans-serif';

  const header = document.createElement('div');
  header.style.borderBottom = '2px solid #e2e8f0';
  header.style.paddingBottom = '16px';
  header.style.marginBottom = '24px';
  const hBar = document.createElement('div');
  hBar.style.cssText = 'height:6px;background:#4f46e5;border-radius:4px;margin-bottom:16px;';
  const hTitle = document.createElement('div');
  hTitle.style.cssText = 'font-size:22px;font-weight:700;color:#0f172a;';
  hTitle.textContent = `AI Role Agents ? ${agent.title}`;
  const hSub = document.createElement('div');
  hSub.style.cssText = 'font-size:12px;color:#64748b;margin-top:4px;';
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

  clone.querySelectorAll('.video-wrapper').forEach((vw) => {
    const iframe = vw.querySelector('iframe');
    const src = iframe?.getAttribute('src') || '';
    const title = iframe?.getAttribute('title') || 'Embedded Reference Video';
    const watchUrl = src.replace('/embed/', '/watch?v=');
    vw.innerHTML = '';
    const card = document.createElement('div');
    card.style.cssText = 'padding:12px 16px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;margin:8px 0;';
    const tag = document.createElement('div');
    tag.style.cssText = 'font-size:12px;font-weight:700;color:#4f46e5;';
    tag.textContent = '? Embedded Video Reference';
    const ttl = document.createElement('div');
    ttl.style.cssText = 'font-size:13px;font-weight:600;color:#0f172a;margin-top:2px;';
    ttl.textContent = title;
    const lnk = document.createElement('div');
    lnk.style.cssText = 'font-size:11px;color:#2563eb;margin-top:2px;';
    lnk.textContent = watchUrl;
    card.appendChild(tag);
    card.appendChild(ttl);
    card.appendChild(lnk);
    vw.appendChild(card);
  });

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    const canvas = await html2canvas(wrapper, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: 920,
    });

    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 24;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;

    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/png');

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
    heightLeft -= usableHeight;

    while (heightLeft > 0) {
      position = margin - (imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= usableHeight;
    }

    const slug = (agent.role || 'agent').replace(/[^a-z0-9_-]/gi, '-');
    pdf.save(`ai-role-agents-${slug}-chat.pdf`);
  } finally {
    document.body.removeChild(wrapper);
  }
}
