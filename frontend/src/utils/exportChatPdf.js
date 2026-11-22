import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { renderMermaidDiagrams } from "./markdownRenderer.js";

export async function downloadConversationPdf(agent, conversation) {
  if (!agent || !conversation || conversation.length === 0) return;

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

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
  const css = [];
  css.push(".pdf-export-root { font-size: 13.5px; line-height: 1.55; color: #0f172a; }");
  css.push("table { border: 1px solid #0f172a; border-collapse: collapse; width: 100%; }");
  css.push("th, td { border: 1px solid #0f172a; padding: 7px 10px; text-align: left; }");
  css.push("h1, h2, h3, h4 { color: #0f172a !important; border: none !important; text-decoration: none !important; margin: 10px 0 6px !important; line-height: 1.55 !important; break-inside: avoid; }");
  css.push("p { margin: 6px 0; line-height: 1.55 !important; break-inside: avoid; }");
  css.push("li { margin: 3px 0; line-height: 1.55 !important; break-inside: avoid; }");
  css.push("ul, ol { margin: 6px 0 6px 20px; break-inside: avoid; }");
  css.push("blockquote { border-left: 3px solid #0f172a; padding-left: 10px; margin: 8px 0; break-inside: avoid; }");
  css.push("pre { margin: 6px 0; line-height: 1.55 !important; break-inside: avoid; }");
  css.push(".mermaid-viewport { width: 100% !important; overflow: visible !important; margin: 8px 0; }");
  css.push(".mermaid-viewport svg { display: block; margin: 0 auto; }");
  css.push(".mermaid-rendered, .video-wrapper { break-inside: avoid; margin: 8px 0; }");
  css.push(".mermaid-zoom-controls { display: none !important; }");
  css.push(".message-block { margin-bottom: 14px; }");
  css.push(".role-label { font-size: 9px; font-weight: bold; margin: 0 0 2px; }");
  css.push(".video-wrapper { border: 1px solid #0f172a; background: #f5f5f5; padding: 10px; margin: 8px 0; break-inside: avoid; }");
  style.textContent = css.join("\n");
  wrapper.appendChild(style);

  const header = document.createElement("div");
  header.style.fontSize = "18px";
  header.style.fontWeight = "bold";
  header.style.marginBottom = "6px";
  header.textContent = agent.title || agent.role || "Conversation";
  wrapper.appendChild(header);

  const meta = document.createElement("div");
  meta.style.fontSize = "11px";
  meta.style.color = "#64748b";
  meta.style.marginBottom = "12px";
  meta.textContent = "Role: " + agent.role + "   Exported: " + new Date().toLocaleString();
  wrapper.appendChild(meta);

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
    contentDiv.querySelectorAll("iframe[src*=\"youtube.com/embed\"]").forEach((iframe) => {
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

    wrapper.querySelectorAll(".mermaid-rendered, .mermaid-placeholder").forEach((el) => {
      const svg = el.querySelector("svg") || (el.tagName === "SVG" ? el : null);
      if (!svg) return;
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
      const targetW = Math.min(736, Math.max(520, vbW));
      const targetH = Math.round(targetW * (vbH / vbW));
      svg.setAttribute("width", targetW);
      svg.setAttribute("height", targetH);
      svg.style.width = targetW + "px";
      svg.style.height = targetH + "px";
      svg.style.maxWidth = "none";
    });

    wrapper.querySelectorAll(".mermaid-zoom-controls").forEach((el) => {
      el.style.display = "none";
    });

    const pageSliceCssPx = usableHeight * 800 / usableWidth;
    const scrollY = window.scrollY || 0;
    const leafSelector = "h1, h2, h3, h4, p, li, tr, pre, blockquote, .mermaid-rendered, .video-wrapper";
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

    const scaleFactor = usableWidth / canvas.width;
    const pageSlicePx = Math.floor(usableHeight / scaleFactor);

    let sliceTop = 0;
    let pageCount = 0;
    while (sliceTop < canvas.height) {
      if (pageCount > 0) pdf.addPage();
      const srcH = Math.min(pageSlicePx, canvas.height - sliceTop);
      const sliceRenderHeight = srcH * scaleFactor;

      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = srcH;
      const ctx = sliceCanvas.getContext("2d");
      ctx.drawImage(canvas, 0, sliceTop, canvas.width, srcH, 0, 0, canvas.width, srcH);

      pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, margin, usableWidth, sliceRenderHeight);
      sliceTop += pageSlicePx;
      pageCount += 1;
    }
  } finally {
    document.body.removeChild(wrapper);
  }

  const safeName = (agent.title || agent.role).replace(/[^a-z0-9]/gi, "_").toLowerCase();
  pdf.save(safeName + "_conversation.pdf");
}
