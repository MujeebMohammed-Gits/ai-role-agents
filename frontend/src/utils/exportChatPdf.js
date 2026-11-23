import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { renderMermaidDiagrams } from "./markdownRenderer.js";

const INDIGO_R = 79;
const INDIGO_G = 70;
const INDIGO_B = 229;
const WATERMARK_TEXT = "AI Role Agents";
const FOOTER_TEXT = "AI Role Agents built by Mujeeb Mohammed";

export async function downloadConversationPdf(agent, conversation) {
  if (!agent || !conversation || conversation.length === 0) return;

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();   // 210 mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm
  const margin = 15;
  const usableWidth = pageWidth - margin * 2;            // 180 mm
  const usableHeight = pageHeight - margin * 2;          // 267 mm

  const headerHeight = 22;
  const footerHeight = 14;
  const contentHeight = usableHeight - headerHeight - footerHeight - 8; // 223 mm

  // Save scroll state so the export can restore it exactly.
  const prevScrollY = window.scrollY;
  const prevOverflowAnchor = document.documentElement.style.overflowAnchor;
  document.documentElement.style.overflowAnchor = 'none';
  const chatEl = document.querySelector('[data-chat-thread="true"]');
  const prevChatScroll = chatEl ? chatEl.scrollTop : 0;

  // Zero-bump isolation: render everything inside a hidden off-screen iframe so the
  // live document's layout / scroll metrics never change when Download PDF is clicked.
  const iframe = document.createElement("iframe");
  iframe.style = "position:fixed;left:0;top:0;width:0;height:0;border:0;visibility:hidden;pointer-events:none;";
  document.body.appendChild(iframe);

  let pdfSaved = false;
  try {
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(buildExportDocument(conversation));
    doc.close();

    const wrapper = doc.querySelector(".pdf-export-root");

    // Mermaid must render in the main window (where the `mermaid` module is live); the
    // rendered SVG is then copied back into the iframe placeholders.
    await renderMermaidIntoIframe(wrapper);

    await new Promise((resolve) => setTimeout(resolve, 300));

    const canvas = await html2canvas(doc.body, {
      windowWidth: 800,
      backgroundColor: null,
      scale: 2,
      logging: false,
      useCORS: true,
      onclone: (clonedDoc) => {
        clonedDoc.querySelectorAll("style, link[rel=stylesheet]").forEach((el) => el.remove());

        // Defect 1: hide Mermaid zoom controls / toolbar so they never print inside the PDF.
        clonedDoc.querySelectorAll(".mermaid-toolbar, .mermaid-zoom-controls").forEach((el) => el.remove());

        // Defect 2: size every Mermaid SVG proportionally to fill the readable width,
        // capped so the whole diagram always fits intact on a single page.
        clonedDoc.querySelectorAll(".mermaid-rendered svg").forEach((svg) => {
          let vbW, vbH;
          const viewBox = svg.getAttribute("viewBox");
          if (viewBox) {
            const parts = viewBox.trim().split(/\s+/);
            vbW = parseFloat(parts[2]);
            vbH = parseFloat(parts[3]);
          }
          if (!vbW || !vbH) {
            try {
              const bb = svg.getBBox();
              vbW = bb.width || 700;
              vbH = bb.height || 300;
            } catch (e) {
              vbW = 700;
              vbH = 405;
            }
          }
          if (!vbW || !vbH || !isFinite(vbW) || !isFinite(vbH)) {
            vbW = 700;
            vbH = 405;
          }
          const fitScale = Math.min(680 / vbW, 460 / vbH);
          const targetW = Math.round(vbW * fitScale);
          const targetH = Math.round(vbH * fitScale);
          svg.setAttribute("width", targetW);
          svg.setAttribute("height", targetH);
          svg.removeAttribute("style");
          svg.style.width = targetW + "px";
          svg.style.height = targetH + "px";
          svg.style.maxWidth = "none";
          const container = svg.closest(".mermaid-rendered") || svg.parentElement;
          if (container) {
            container.style.width = targetW + "px";
            container.style.height = targetH + "px";
            container.style.maxWidth = "none";
          }
        });

        // Replace YouTube embed iframes with clickable link cards.
        clonedDoc.querySelectorAll('.video-wrapper iframe[src*="youtube.com/embed"]').forEach((iframeEl) => {
          const match = iframeEl.src.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
          const videoId = match ? match[1] : "";
          const watchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : iframeEl.src;
          const card = clonedDoc.createElement("div");
          card.className = "video-link-card";
          const link = clonedDoc.createElement("a");
          link.href = watchUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = "Watch Official Video on YouTube: " + watchUrl;
          card.appendChild(link);
          iframeEl.replaceWith(card);
        });

        // Neutralize unsupported Tailwind colors (oklch / oklab / color-mix).
        const SAFE = {
          color: "#0f172a",
          backgroundColor: "transparent",
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
          for (const prop of colorProps) {
            style[prop] = SAFE[prop];
          }
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
        const override = clonedDoc.createElement("style");
        override.textContent =
          "* { color: #0f172a !important; border-color: #cbd5e1 !important; }" +
          ".pdf-export-root { background: transparent !important; }" +
          "table th, td { background-color: #ffffff !important; }";
        clonedDoc.head.appendChild(override);
      },
    });

    const scaleFactor = usableWidth / canvas.width;
    // Defect 3: 32px bottom safety margin so list items / table rows never slice across pages.
    const effectiveSlicePx = Math.floor(contentHeight / scaleFactor) - 32;

    let sliceTop = 0;
    const slices = [];
    while (sliceTop < canvas.height) {
      const srcH = Math.min(effectiveSlicePx, canvas.height - sliceTop);
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = srcH;
      const ctx = sliceCanvas.getContext("2d");
      ctx.drawImage(canvas, 0, sliceTop, canvas.width, srcH, 0, 0, canvas.width, srcH);
      if (hasMeaningfulContent(sliceCanvas, 35)) {
        slices.push({ top: sliceTop, h: srcH });
      }
      sliceTop += effectiveSlicePx;
    }
    const totalPages = slices.length;
    const pageSliceCssPx = contentHeight * 800 / usableWidth;
    const scrollY = window.scrollY || 0;
    const BOUNDARY_NUDGE_PX = 18;
    const leafSelector =
      "h1, h2, h3, h4, p, li, tr, blockquote, pre, .mermaid-rendered, .video-link-card";

    slices.forEach((slice, index) => {
      const pageNum = index + 1;
      if (pageNum > 1) pdf.addPage();
      const srcH = slice.h;
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = srcH;
      const ctx = sliceCanvas.getContext("2d");
      ctx.drawImage(canvas, 0, slice.top, canvas.width, srcH, 0, 0, canvas.width, srcH);

      if (!hasMeaningfulContent(sliceCanvas, 35)) {
        return;
      }

      drawWatermark(pdf, pageWidth, pageHeight, WATERMARK_TEXT);

      const contentY = margin + headerHeight;
      const sliceRenderHeight = srcH * scaleFactor;
      pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, contentY, usableWidth, sliceRenderHeight);

      wrapper.querySelectorAll(leafSelector).forEach((el) => {
        const r = el.getBoundingClientRect();
        const top = r.top + scrollY;
        const bottom = r.bottom + scrollY;
        const height = bottom - top;
        const pageIdx = Math.floor(top / pageSliceCssPx);
        const pageEnd = (pageIdx + 1) * pageSliceCssPx;
        const distToEnd = pageEnd - bottom;
        const crosses = pageIdx !== Math.floor(bottom / pageSliceCssPx);
        if (height < pageSliceCssPx && (crosses || (distToEnd > 0 && distToEnd < BOUNDARY_NUDGE_PX))) {
          const remaining = pageSliceCssPx - (top % pageSliceCssPx);
          el.style.marginTop = Math.max(0, remaining) + "px";
        }
      });

      // Defect 4: branded header preserved.
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

      // Defect 4: branded footer preserved ("Page X of Y" + italic credit).
      const footerY = pageHeight - margin - 2;
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(margin, footerY, pageWidth - margin, footerY);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text("Page " + pageNum + " of " + totalPages, margin, pageHeight - margin + 6);
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(8);
      const builtByWidth = pdf.getStringUnitWidth(FOOTER_TEXT) * 8 / pdf.internal.scaleFactor;
      pdf.text(FOOTER_TEXT, pageWidth - margin - builtByWidth, pageHeight - margin + 6);
    });

    const safeName = (agent.title || agent.role).replace(/[^a-z0-9]/gi, "_").toLowerCase();
    pdf.save(safeName + "_conversation.pdf");
    pdfSaved = true;
  } catch (err) {
    console.error("[downloadConversationPdf] iframe path failed, using text-PDF fallback:", err);
    if (!pdfSaved) {
      try {
        const safeName = (agent.title || agent.role).replace(/[^a-z0-9]/gi, "_").toLowerCase();
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.setTextColor(15, 23, 42);
        let y = margin;
        pdf.text("AI Role Agents portal", margin, y);
        y += 10;
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text("Conversation Export", margin, y);
        y += 16;
        pdf.setFontSize(11);
        pdf.setTextColor(15, 23, 42);
        for (const message of conversation) {
          const role = message.role === "user" ? "User" : "Agent";
          const text = String(message.rendered || message.content || "");
          pdf.text(role + ":", margin, y);
          y += 7;
          const lines = pdf.splitTextToSize(text, usableWidth);
          for (const line of lines) {
            if (y > pageHeight - margin - footerHeight) {
              pdf.addPage();
              y = margin;
            }
            pdf.text(line, margin, y);
            y += 6;
          }
          y += 6;
        }
        pdf.save(safeName + "_conversation.pdf");
        pdfSaved = true;
      } catch (fbErr) {
        console.error("[downloadConversationPdf] text-PDF fallback failed:", fbErr);
        try {
          const safeName = (agent.title || agent.role).replace(/[^a-z0-9]/gi, "_").toLowerCase();
          pdf.save(safeName + "_conversation.pdf");
          pdfSaved = true;
        } catch {}
      }
    }
  } finally {
    document.body.removeChild(iframe);
    document.documentElement.style.overflowAnchor = prevOverflowAnchor;
    window.scrollTo(0, prevScrollY);
    if (chatEl) {
      chatEl.scrollTop = prevChatScroll;
    }
  }
}

