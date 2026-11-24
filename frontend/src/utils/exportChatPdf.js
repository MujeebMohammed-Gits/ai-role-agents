import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const runAutoTable =
  typeof autoTable === 'function' ? autoTable : autoTable?.default;

const INDIGO_R = 79;
const INDIGO_G = 70;
const INDIGO_B = 229;
const TEXT_R = 30;
const TEXT_G = 41;
const TEXT_B = 59;
const MUTED_R = 100;
const MUTED_G = 116;
const MUTED_B = 139;
const LINE_R = 203;
const LINE_G = 213;
const LINE_B = 225;
const DARK_R = 15;
const DARK_G = 23;
const DARK_B = 42;
const WATERMARK_TEXT = "AI Role Agents";
const FOOTER_TEXT = "AI Role Agents built by Mujeeb Mohammed";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 46;
const TOP_Y = 62;
const BOTTOM_Y = PAGE_H - 48;
const CONTENT_WIDTH = PAGE_W - MARGIN_X * 2; // 503.28

// Strict Helvetica / ASCII sanitizer. Strips raw Markdown markers and every
// glyph Helvetica cannot render, so zero garbled bytes ever reach the PDF.
// Unicode fractions, dashes and curly quotes are mapped to plain ASCII *before*
// the non-ASCII strip so 1/2, 1/4, 3/4, -, ', ", ->, >=, <= survive as readable text.
const sanitizeText = (str) => {
  let s = String(str ?? '');
  // Unicode fractions -> ASCII
  s = s.replace(/¼/g, '1/4');
  s = s.replace(/½/g, '1/2');
  s = s.replace(/¾/g, '3/4');
  // Dashes and curly quotes -> ASCII
  s = s.replace(/—|–/g, '-');
  s = s.replace(/’|‘/g, "'");
  s = s.replace(/”|“/g, '"');
  s = s.replace(/→/g, '->');
  s = s.replace(/≥/g, '>=');
  s = s.replace(/≤/g, '<=');
  // Inline Markdown markers
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/\*([^*]+)\*/g, '$1');
  s = s.replace(/`([^`]+)`/g, '$1');
  s = s.replace(/\[([^\]]*)\]\(([^)]*)\)/g, '$1 ($2)');
  s = s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
  s = s.replace(/[^\x20-\x7E\n]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
};

// True background watermark drawn underneath all text and tables on a page.
// Uses real PDF transparency (GState opacity 0.07) so it never washes out
// foreground content.
const drawWatermark = (d) => {
  d.saveGraphicsState();
  d.setGState(new d.GState({ opacity: 0.07 }));
  d.setTextColor(INDIGO_R, INDIGO_G, INDIGO_B);
  d.setFont('helvetica', 'bold');
  d.setFontSize(54);
  d.text(WATERMARK_TEXT, PAGE_W / 2, PAGE_H / 2 + 40, { align: 'center', angle: 32 });
  d.restoreGraphicsState();
  d.setTextColor(TEXT_R, TEXT_G, TEXT_B);
  d.setFont('helvetica', 'normal');
  d.setFontSize(10);
};

// Lazy mermaid so the module loads cleanly even in headless / Node contexts.
let mermaidModule = null;
let mermaidAttempted = false;
const loadMermaid = async () => {
  if (mermaidAttempted) return mermaidModule;
  mermaidAttempted = true;
  try {
    mermaidModule = await import('mermaid');
  } catch (e) {
    console.warn('[exportChatPdf] mermaid import failed', e);
    mermaidModule = null;
  }
  return mermaidModule;
};

export async function buildConversationPdf(agent, conversation) {
  if (!agent || !conversation || conversation.length === 0) {
    throw new Error('[downloadConversationPdf] agent and conversation are required');
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  let y = TOP_Y;

  // True background watermark on page 1, before any content is drawn.
  drawWatermark(doc);

  const agentTitle = (agent && agent.title) || (agent && agent.role) || 'Conversation';
  const dateStr = new Date().toLocaleDateString();

  const setStyle = (bold, italic) => {
    doc.setFont('helvetica', bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'normal');
  };

  const startNewPage = () => {
    doc.addPage();
    y = TOP_Y;
    drawWatermark(doc);
  };

  const ensureSpace = (neededPt) => {
    if (y + neededPt > BOTTOM_Y) {
      startNewPage();
    }
  };

  const drawSpeakerHeader = (label, isUser) => {
    ensureSpace(30);
    const fill = isUser ? { r: 241, g: 245, b: 249 } : { r: 238, g: 242, b: 255 };
    const textColor = isUser ? { r: TEXT_R, g: TEXT_G, b: TEXT_B } : { r: INDIGO_R, g: INDIGO_G, b: INDIGO_B };
    const bannerH = 20;
    doc.setFillColor(fill.r, fill.g, fill.b);
    doc.setDrawColor(LINE_R, LINE_G, LINE_B);
    doc.setLineWidth(0.4);
    doc.roundedRect(MARGIN_X, y, CONTENT_WIDTH, bannerH, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(textColor.r, textColor.g, textColor.b);
    doc.text(label, MARGIN_X + 8, y + 14);
    y += bannerH + 8;
    doc.setTextColor(TEXT_R, TEXT_G, TEXT_B);
    setStyle(false, false);
  };

  let mermaidDiagramIndex = 0;

  const renderMermaidVectorFallback = (source) => {
    const lines = String(source).split('\n').filter((l) => l.trim() !== '');
    if (lines.length === 0) return;
    const steps = [];
    const seen = new Set();
    const addStep = (id, label) => {
      if (id && !seen.has(id)) {
        seen.add(id);
        steps.push(label || id);
      }
    };
    const nodeLabel = /^[A-Za-z0-9_]+\[([^\]]*)\]/;
    const linkMatch = /([A-Za-z0-9_]+)\s*-->\s*([A-Za-z0-9_]+)/;
    for (const line of lines) {
      const lm = line.match(linkMatch);
      if (lm) {
        addStep(lm[1], null);
        addStep(lm[2], null);
        continue;
      }
      const nm = line.match(nodeLabel);
      if (nm) {
        const id = (line.match(/^[A-Za-z0-9_]+/) || [])[0] || '';
        addStep(id, nm[1]);
      }
    }
    if (steps.length === 0) {
      for (const line of lines) {
        steps.push(sanitizeText(line).slice(0, 40) || line);
      }
    }
    const pad = 10;
    const boxW = CONTENT_WIDTH;
    const headerH = 20;
    const lineH = 14;
    const totalH = pad * 2 + headerH + steps.length * lineH + 12;
    ensureSpace(totalH);
    const boxX = MARGIN_X;
    const boxY = y;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(LINE_R, LINE_G, LINE_B);
    doc.setLineWidth(0.8);
    doc.roundedRect(boxX, boxY, boxW, totalH, 3, 3, 'FD');
    doc.setFillColor(INDIGO_R, INDIGO_G, INDIGO_B);
    doc.rect(boxX, boxY, boxW, headerH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('Mermaid workflow (vector fallback)', boxX + pad, boxY + 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(TEXT_R, TEXT_G, TEXT_B);
    let yy = boxY + headerH + pad;
    const chain = steps.map((s, i) => (i + 1) + '. ' + sanitizeText(s)).join('   ->   ');
    const wrapped = doc.splitTextToSize(chain, boxW - pad * 2);
    for (const w of wrapped) {
      doc.text(w, boxX + pad, yy);
      yy += lineH;
    }
    y = boxY + totalH + 12;
  };

  const renderMermaidBlock = async (source) => {
    mermaidDiagramIndex += 1;
    const cleanSource = String(source)
      .split('\n')
      .map((line) => {
        let s = line;
        s = s.replace(/≥/g, '>=');
        s = s.replace(/≤/g, '<=');
        s = s.replace(/→/g, '->');
        s = s.replace(/^(\s*)\[([^\]]+)\](\s*)$/m, '$1"$2"$3');
        return s;
      })
      .join('\n');

    let svgString = '';
    try {
      if (typeof document !== 'undefined') {
        const rendered = document.querySelectorAll('.mermaid-rendered svg');
        const existing = rendered[mermaidDiagramIndex - 1];
        if (existing) {
          svgString = existing.outerHTML || existing.innerHTML || '';
        }
      }
    } catch (e) {
      // DOM not available or query failed; fall through to mermaid.render.
    }

    if (!svgString) {
      const mermaid = await loadMermaid();
      if (mermaid) {
        try {
          mermaid.initialize({ startOnLoad: false, theme: 'default', htmlLabels: false, securityLevel: 'loose' });
          const result = await mermaid.render('mermaid_' + Math.random().toString(36).slice(2, 9), cleanSource, { htmlLabels: false });
          svgString = result.svg || '';
        } catch (e) {
          console.warn('[exportChatPdf] mermaid.render failed', e);
        }
      }
    }

    if (!svgString) {
      return renderMermaidVectorFallback(cleanSource);
    }

    let vbW = 700;
    let vbH = 405;
    const vbMatch = svgString.match(/viewBox="([^"]*)"/);
    if (vbMatch) {
      const parts = vbMatch[1].trim().split(/\s+/);
      vbW = parseFloat(parts[2]) || 700;
      vbH = parseFloat(parts[3]) || 405;
    }
    if (!vbW || !vbH || !isFinite(vbW) || !isFinite(vbH)) {
      vbW = 700;
      vbH = 405;
    }

    // Never let a Mermaid diagram run past the content bottom or overlap the
    // footer: clamp to the remaining vertical space and content width, then
    // scale proportionally. If less than 240 pt of room remains, start a fresh
    // page so the diagram begins cleanly at the top.
    const availH = BOTTOM_Y - y - 14;
    if (availH < 240) {
        startNewPage();
    }
    const maxDiagramH = Math.min(360, BOTTOM_Y - y - 14);
    const maxDiagramW = CONTENT_WIDTH - 20;
    const scale = Math.min(maxDiagramW / vbW, maxDiagramH / vbH);
    const imgW = vbW * scale;
    const imgH = vbH * scale;

    ensureSpace(imgH + 18);
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
      });
      const canvas = document.createElement('canvas');
      const scale = 3;
      canvas.width = Math.max(1, Math.round(imgW * scale));
      canvas.height = Math.max(1, Math.round(imgH * scale));
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const centerX = MARGIN_X + (CONTENT_WIDTH - imgW) / 2;
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', centerX, y, imgW, imgH);
    } catch (e) {
      console.warn('[exportChatPdf] mermaid rasterize failed', e);
      return renderMermaidVectorFallback(cleanSource);
    }
    y += imgH + 18;
  };

  const parseBlocks = (raw) => {
    const lines = String(raw).split('\n');
    const blocks = [];
    let i = 0;

    const isBlockStart = (line) => {
      if (/^```/.test(line)) return true;
      if (/^\s*\|/.test(line)) return true;
      if (/^\s*(#{1,4})\s/.test(line)) return true;
      if (/^\s*(\d+)[.)]\s+/.test(line)) return true;
      if (/^\s*[-*•]\s+/.test(line)) return true;
      if (/^\s*[-*_]{3,}\s*$/.test(line)) return true;
      return false;
    };

    while (i < lines.length) {
      const line = lines[i];
      const fence = line.match(/^```(\w*)\s*$/);
      if (fence) {
        const lang = (fence[1] || '').trim().toLowerCase();
        const source = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) {
          source.push(lines[i]);
          i++;
        }
        i++;
        if (lang === 'mermaid') {
          blocks.push({ type: 'mermaid', source: source.join('\n') });
        } else {
          blocks.push({ type: 'code', source: source.join('\n') });
        }
        continue;
      }

      if (/^\s*\|/.test(line)) {
        const tableLines = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) {
          tableLines.push(lines[i]);
          i++;
        }
        blocks.push({ type: 'table', lines: tableLines });
        continue;
      }

      if (/^\s*[-*_]{3,}\s*$/.test(line)) {
        blocks.push({ type: 'hr' });
        i++;
        continue;
      }

      const h = line.match(/^\s*(#{1,4})\s+(.*)$/);
      if (h) {
        blocks.push({ type: 'heading', depth: h[1].length, text: h[2] });
        i++;
        continue;
      }

      const num = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
      const bul = line.match(/^\s*([-*•])\s+(.*)$/);
      if (num || bul) {
        const ordered = !!num;
        const items = [];
        while (i < lines.length) {
          const m = lines[i].match(/^\s*(\d+)[.)]\s+(.*)$/);
          const b = lines[i].match(/^\s*([-*•])\s+(.*)$/);
          if ((ordered && m) || (!ordered && b)) {
            items.push((m || b)[2]);
            i++;
          } else break;
        }
        blocks.push({ type: 'list', ordered, items });
        continue;
      }

      if (line.trim() !== '') {
        const para = [];
        while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i])) {
          para.push(lines[i]);
          i++;
        }
        blocks.push({ type: 'paragraph', text: para.join(' ') });
        continue;
      }

      i++;
    }
    return blocks;
  };

  try {
    for (const message of conversation) {
      const isUser = message.role === 'user';
      const label = isUser ? 'User' : agentTitle;
      drawSpeakerHeader(label, isUser);

      const raw = message.content != null ? String(message.content) : '';
      // Normalize headings that follow a paragraph without a blank line so they
      // parse as styled headings instead of printing literal Markdown hashes.
      const normalized = raw.replace(/([^\n])\n(#{1,3}\s+)/g, '$1\n\n$2');
      const blocks = parseBlocks(normalized);

      for (const block of blocks) {
        if (block.type === 'mermaid') {
          await renderMermaidBlock(block.source);
        } else if (block.type === 'table') {
          const tableLines = block.lines;
          const headerRow = tableLines[0].replace(/^\s*\||\s*\|$/g, '').split('|').map((c) => sanitizeText(c));
          const rows = [];
          for (let r = 1; r < tableLines.length; r++) {
            const rowLine = tableLines[r];
            const trimmed = rowLine.replace(/^\s*\||\s*\|$/g, '');
            if (/^[:-\s|]+$/.test(trimmed)) continue;
            rows.push(trimmed.split('|').map((c) => sanitizeText(c)));
          }
          if (headerRow.length === 0 && rows.length === 0) continue;

          const estTableH = (rows.length + 1) * 28 + 16;
          if (y + estTableH > BOTTOM_Y && estTableH <= (BOTTOM_Y - TOP_Y) * 0.85) {
            startNewPage();
          }
          runAutoTable(doc, {
            head: [headerRow],
            body: rows,
            startY: y,
            margin: { left: MARGIN_X, right: MARGIN_X, top: 62, bottom: 50 },
            rowPageBreak: 'avoid',
            willDrawPage: (data) => {
              drawWatermark(doc);
            },
            styles: {
              font: 'helvetica',
              fontSize: 9,
              cellPadding: 6,
              textColor: [TEXT_R, TEXT_G, TEXT_B],
              lineColor: [LINE_R, LINE_G, LINE_B],
              lineWidth: 0.5,
              overflow: 'linebreak',
            },
            headStyles: {
              fillColor: [INDIGO_R, INDIGO_G, INDIGO_B],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
          });
          y = doc.lastAutoTable.finalY + 14;
        } else if (block.type === 'heading') {
          const clean = sanitizeText(block.text);
          if (!clean) continue;
          const size = block.depth === 1 ? 14 : block.depth === 2 ? 12.5 : 11;
          const isIndigo = block.depth === 1 || block.depth === 2;
          ensureSpace(50);
          setStyle(true, false);
          doc.setFontSize(size);
          doc.setTextColor(isIndigo ? INDIGO_R : DARK_R, isIndigo ? INDIGO_G : DARK_G, isIndigo ? INDIGO_B : DARK_B);
          const wrapped = doc.splitTextToSize(clean, CONTENT_WIDTH);
          let yy = y;
          for (const w of wrapped) {
            doc.text(w, MARGIN_X, yy);
            yy += size + 4;
          }
          y = yy + 6;
          setStyle(false, false);
          doc.setTextColor(TEXT_R, TEXT_G, TEXT_B);
        } else if (block.type === 'list') {
          const bulletX = MARGIN_X + 4;
          const textX = MARGIN_X + 20;
          const maxWidth = CONTENT_WIDTH - 20; // 483 pt
          const lineHeight = 14.5;
          let counter = 1;
          for (const item of block.items) {
            const marker = block.ordered ? String(counter++) + '.' : '•';
            const clean = sanitizeText(item);
            const lines = doc.splitTextToSize(clean, maxWidth);
            ensureSpace(textLines.length * lineHeight + 6);
            setStyle(false, false);
            doc.setFontSize(10);
            doc.setTextColor(TEXT_R, TEXT_G, TEXT_B);
            doc.text(marker, bulletX, y);
            for (let j = 0; j < textLines.length; j++) {
              doc.text(lines[j], textX, y + j * lineHeight);
            }
            y += textLines.length * lineHeight + 6;
          }
        } else if (block.type === 'hr') {
          ensureSpace(12);
          doc.setDrawColor(226, 232, 240);
          doc.line(MARGIN_X, y + 4, PAGE_W - MARGIN_X, y + 4);
          y += 12;
        } else if (block.type === 'paragraph') {
          const clean = sanitizeText(block.text);
          if (!clean) continue;
          const textLines = doc.splitTextToSize(clean, CONTENT_WIDTH);
          ensureSpace(textLines.length * 14.5 + 8);
          setStyle(false, false);
          doc.setFontSize(10);
          doc.setTextColor(TEXT_R, TEXT_G, TEXT_B);
          for (let j = 0; j < textLines.length; j++) {
            doc.text(textLines[j], MARGIN_X, y + j * 14.5);
          }
          y += textLines.length * 14.5 + 8;
        } else if (block.type === 'code') {
          const clean = sanitizeText(block.source);
          if (!clean) continue;
          const textLines = doc.splitTextToSize(clean, CONTENT_WIDTH);
          ensureSpace(textLines.length * 14 + 8);
          setStyle(false, false);
          doc.setFontSize(10);
          doc.setTextColor(TEXT_R, TEXT_G, TEXT_B);
          for (let j = 0; j < textLines.length; j++) {
            doc.text(textLines[j], MARGIN_X, y + j * 14);
          }
          y += textLines.length * 14 + 8;
        }
      }

      y += 10;
    }

    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);

      doc.setFillColor(INDIGO_R, INDIGO_G, INDIGO_B);
      doc.rect(0, 0, PAGE_W, 3, 'F');
      doc.setFontSize(10);
      setStyle(true, false);
      doc.setTextColor(INDIGO_R, INDIGO_G, INDIGO_B);
      doc.text('AI Role Agents portal', MARGIN_X, 28);
      doc.setFontSize(9);
      setStyle(false, false);
      doc.setTextColor(MUTED_R, MUTED_G, MUTED_B);
      const rightText = agentTitle + '  |  ' + dateStr;
      doc.text(rightText, PAGE_W - MARGIN_X, 28, { align: 'right' });
      doc.setDrawColor(LINE_R, LINE_G, LINE_B);
      doc.setLineWidth(0.4);
      doc.line(MARGIN_X, 42, PAGE_W - MARGIN_X, 42);

      const footerY = PAGE_H - 36;
      doc.setDrawColor(LINE_R, LINE_G, LINE_B);
      doc.setLineWidth(0.4);
      doc.line(MARGIN_X, footerY, PAGE_W - MARGIN_X, footerY);
      doc.setFontSize(9);
      setStyle(false, false);
      doc.setTextColor(MUTED_R, MUTED_G, MUTED_B);
      doc.text('Page ' + p + ' of ' + totalPages, MARGIN_X, PAGE_H - 20);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text(FOOTER_TEXT, PAGE_W - MARGIN_X, PAGE_H - 20, { align: 'right' });
      doc.setFont('helvetica', 'normal');
    }

    setStyle(false, false);
    doc.setTextColor(TEXT_R, TEXT_G, TEXT_B);
    return doc;
  } catch (err) {
    console.error('[buildConversationPdf] vector-PDF path failed:', err);
    throw err;
  }
}

export async function downloadConversationPdf(agent, conversation) {
  if (!agent || !conversation || conversation.length === 0) return;
  const doc = await buildConversationPdf(agent, conversation);
  const agentTitle = (agent && agent.title) || (agent && agent.role) || 'Conversation';
  const slug = String(agentTitle).replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`ai-role-agents-${slug}-chat.pdf`);
}

