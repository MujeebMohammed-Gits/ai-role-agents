import jsPDF from "jspdf";
import { autoTable } from "jspdf-autotable";
import mermaid from "mermaid";

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
const MARGIN_L = 46;
const MARGIN_R = 46;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
const TOP_Y = 56;
const BOTTOM_LIMIT = PAGE_H - 48;
const MAX_MERMAID_H = 320;

export async function downloadConversationPdf(agent, conversation) {
  if (!agent || !conversation || conversation.length === 0) return;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  let y = TOP_Y;

  const agentTitle = (agent && agent.title) || (agent && agent.role) || "Conversation";
  const slug = String(agentTitle).replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const dateStr = new Date().toLocaleDateString();

  const textWidth = (text, size) =>
    doc.getStringUnitWidth(text) * size / doc.internal.scaleFactor;

  const setStyle = (bold, italic) => {
    doc.setFont("helvetica", bold && italic ? "bolditalic" : bold ? "bold" : italic ? "italic" : "normal");
  };

  const ensureSpace = (needed) => {
    if (y + needed > BOTTOM_LIMIT) {
      doc.addPage();
      y = TOP_Y;
    }
  };

  const cleanTextForPdf = (str) => {
    let s = String(str ?? "");
    s = s.replace(/—|–/g, "-");
    s = s.replace(/‘|’/g, "'");
    s = s.replace(/“|”/g, '"');
    s = s.replace(/→/g, "->");
    s = s.replace(/•/g, "-");
    s = s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
    s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
    s = s.replace(/\*([^*]+)\*/g, "$1");
    s = s.replace(/`([^`]+)`/g, "$1");
    s = s.replace(/\[([^\]]*)\]\(([^)]*)\)/g, "$1 ($2)");
    s = s.replace(/[^\x20-\x7E\n]/g, " ");
    s = s.replace(/\s+/g, " ").trim();
    return s;
  };

  const drawSpeakerBanner = (label, isUser) => {
    ensureSpace(24);
    setStyle(true, false);
    doc.setFontSize(11);
    doc.setTextColor(isUser ? TEXT_R : INDIGO_R, isUser ? TEXT_G : INDIGO_G, isUser ? TEXT_B : INDIGO_B);
    doc.text(label, MARGIN_L, y);
    const ruleY = y + 5;
    doc.setDrawColor(LINE_R, LINE_G, LINE_B);
    doc.setLineWidth(0.4);
    doc.line(MARGIN_L, ruleY, MARGIN_L + CONTENT_W, ruleY);
    y = ruleY + 10;
    setStyle(false, false);
    doc.setTextColor(TEXT_R, TEXT_G, TEXT_B);
  };

  let mermaidReady = false;
  const renderMermaidFallback = (source) => {
    const lines = String(source).split("\n").filter((l) => l.trim() !== "");
    if (lines.length === 0) return;
    ensureSpace(lines.length * 14 + 8);
    setStyle(false, false);
    doc.setFontSize(10);
    doc.setTextColor(TEXT_R, TEXT_G, TEXT_B);
    let yy = y;
    for (const line of lines) {
      const clean = cleanTextForPdf(line);
      if (!clean) continue;
      const wrapped = doc.splitTextToSize(clean, CONTENT_W);
      for (const w of wrapped) {
        doc.text(w, MARGIN_L, yy);
        yy += 14;
      }
      yy += 6;
    }
    y = yy;
  };

  const renderMermaidBlock = async (source) => {
    if (!mermaidReady) {
      try {
        mermaid.initialize({ startOnLoad: false, securityLevel: "loose", theme: "base" });
        mermaidReady = true;
      } catch (e) {
        console.warn("[exportChatPdf] mermaid.initialize failed", e);
        return renderMermaidFallback(source);
      }
    }
    let svgString = "";
    try {
      const result = await mermaid.render("mermaid_" + Math.random().toString(36).slice(2, 9), source, { htmlLabels: false });
      svgString = result.svg || "";
    } catch (e) {
      console.warn("[exportChatPdf] mermaid.render failed", e);
      return renderMermaidFallback(source);
    }
    if (!svgString) return renderMermaidFallback(source);

    let vbW = 700;
    let vbH = 405;
    const vb = svgString.match(/viewBox="([^"]*)"/);
    if (vb) {
      const parts = vb[1].trim().split(/\s+/);
      vbW = parseFloat(parts[2]) || 700;
      vbH = parseFloat(parts[3]) || 405;
    }
    if (!vbW || !vbH || !isFinite(vbW) || !isFinite(vbH)) {
      vbW = 700;
      vbH = 405;
    }

    const fit = Math.min(CONTENT_W / vbW, MAX_MERMAID_H / vbH);
    const imgW = vbW * fit;
    const imgH = vbH * fit;

    ensureSpace(imgH + 18);
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgString)));
      });
      const canvas = document.createElement("canvas");
      const scale = 3;
      canvas.width = Math.max(1, Math.round(imgW * scale));
      canvas.height = Math.max(1, Math.round(imgH * scale));
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      doc.addImage(canvas.toDataURL("image/png"), "PNG", MARGIN_L, y, imgW, imgH);
    } catch (e) {
      console.warn("[exportChatPdf] mermaid rasterize failed", e);
      return renderMermaidFallback(source);
    }
    y += imgH + 18;
  };

  const parseBlocks = (raw) => {
    const lines = String(raw).split("\n");
    const blocks = [];
    let i = 0;
    const isBlockStart = (line) => {
      if (/^```/.test(line)) return true;
      if (/^\s*\|/.test(line)) return true;
      if (/^(#{1,3})\s/.test(line)) return true;
      if (/^(\d+)\.\s+/.test(line)) return true;
      if (/^[-*]\s+/.test(line)) return true;
      return false;
    };
    while (i < lines.length) {
      const line = lines[i];
      const fence = line.match(/^```(\w*)\s*$/);
      if (fence) {
        const lang = (fence[1] || "").trim().toLowerCase();
        const source = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) {
          source.push(lines[i]);
          i++;
        }
        i++;
        if (lang === "mermaid") {
          blocks.push({ type: "mermaid", source: source.join("\n") });
        } else {
          blocks.push({ type: "code", source: source.join("\n") });
        }
        continue;
      }
      if (/^\s*\|/.test(line)) {
        const tableLines = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) {
          tableLines.push(lines[i]);
          i++;
        }
        blocks.push({ type: "table", lines: tableLines });
        continue;
      }
      const h = line.match(/^(#{1,3})\s+(.*)$/);
      if (h) {
        blocks.push({ type: "heading", depth: h[1].length, text: h[2] });
        i++;
        continue;
      }
      const num = line.match(/^(\d+)\.\s+(.*)$/);
      const bul = line.match(/^[-*]\s+(.*)$/);
      if (num || bul) {
        const ordered = !!num;
        const items = [];
        while (i < lines.length) {
          const m = lines[i].match(/^(\d+)\.\s+(.*)$/);
          const b = lines[i].match(/^[-*]\s+(.*)$/);
          if ((ordered && m) || (!ordered && b)) {
            items.push((m || b)[2]);
            i++;
          } else break;
        }
        blocks.push({ type: "list", ordered, items });
        continue;
      }
      if (line.trim() !== "") {
        const para = [];
        while (i < lines.length && lines[i].trim() !== "" && !isBlockStart(lines[i])) {
          para.push(lines[i]);
          i++;
        }
        blocks.push({ type: "paragraph", text: para.join(" ") });
        continue;
      }
      i++;
    }
    return blocks;
  };

  try {
    for (const message of conversation) {
      const isUser = message.role === "user";
      const label = isUser ? "User" : agentTitle;
      drawSpeakerBanner(label, isUser);

      const raw = message.content != null ? String(message.content) : "";
      const blocks = parseBlocks(raw);
      for (const block of blocks) {
        if (block.type === "mermaid") {
          await renderMermaidBlock(block.source);
        } else if (block.type === "table") {
          const tableLines = block.lines;
          const headerRow = tableLines[0].replace(/^\s*\||\s*\|$/g, "").split("|").map((c) => cleanTextForPdf(c));
          const rows = [];
          for (let r = 1; r < tableLines.length; r++) {
            const rowLine = tableLines[r];
            const trimmed = rowLine.replace(/^\s*\||\s*\|$/g, "");
            if (/^[:-\s|]+$/.test(trimmed)) continue;
            rows.push(trimmed.split("|").map((c) => cleanTextForPdf(c)));
          }
          if (headerRow.length === 0 && rows.length === 0) continue;
          ensureSpace(40);
          autoTable(doc, {
            head: [headerRow],
            body: rows,
            startY: y,
            margin: { left: MARGIN_L, right: MARGIN_R, top: 64, bottom: 50 },
            rowPageBreak: "avoid",
            styles: { font: "helvetica", fontSize: 9.5, cellPadding: 6, textColor: [TEXT_R, TEXT_G, TEXT_B], lineColor: [LINE_R, LINE_G, LINE_B], lineWidth: 0.5, overflow: "linebreak" },
            headStyles: { fillColor: [INDIGO_R, INDIGO_G, INDIGO_B], textColor: [255, 255, 255], fontStyle: "bold" },
            alternateRowStyles: { fillColor: [248, 250, 252] },
          });
          y = doc.lastAutoTable.finalY + 14;
        } else if (block.type === "heading") {
          const clean = cleanTextForPdf(block.text);
          if (!clean) continue;
          const size = block.depth === 1 ? 14 : block.depth === 2 ? 12.5 : 11;
          const isIndigo = block.depth === 1 || block.depth === 2;
          ensureSpace(46);
          setStyle(true, false);
          doc.setFontSize(size);
          doc.setTextColor(isIndigo ? INDIGO_R : DARK_R, isIndigo ? INDIGO_G : DARK_G, isIndigo ? INDIGO_B : DARK_B);
          const wrapped = doc.splitTextToSize(clean, CONTENT_W);
          let yy = y;
          for (const w of wrapped) {
            doc.text(w, MARGIN_L, yy);
            yy += size + 4;
          }
          y = yy + 6;
          setStyle(false, false);
          doc.setTextColor(TEXT_R, TEXT_G, TEXT_B);
        } else if (block.type === "list") {
          const markerX = 50;
          const bodyX = MARGIN_L + 18;
          const maxWidth = CONTENT_W - 18;
          let counter = 1;
          for (const item of block.items) {
            const marker = block.ordered ? String(counter++) + "." : "•";
            const clean = cleanTextForPdf(item);
            if (!clean) continue;
            const textLines = doc.splitTextToSize(clean, maxWidth);
            ensureSpace(textLines.length * 14 + 6);
            setStyle(false, false);
            doc.setFontSize(10);
            doc.setTextColor(TEXT_R, TEXT_G, TEXT_B);
            doc.text(marker, markerX, y);
            for (let j = 0; j < textLines.length; j++) {
              doc.text(textLines[j], bodyX, y + j * 14);
            }
            y += textLines.length * 14 + 6;
          }
        } else if (block.type === "paragraph") {
          let text = block.text.replace(/\[([^\]]*)\]\(([^)]*)\)/g, ($0, title, url) => title + " (" + url + ")");
          const clean = cleanTextForPdf(text);
          if (!clean) continue;
          const textLines = doc.splitTextToSize(clean, CONTENT_W);
          ensureSpace(textLines.length * 14.5 + 8);
          setStyle(false, false);
          doc.setFontSize(10);
          doc.setTextColor(TEXT_R, TEXT_G, TEXT_B);
          for (let j = 0; j < textLines.length; j++) {
            doc.text(textLines[j], MARGIN_L, y + j * 14.5);
          }
          y += textLines.length * 14.5 + 8;
        } else if (block.type === "code") {
          const clean = cleanTextForPdf(block.source);
          if (!clean) continue;
          const textLines = doc.splitTextToSize(clean, CONTENT_W);
          ensureSpace(textLines.length * 14 + 8);
          setStyle(false, false);
          doc.setFontSize(10);
          doc.setTextColor(TEXT_R, TEXT_G, TEXT_B);
          for (let j = 0; j < textLines.length; j++) {
            doc.text(textLines[j], MARGIN_L, y + j * 14);
          }
          y += textLines.length * 14 + 8;
        }
      }
      y += 10;
    }

    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);

      const softGState = doc.addGState({ opacity: 0.065 });
      doc.setGState(softGState);
      doc.setFontSize(54);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(232, 235, 246);
      doc.text(WATERMARK_TEXT, PAGE_W / 2, PAGE_H / 2 + 40, { angle: 32, align: "center", baseline: "middle" });
      doc.setGState(doc.addGState({ opacity: 1 }));

      doc.setFillColor(INDIGO_R, INDIGO_G, INDIGO_B);
      doc.rect(0, 0, PAGE_W, 3, "F");
      doc.setFontSize(10);
      setStyle(true, false);
      doc.setTextColor(INDIGO_R, INDIGO_G, INDIGO_B);
      doc.text("AI Role Agents portal", MARGIN_L, 28);
      doc.setFontSize(9);
      setStyle(false, false);
      doc.setTextColor(MUTED_R, MUTED_G, MUTED_B);
      const rightText = agentTitle + "  |  " + dateStr;
      doc.text(rightText, PAGE_W - MARGIN_R, 28, { align: "right" });
      doc.setDrawColor(LINE_R, LINE_G, LINE_B);
      doc.setLineWidth(0.4);
      doc.line(MARGIN_L, 42, PAGE_W - MARGIN_R, 42);

      const footerY = PAGE_H - 36;
      doc.setDrawColor(LINE_R, LINE_G, LINE_B);
      doc.setLineWidth(0.4);
      doc.line(MARGIN_L, footerY, PAGE_W - MARGIN_R, footerY);
      doc.setFontSize(9);
      setStyle(false, false);
      doc.setTextColor(MUTED_R, MUTED_G, MUTED_B);
      doc.text("Page " + p + " of " + totalPages, MARGIN_L, PAGE_H - 20);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.text(FOOTER_TEXT, PAGE_W - MARGIN_R, PAGE_H - 20, { align: "right" });
      doc.setFont("helvetica", "normal");
    }

    setStyle(false, false);
    doc.setTextColor(TEXT_R, TEXT_G, TEXT_B);
    doc.save(`ai-role-agents-${slug}-chat.pdf`);
  } catch (err) {
    console.error("[downloadConversationPdf] vector-PDF path failed:", err);
    try {
      const fallback = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const fPageH = PAGE_H;
      const fMargin = 46;
      let fy = 70;
      fallback.setFont("helvetica", "normal");
      fallback.setFontSize(11);
      fallback.setTextColor(TEXT_R, TEXT_G, TEXT_B);
      fallback.text("AI Role Agents portal", fMargin, fy);
      fy += 14;
      fallback.setFontSize(9);
      fallback.setTextColor(MUTED_R, MUTED_G, MUTED_B);
      fallback.text("Conversation Export", fMargin, fy);
      fy += 20;
      fallback.setFontSize(11);
      fallback.setTextColor(TEXT_R, TEXT_G, TEXT_B);
      for (const message of conversation) {
        const role = message.role === "user" ? "User" : agentTitle;
        fallback.text(role + ":", fMargin, fy);
        fy += 12;
        const lines = fallback.splitTextToSize(String(message.content || ""), CONTENT_W);
        for (const line of lines) {
          if (fy > fPageH - 46) {
            fallback.addPage();
            fy = 70;
          }
          fallback.text(line, fMargin, fy);
          fy += 13;
        }
        fy += 8;
      }
      fallback.save(`ai-role-agents-${slug}-chat.pdf`);
    } catch (fbErr) {
      console.error("[downloadConversationPdf] text fallback failed:", fbErr);
    }
  }
}