/**
 * Build a self-contained HTML document rendered inside the hidden iframe.
 */
function buildExportDocument(conversation) {
  const style = [
    ".pdf-export-root { font-size: 13.5px; line-height: 1.55; color: #0f172a; background: transparent !important; overflow: visible !important; }",
    "table { border: 1px solid #0f172a; border-collapse: collapse; width: 100%; }",
    "th, td { border: 1px solid #0f172a; padding: 7px 10px; text-align: left; overflow: visible !important; padding-top: 2px !important; padding-bottom: 3px !important; line-height: 1.65 !important; }",
    "h1 { font-size: 18px !important; overflow: visible !important; padding-top: 2px !important; padding-bottom: 3px !important; line-height: 1.65 !important; }",
    "h2 { font-size: 16px !important; font-weight: 700 !important; margin: 18px 0 8px 0 !important; line-height: 1.65 !important; overflow: visible !important; padding-top: 2px !important; padding-bottom: 3px !important; }",
    "h3 { font-size: 14px !important; font-weight: 600 !important; margin: 14px 0 6px 0 !important; line-height: 1.65 !important; overflow: visible !important; padding-top: 2px !important; padding-bottom: 3px !important; }",
    "h4 { font-size: 13px !important; overflow: visible !important; padding-top: 2px !important; padding-bottom: 3px !important; line-height: 1.65 !important; }",
    "p, li, td, th { font-size: 12px !important; line-height: 1.55 !important; }",
    "h1, h2, h3, h4 { color: #0f172a !important; border: none !important; text-decoration: none !important; margin: 10px 0 6px !important; line-height: 1.55 !important; break-inside: avoid; }",
    "p { margin: 0 0 10px 0 !important; line-height: 1.65 !important; overflow: visible !important; padding-top: 2px !important; padding-bottom: 3px !important; font-size: 12.5px !important; }",
    "li { display: list-item !important; margin-bottom: 8px !important; line-height: 1.6 !important; padding: 2px 0 !important; font-size: 12.5px !important; position: static !important; }",
    "ul, ol { margin: 6px 0 12px 22px !important; padding: 0 !important; }",
    "blockquote { border-left: 3px solid #0f172a; padding-left: 10px; margin: 8px 0; break-inside: avoid; }",
    "pre { margin: 6px 0; line-height: 1.55 !important; break-inside: avoid; }",
    // Defect 2: full-width, single-page Mermaid diagrams (never tiny or split).
    ".mermaid-viewport { width: 100% !important; overflow: visible !important; margin: 8px 0; }",
    ".mermaid-viewport svg { display: block; margin: 0 auto; }",
    ".mermaid-rendered { display: block !important; width: 100% !important; clear: both !important; margin: 16px 0 !important; break-inside: avoid; }",
    ".message-block { margin-bottom: 14px; }",
    ".role-label { font-size: 9px; font-weight: bold; margin: 0 0 2px; }",
    ".video-link-card { border: 1px solid #cbd5e1; background: #f1f5f9; padding: 10px 12px; margin: 8px 0; border-radius: 6px; break-inside: avoid; font-size: 12px; line-height: 1.55; }",
    ".video-link-card a { color: #2563eb; text-decoration: underline; word-break: break-all; }",
  ].join("\n");

  let blocksHtml = "";
  for (const message of conversation) {
    const isUser = message.role === "user";
    blocksHtml +=
      '<div class="message-block" style="margin-bottom:14px;">' +
      '<div class="role-label" style="color:' +
      (isUser ? "#003c8f" : "#141414") +
      '">' +
      (isUser ? "User" : "Agent") +
      "</div>" +
      "<div>" +
      (message.rendered || message.content || "") +
      "</div>" +
      "</div>";
  }

  return (
    '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    style +
    "</style></head><body><div class=\"pdf-export-root\">" +
    blocksHtml +
    "</div></body></html>"
  );
}

