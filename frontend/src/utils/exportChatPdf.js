import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { renderMermaidDiagrams } from "./markdownRenderer.js";

const INDIGO_R = 79;
const INDIGO_G = 70;
const INDIGO_B = 229;
const WATERMARK_TEXT = "AI Role Agents Portal • Official Output";
const FOOTER_TEXT = "AI Role Agents built by Mujeeb Mohammed";

export async function downloadConversationPdf(agent, conversation) {
  if (!agent || !conversation || conversation.length === 0) return;

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();   // 210 mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm
  const margin = 15;
  const usableWidth = pageWidth - margin * 2;            // 180 mm
  const usableHeight = pageHeight - margin * 2;          // 267 mm

  // Header/footer geometry reserved inside the printable area.
  const headerHeight = 22;
  const footerHeight = 14;
  const contentHeight = usableHeight - headerHeight - footerHeight - 8;

  const wrapper = document.createElement("div");
  wrapper.className = "pdf-export-root";
  wrapper.style.position = "fixed";
  wrapper.style.left = "-9999px";
  wrapper.style.top = "0";
  wrapper.style.width = "800px";
  wrapper.style.background = "#ffffff";
  wrapper.style.color = "#0f172a";
  wrapper.style.fontFamily = "Inter, system-ui, -apple-system, sans-serif";
  wrapper.style.fontSize = "13.5px";
  wrapper.style.lineHeight = "1.55";
  wrapper.style.overflow = "visible";
  wrapper.style.maxHeight = "none";
  wrapper.style.padding = "0";
  wrapper.style.textAlign = "left";

  const style = document.createElement("style");
  const css = [
    ".pdf-export-root { font-size: 13.5px; line-height: 1.55; color: #0f172a; }",
    "table { border: 1px solid #0f172a; border-collapse: collapse; width: 100%; }",
    "th, td { border: 1px solid #0f172a; padding: 7px 10px; text-align: left; }",
    "h1, h2, h3, h4 { color: #0f172a !important; border: none !important; text-decoration: none !important; margin: 10px 0 6px !important; line-height: 1.55 !important; break-inside: avoid; }",
    "p { margin: 6px 0; line-height: 1.55 !important; break-inside: avoid; }",
    "li { margin: 3px 0; line-height: 1.55 !important; break-inside: avoid; }",
    "ul, ol { margin: 6px 0 6px 20px; break-inside: avoid; }",
    "blockquote { border-left: 3px solid #0f172a; padding-left: 10px; margin: 8px 0; break-inside: avoid; }",
    "pre { margin: 6px 0; line-height: 1.55 !important; break-inside: avoid; }",
    ".mermaid-viewport { width: 100% !important; overflow: visible !important; margin: 8px 0; }",
    ".mermaid-viewport svg { display: block; margin: 0 auto; }",
    ".mermaid-rendered, .video-wrapper { break-inside: avoid; margin: 8px 0; }",
    ".mermaid-zoom-controls { display: none !important; }",
    ".message-block { margin-bottom: 14px; }",
    ".role-label { font-size: 9px; font-weight: bold; margin: 0 0 2px; }",
    ".video-wrapper { border: 1px solid #0f172a; background: #f5f5f5; padding: 10px; margin: 8px 0; break-inside: avoid; }",
  ];
  style.textContent = css.join("\n");
  wrapper.appendChild(style);

  for (const message of conversation) {
    const isUser = message.role === "user";
    const block = document.createElement("div");
    block.className = "message-block";
    block.style.marginBottom = "14px";

    const label = document.createElement("div");
    label.className = "role-label";
    label.style.color = isUser ? "#003c8f" : "#141414";
    label.textContent = isUser ? "User" : "Agent";
    block.appendChild(label);

    const contentDiv = document.createElement("div");
    contentDiv.innerHTML = message.rendered || message.content || "";
    contentDiv.querySelectorAll('iframe[src*="youtube.com/embed"]').forEach((iframe) => {
      const card = document.createElement("div");
      card.className = "video-wrapper";
      const title = document.createElement("div");
      title.style.fontWeight = "bold";
      title.style.marginBottom = "4px";
      title.textContent = "Video Reference";
      const url = document.createElement("div");
      url.style.fontSize = "11px";
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
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Scale every rendered Mermaid SVG to a readable width before capture.
    wrapper.querySelectorAll(".mermaid-rendered svg").forEach((svg) => {
      let vbW, vbH;
      const viewBox = svg.getAttribute("viewBox");
      if (viewBox) {
        const parts = viewBox.trim().split(/\s+/);
        vbW = parseFloat(parts[2]);
        vbH = parseFloat(parts[3]);
      }
      if (!vbW || !vbH) {
        const bb = svg.getBBox();
        vbW = bb.width || 520;
        vbH = bb.height || 300;
      }
      if (!vbW || !vbH || !isFinite(vbW) || !isFinite(vbH)) { vbW = 520; vbH = 300; }
      const targetW = Math.min(730, Math.max(580, vbW * 1.35));
      let targetH = Math.round(targetW * (vbH / vbW));
      const maxHeight = 620;
      if (targetH > maxHeight) {
        targetH = maxHeight;
      }
      svg.setAttribute("width", targetW);
      svg.setAttribute("height", targetH);
      svg.style.width = targetW + "px";
      svg.style.height = targetH + "px";
      svg.style.maxWidth = "none";
    });

    // Break-free pagination: reserve space above any atomic block that would
    // cross a page boundary, measured in the 800px-wide off-screen container.
    const pageSliceCssPx = contentHeight * 800 / usableWidth;
    const scrollY = window.scrollY || 0;
    const leafSelector =
      "h1, h2, h3, h4, p, li, tr, table, blockquote, pre, .mermaid-rendered, .video-wrapper";
    wrapper.querySelectorAll(leafSelector).forEach((el) => {
      const r = el.getBoundingClientRect();
      const top = r.top + scrollY;
      const bottom = r.bottom + scrollY;
      const height = bottom - top;
      const pageTop = Math.floor(top / pageSliceCssPx);
      const pageBottom = Math.floor(bottom / pageSliceCssPx);
      if (pageTop !== pageBottom && height < pageSliceCssPx * 0.85) {
        const remaining = pageSliceCssPx - (top % pageSliceCssPx);
        el.style.marginTop = Math.max(0, remaining) + "px";
      }
    });

    const canvas = await html2canvas(wrapper, {
      windowWidth: 800,
      scale: 2,
      logging: false,
      useCORS: true,
    });

    const scaleFactor = usableWidth / canvas.width; // mm per canvas px
    const pageSlicePx = Math.floor(contentHeight / scaleFactor); // canvas px per content page

    let sliceTop = 0;
    let pageCount = 0;
    while (sliceTop < canvas.height) {
      if (pageCount > 0) pdf.addPage();
      pageCount += 1;
      const pageNum = pageCount;

      const srcH = Math.min(pageSlicePx, canvas.height - sliceTop);
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = srcH;
      const ctx = sliceCanvas.getContext("2d");
      ctx.drawImage(canvas, 0, sliceTop, canvas.width, srcH, 0, 0, canvas.width, srcH);

      const contentY = margin + headerHeight;
      const sliceRenderHeight = srcH * scaleFactor;
      pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, contentY, usableWidth, sliceRenderHeight);

      // ---- Branded page header ----
      pdf.setFillColor(INDIGO_R, INDIGO_G, INDIGO_B);
      pdf.rect(margin, margin, usableWidth, 3, "F"); // indigo accent bar
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(INDIGO_R, INDIGO_G, INDIGO_B);
      pdf.text("AI Role Agents portal", margin, margin + 9);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      const dateStr = new Date().toLocaleDateString();
      const rightText = (agent.title || agent.role || "Conversation") + "  •  " + dateStr;
      const rightWidth = pdf.getStringUnitWidth(rightText) * 9 / pdf.internal.scaleFactor;
      pdf.text(rightText, pageWidth - margin - rightWidth, margin + 9);
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(margin, margin + 13, pageWidth - margin, margin + 13);

      // ---- Diagonal background watermark ----
      drawWatermark(pdf, pageWidth, pageHeight, WATERMARK_TEXT);

      // ---- Branded page footer ----
      const footerY = pageHeight - margin - 2;
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(margin, footerY, pageWidth - margin, footerY);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text("Page " + pageNum + " of " + pageCount, margin, pageHeight - margin + 6);
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(8);
      const builtByWidth = pdf.getStringUnitWidth(FOOTER_TEXT) * 8 / pdf.internal.scaleFactor;
      pdf.text(FOOTER_TEXT, pageWidth - margin - builtByWidth, pageHeight - margin + 6);

      sliceTop += pageSlicePx;
    }
  } finally {
    document.body.removeChild(wrapper);
  }

  const safeName = (agent.title || agent.role).replace(/[^a-z0-9]/gi, "_").toLowerCase();
  pdf.save(safeName + "_conversation.pdf");
}

/**
 * Draw a crisp, semi-transparent diagonal watermark across the page.
 * Rotated -32° in rgba(79, 70, 229, 0.065) so foreground text stays 100% readable.
 */
function drawWatermark(pdf, pageWidth, pageHeight, text) {
  const gState = pdf.addGState({ opacity: 0.065 });
  pdf.setGState(gState);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(40);
  pdf.setTextColor(79, 70, 229);

  const angle = (-32 * Math.PI) / 180;
  const cx = pageWidth / 2;
  const cy = pageHeight / 2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const internal = pdf.internal;
  const fontObj = internal.getFont ? internal.getFont("helvetica", "normal") : null;
  const fontRef = fontObj && fontObj.id ? "/" + fontObj.id : "/F1";

  const escaped = String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

  // Save graphics state, rotate about page center, draw centered watermark, restore.
  internal.write(
    "q ",
    "1 0 0 1 " + cx.toFixed(2) + " " + cy.toFixed(2) + " cm ",
    cos.toFixed(4) + " " + sin.toFixed(4) + " " + (-sin).toFixed(4) + " " + cos.toFixed(4) + " 0 0 cm ",
    "BT " + fontRef + " 40 Tf 1 0 0 1 0 0 Tm (" + escaped + ") Tj ET ",
    "Q "
  );
}
