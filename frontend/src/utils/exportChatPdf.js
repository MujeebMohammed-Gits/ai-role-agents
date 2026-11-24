import jsPDF from "jspdf";
import "jspdf-autotable";
import { lexer } from "marked";
import mermaid from "mermaid";

const INDIGO_R = 79;
const INDIGO_G = 70;
const INDIGO_B = 229;
const LINK_R = 37;
const LINK_G = 99;
const LINK_B = 235;
const TEXT_R = 15;
const TEXT_G = 23;
const TEXT_B = 42;
const MUTED_R = 100;
const MUTED_G = 100;
const MUTED_B = 100;
const WATERMARK_TEXT = "AI Role Agents";
const FOOTER_TEXT = "AI Role Agents built by Mujeeb Mohammed";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_L = 46;
const MARGIN_R = 46;
const CONTENT_W = 503.28;
const HEADER_H = 56;
const FOOTER_H = 46;
const BODY_START_Y = HEADER_H + 14;
const BOTTOM_LIMIT = PAGE_H - FOOTER_H;
const LINE_H = 15;
const FONT_SIZE = 10.5;
const MAX_MERMAID_H = 340;

export async function downloadConversationPdf(agent, conversation) {
  if (!agent || !conversation || conversation.length === 0) return;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageHeight = PAGE_H;
  let y = BODY_START_Y;

  const agentName = (agent && agent.title) || (agent && agent.role) || "Conversation";
  const safeName = String(agentName).replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const dateStr = new Date().toLocaleDateString();

  const textWidth = (text, size) =>
    doc.getStringUnitWidth(text) * size / doc.internal.scaleFactor;

  const setStyle = (bold, italic) => {
    doc.setFont("helvetica", bold && italic ? "bolditalic" : bold ? "bold" : italic ? "italic" : "normal");
  };

  const ensureSpace = (needed) => {
    if (y + needed > BOTTOM_LIMIT) {
      doc.addPage();
      y = BODY_START_Y;
    }
  };

  const collectInline = (tokens, bold, italic) => {
    const runs = [];
    for (const t of tokens || []) {
      if (t.type === "text") runs.push({ text: t.text, url: null, bold, italic });
      else if (t.type === "softbreak") runs.push({ text: " ", url: null, bold, italic });
      else if (t.type === "link") runs.push({ text: t.text || "", url: t.href, bold, italic });
      else if (t.type === "strong") runs.push(...collectInline(t.tokens, true, italic));
      else if (t.type === "em") runs.push(...collectInline(t.tokens, bold, true));
      else if (t.type === "codespan") runs.push({ text: t.text, url: null, bold, italic });
    }
    return runs;
  };

  const normalize = (s) =>
    String(s)
      .replace(/\u2014|\u2013/g, "-")
      .replace(/\u2019/g, "'")
      .replace(/\u201c|\u201d/g, '"');

  const isYoutubeUrl = (u) => /youtu\.be\/|youtube\.com\/(embed\/|watch\?v=|v\/)/.test(u || "");

  const renderLinkRect = (x, yTop, w, h, url) => {
    try { doc.link(x, yTop, w, h, { url }); } catch (e) {}
  };

  const renderRuns = (runs, xStart, maxWidth) => {
    const lines = [];
    let cur = [];
    let curW = 0;
    for (const run of runs) {
      const words = run.text.split(/(\s+)/);
      for (const word of words) {
        if (word === "") continue;
        const w = textWidth(word, FONT_SIZE);
        if (curW + w > maxWidth && cur.length > 0) {
          lines.push(cur);
          cur = [];
          curW = 0;
        }
        cur.push({ ...run, text: word });
        curW += w;
      }
    }
    if (cur.length) lines.push(cur);

    for (const line of lines) {
      ensureSpace(LINE_H);
      let x = xStart;
      for (const frag of line) {
        setStyle(frag.bold, frag.italic);
        doc.setFontSize(FONT_SIZE);
        if (frag.url) {
          doc.setTextColor(LINK_R, LINK_G, LINK_B);
        } else {
          doc.setTextColor(TEXT_R, TEXT_G, TEXT_B);
        }
        const w = textWidth(frag.text, FONT_SIZE);
        doc.text(frag.text, x, y);
        if (frag.url) {
          renderLinkRect(x, y - FONT_SIZE * 0.8, w, FONT_SIZE * 1.2, frag.url);
        }
        x += w;
      }
      y += LINE_H;
    }
    setStyle(false, false);
    doc.setTextColor(TEXT_R, TEXT_G, TEXT_B);
    y += 6;
  };

  const drawSpeakerBanner = (label, isUser) => {
    ensureSpace(24);
    setStyle(true, false);
    doc.setFontSize(12);
    doc.setTextColor(isUser ? TEXT_R : INDIGO_R, isUser ? TEXT_G : INDIGO_G, isUser ? TEXT_B : INDIGO_B);
    doc.text(label, MARGIN_L, y);
    const ruleY = y + 5;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(MARGIN_L, ruleY, MARGIN_L + CONTENT_W, ruleY);
    y = ruleY + 10;
    setStyle(false, false);
    doc.setTextColor(TEXT_R, TEXT_G, TEXT_B);
  };

  const renderParagraph = (token) => {
    const runs = collectInline(token.tokens, false, false).map((r) => ({ ...r, text: normalize(r.text) }));
    const youtubeLinks = runs.filter((r) => r.url && isYoutubeUrl(r.url));
    if (runs.length === 1 && youtubeLinks.length === 1) {
      ensureSpace(50);
      const boxH = 44;
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.roundedRect(MARGIN_L, y, CONTENT_W, boxH, 3, 3);
      doc.setFontSize(10);
      setStyle(true, false);
      doc.setTextColor(INDIGO_R, INDIGO_G, INDIGO_B);
      doc.text("Watch Official Video on YouTube:", MARGIN_L + 10, y + 15);
      const linkText = runs[0].text || runs[0].url || "";
      const lw = textWidth(linkText, 10);
      setStyle(false, false);
      doc.setTextColor(LINK_R, LINK_G, LINK_B);
      doc.text(linkText, MARGIN_L + 10, y + 30);
      renderLinkRect(MARGIN_L + 10, y + 30 - 8, lw, 12, runs[0].url);
      y += boxH + 12;
      return;
    }
    renderRuns(runs, MARGIN_L, CONTENT_W);
  };

  const renderList = (token) => {
    const ordered = token.ordered;
    let start = token.start || 1;
    const indentX = MARGIN_L + 18;
    const maxWidth = CONTENT_W - 18;
    for (const item of token.items || []) {
      const marker = ordered ? String(start++) + "." : "\u2022";
      ensureSpace(LINE_H + 6);
      setStyle(false, false);
      doc.setFontSize(FONT_SIZE);
      doc.setTextColor(TEXT_R, TEXT_G, TEXT_B);
      doc.text(marker, MARGIN_L, y);
      const runs = collectInline(item.tokens || [], false, false).map((r) => ({ ...r, text: normalize(r.text) }));
      renderRuns(runs, indentX, maxWidth);
      y += 2;
    }
  };

  const renderHeading = (depth, text) => {
    const clean = String(text).replace(/^[\p{Emoji}\p{Extended_Pictographic}\uFE0F\u200D\s]+/gu, "").trim();
    if (!clean) return;
    const size = depth === 1 ? 15 : depth === 2 ? 13.5 : 11.5;
    const isIndigo = depth === 2;
    ensureSpace(size + LINE_H);
    setStyle(true, false);
    doc.setFontSize(size);
    doc.setTextColor(isIndigo ? INDIGO_R : TEXT_R, isIndigo ? INDIGO_G : TEXT_G, isIndigo ? INDIGO_B : TEXT_B);
    doc.text(clean, MARGIN_L, y);
    y += size + 8;
    setStyle(false, false);
    doc.setTextColor(TEXT_R, TEXT_G, TEXT_B);
  };

  const renderCodeBlock = (source) => {
    const lines = String(source).split("\n");
    ensureSpace(lines.length * 7 + 10);
    setStyle(false, false);
    doc.setFontSize(8.5);
    doc.setTextColor(TEXT_R, TEXT_G, TEXT_B);
    for (const ln of lines) {
      ensureSpace(7);
      doc.text(ln, MARGIN_L, y);
      y += 7;
    }
    y += 6;
  };

  let mermaidReady = false;
  const renderMermaidBlock = async (source) => {
    if (!mermaidReady) {
      try {
        mermaid.initialize({ startOnLoad: false, securityLevel: "loose", theme: "base" });
        mermaidReady = true;
      } catch (e) {
        console.warn("[exportChatPdf] mermaid.initialize failed", e);
      }
    }
    let svgString = "";
    try {
      const result = await mermaid.render("mermaid_" + Math.random().toString(36).slice(2, 9), source, { htmlLabels: false });
      svgString = result.svg || "";
    } catch (e) {
      console.warn("[exportChatPdf] mermaid.render failed", e);
      renderCodeBlock(source);
      return;
    }
    if (!svgString) {
      renderCodeBlock(source);
      return;
    }
    const vb = svgString.match(/viewBox="([^"]*)"/);
    let vbW = 700;
    let vbH = 405;
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
    ensureSpace(imgH + 16);
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
      renderCodeBlock(source);
      return;
    }
    y += imgH + 16;
  };

  const renderTable = (token) => {
    const header = token.header ? token.header.cells.map((c) => String(c)) : [];
    const rows = (token.rows || []).map((r) => r.cells.map((c) => String(c)));
    if (header.length === 0 && rows.length === 0) return;
    ensureSpace(40);
    doc.autoTable({
      head: header.length ? [header] : [],
      body: rows,
      startX: MARGIN_L,
      tableWidth: CONTENT_W,
      margin: { left: MARGIN_L, right: MARGIN_R },
      styles: { fontSize: 9, cellPadding: 5, lineColor: [203, 213, 225], lineWidth: 0.3, textColor: [15, 23, 42], font: "helvetica" },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold", lineColor: [203, 213, 225] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      rowPageBreak: "avoid",
      headRepeat: 1,
    });
    const prev = doc.autoTable && doc.autoTable.previous;
    y = (prev && prev.finalY != null) ? prev.finalY : y + 40;
    y += 10;
  };

  try {
    for (const message of conversation) {
      const isUser = message.role === "user";
      const label = isUser ? "User" : agentName;
      drawSpeakerBanner(label, isUser);

      const raw = message.content != null ? String(message.content) : String(message.rendered || "");
      const tokens = lexer(String(raw));
      for (const token of tokens) {
        if (token.type === "heading") {
          renderHeading(token.depth, token.text);
        } else if (token.type === "paragraph") {
          renderParagraph(token);
        } else if (token.type === "list") {
          renderList(token);
        } else if (token.type === "table") {
          renderTable(token);
        } else if (token.type === "code") {
          const lang = String(token.lang || "").trim().toLowerCase();
          if (lang === "mermaid") {
            await renderMermaidBlock(token.text);
          } else {
            renderCodeBlock(token.text);
          }
        } else if (token.type === "blockquote") {
          const inner = collectInline(token.tokens || [], false, false).map((r) => ({ ...r, text: normalize(r.text) }));
          ensureSpace(LINE_H + 4);
          doc.setDrawColor(15, 23, 42);
          doc.setLineWidth(0.8);
          doc.line(MARGIN_L, y, MARGIN_L, y + LINE_H + 4);
          renderRuns(inner, MARGIN_L + 10, CONTENT_W - 10);
        } else if (token.type === "hr") {
          ensureSpace(10);
          doc.setDrawColor(203, 213, 225);
          doc.setLineWidth(0.4);
          doc.line(MARGIN_L, y, MARGIN_L + CONTENT_W, y);
          y += 14;
        } else if (token.type === "space") {
          // noop
        }
      }
      y += 10;
    }

    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);

      // Soft background watermark (diagonal, pastel).
      doc.setFontSize(54);
      setStyle(true, false);
      doc.setTextColor(232, 235, 246);
      doc.text(WATERMARK_TEXT, PAGE_W / 2, PAGE_H / 2, { angle: 32, align: "center", baseline: "middle" });

      // Branded header.
      doc.setFillColor(INDIGO_R, INDIGO_G, INDIGO_B);
      doc.rect(0, 0, PAGE_W, 3, "F");
      doc.setFontSize(10);
      setStyle(true, false);
      doc.setTextColor(INDIGO_R, INDIGO_G, INDIGO_B);
      doc.text("AI Role Agents portal", MARGIN_L, 30);
      doc.setFontSize(9);
      setStyle(false, false);
      doc.setTextColor(MUTED_R, MUTED_G, MUTED_B);
      const rightText = agentName + "  •  " + dateStr;
      const rw = textWidth(rightText, 9);
      doc.text(rightText, PAGE_W - MARGIN_R - rw, 30);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.line(MARGIN_L, 44, PAGE_W - MARGIN_R, 44);

      // Branded footer.
      const footerY = PAGE_H - 36;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.line(MARGIN_L, footerY, PAGE_W - MARGIN_R, footerY);
      doc.setFontSize(9);
      setStyle(false, false);
      doc.setTextColor(MUTED_R, MUTED_G, MUTED_B);
      doc.text("Page " + p + " of " + totalPages, MARGIN_L, PAGE_H - 24);
      const credit = FOOTER_TEXT;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      const cw = textWidth(credit, 9);
      doc.text(credit, PAGE_W - MARGIN_R - cw, PAGE_H - 24);
    }

    setStyle(false, false);
    doc.setTextColor(TEXT_R, TEXT_G, TEXT_B);
    doc.save(safeName + "_conversation.pdf");
  } catch (err) {
    console.error("[downloadConversationPdf] vector-PDF path failed, using text fallback:", err);
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
        const role = message.role === "user" ? "User" : agentName;
        fallback.text(role + ":", fMargin, fy);
        fy += 12;
        const lines = fallback.splitTextToSize(String(message.rendered || message.content || ""), CONTENT_W);
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
      fallback.save(safeName + "_conversation.pdf");
    } catch (fbErr) {
      console.error("[downloadConversationPdf] text fallback failed:", fbErr);
    }
  }
}