/**
 * Render Mermaid diagrams inside `wrapper` (an iframe document) by rendering them in
 * the main window (where the `mermaid` module is available) and copying the rendered
 * SVG markup back into the matching iframe placeholders.
 */
async function renderMermaidIntoIframe(wrapper) {
  const placeholders = Array.from(wrapper.querySelectorAll('.mermaid-placeholder'));
  if (!placeholders.length) return;
  placeholders.forEach((ph, i) => ph.setAttribute('data-mermaid-index', String(i)));

  const temp = document.createElement('div');
  temp.style.cssText = 'position:fixed;left:-9999px;top:0;width:0;height:0;overflow:hidden;';
  document.body.appendChild(temp);
  try {
    placeholders.forEach((ph) => {
      temp.appendChild(ph.cloneNode(true));
    });
    renderMermaidDiagrams(temp);
    await new Promise((resolve) => {
      const poll = () => {
        const allDone = placeholders.every((ph) => {
          const idx = ph.getAttribute('data-mermaid-index');
          const rendered = temp.querySelector(`.mermaid-rendered[data-mermaid-index="${idx}"]`);
          const errored = temp.querySelector(`.mermaid-error-placeholder[data-mermaid-index="${idx}"]`);
          return !!rendered || !!errored;
        });
        if (allDone) resolve();
        else setTimeout(poll, 50);
      };
      poll();
    });
    placeholders.forEach((ph) => {
      const idx = ph.getAttribute('data-mermaid-index');
      const rendered = temp.querySelector(`.mermaid-rendered[data-mermaid-index="${idx}"]`);
      if (rendered) {
        ph.innerHTML = rendered.innerHTML;
        ph.classList.add('mermaid-rendered');
      }
    });
  } finally {
    document.body.removeChild(temp);
  }
}

function drawWatermark(pdf, pageWidth, pageHeight, text) {
  const cx = pageWidth / 2;
  const cy = pageHeight / 2;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(58);
  pdf.setTextColor(218, 222, 242);
  pdf.text(text, cx, cy, { angle: 32, align: "center", baseline: "middle" });
  // Restore full-contrast color so page content drawn afterward is sharp.
  pdf.setTextColor(0, 0, 0);
}

function hasMeaningfulContent(canvas, minHeightPx) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  let firstRow = -1;
  let lastRow = -1;
  for (let y = 0; y < height; y++) {
    let rowHasContent = false;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) {
        rowHasContent = true;
        break;
      }
    }
    if (rowHasContent) {
      if (firstRow === -1) firstRow = y;
      lastRow = y;
    }
  }
  if (firstRow === -1) return false;
  return (lastRow - firstRow + 1) >= minHeightPx;
}
