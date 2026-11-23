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

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "0";
  host.style.top = "0";
  host.style.width = "0";
  host.style.height = "0";
  host.style.overflow = "hidden";
  host.style.pointerEvents = "none";
  host.style.zIndex = "-1";
  document.body.appendChild(host);

  const wrapper = document.createElement("div");
  wrapper.className = "pdf-export-root";
  // Off-screen export wrapper: laid out normally inside the zero-size,
  // overflow-hidden host so appending/removing it causes zero layout shift,
  // scroll jump, or screen bump. (position: fixed would break out of the
  // clipped host and paint at the viewport's top-left.)
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

  host.appendChild(wrapper);

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
      onclone: (clonedDoc) => {
        // Neutralize Tailwind oklch() / oklab() / color-mix() computed colors so
        // html2canvas never throws "Attempting to parse an unsupported color
        // function". Safe inline colors are forced on every cloned node (plus a
        // high-priority !important sheet) so resolved colors never fall back to
        // an unsupported function.
        const SAFE = {
          color: "#0f172a",
          backgroundColor: "#ffffff",
          borderColor: "#cbd5e1",
          borderTopColor: "#cbd5e1",
          borderRightColor: "#cbd5e1",
          borderBottomColor: "#cbd5e1",
          borderLeftColor: "#cbd5e1",
          outlineColor: "#cbd5e1",
          textDecorationColor: "#0f172a",
        };
        const colorProps = Object.keys(SAFE);
        const walker = clonedDoc.createTreeWalker(clonedDoc.body, NodeFilter.SHOW_ELEMENT);
        while (walker.nextNode()) {
          const el = walker.currentNode;
          const style = el.style;
          // Force safe inline colors on every cloned node so html2canvas resolves
          // a safe hex value regardless of what the stylesheets declare.
          for (const prop of colorProps) {
            style[prop] = SAFE[prop];
          }
          // Also strip unsupported colors from SVG fill/stroke attributes.
          if (
            el.tagName === "svg" ||
            el.tagName.match(/^(path|circle|rect|line|polyline|polygon)$/i)
          ) {
            for (const attr of ["fill", "stroke"]) {
              const val = el.getAttribute(attr);
              if (val && (val.includes("oklch") || val.includes("oklab") || val.includes("color-mix"))) {
                el.setAttribute(attr, SAFE.color);
              }
            }
          }
        }
        // Safety-net !important override stylesheet on the cloned document.
        const override = clonedDoc.createElement("style");
        override.textContent =
          "* { color: #0f172a !important; background-color: #ffffff !important; border-color: #cbd5e1 !important; }";
        clonedDoc.head.appendChild(override);
      },
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

    const safeName = (agent.title || agent.role).replace(/[^a-z0-9]/gi, "_").toLowerCase();
    pdf.save(safeName + "_conversation.pdf");
  } catch (err) {
    console.error("[downloadConversationPdf] Error during PDF generation:", err);
  } finally {
    document.body.removeChild(host);
  }

}

/**
 * Draw a crisp diagonal watermark across the page.
 * Rotated 32° in light pastel indigo-slate (218, 222, 245) so foreground text
 * stays 100% readable. GState is avoided for jsPDF build compatibility.
 */
function drawWatermark(pdf, pageWidth, pageHeight, text) {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(40);
  // Light pastel indigo-slate watermark. GState is avoided entirely so this works
  // in every jsPDF build (the previous addGState({ opacity }) call passed the
  // opacity object as the `key` argument, leaving gState undefined and throwing
  // when addGState tried to set `gState.id`).
  pdf.setTextColor(218, 222, 245);

  const cx = pageWidth / 2;
  const cy = pageHeight / 2;

  // Rotate the text about the page centre for a diagonal watermark.
  pdf.text(text, cx, cy, { angle: 32, align: "center", baseline: "middle" });
}
