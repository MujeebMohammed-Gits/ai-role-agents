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
  // scroll jump, or screen bump.
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
    // Uniform typography: fixed px font sizes so there is zero font-size
    // disparity between headers, body text, and table cells across pages.
    "h1 { font-size: 18px !important; }",
    "h2 { font-size: 15px !important; margin-top: 16px !important; margin-bottom: 6px !important; }",
    "h3 { font-size: 13.5px !important; }",
    "h4 { font-size: 13px !important; }",
    "p, li, td, th { font-size: 12px !important; line-height: 1.55 !important; }",
    "h1, h2, h3, h4 { color: #0f172a !important; border: none !important; text-decoration: none !important; margin: 10px 0 6px !important; line-height: 1.55 !important; break-inside: avoid; }",
    "p { margin: 6px 0; line-height: 1.55 !important; break-inside: avoid; }",
    "li { margin: 3px 0; line-height: 1.55 !important; break-inside: avoid; }",
    "ul, ol { margin: 6px 0 6px 20px; break-inside: avoid; }",
    "blockquote { border-left: 3px solid #0f172a; padding-left: 10px; margin: 8px 0; break-inside: avoid; }",
    "pre { margin: 6px 0; line-height: 1.55 !important; break-inside: avoid; }",
    ".mermaid-viewport { width: 100% !important; overflow: visible !important; margin: 8px 0; }",
    ".mermaid-viewport svg { display: block; margin: 0 auto; }",
    ".mermaid-rendered { break-inside: avoid; margin: 8px 0; }",
    ".mermaid-zoom-controls { display: none !important; }",
    ".message-block { margin-bottom: 14px; }",
    ".role-label { font-size: 9px; font-weight: bold; margin: 0 0 2px; }",
    ".video-link-card { border: 1px solid #cbd5e1; background: #f1f5f9; padding: 10px 12px; margin: 8px 0; border-radius: 6px; break-inside: avoid; font-size: 12px; line-height: 1.55; }",
    ".video-link-card a { color: #2563eb; text-decoration: underline; word-break: break-all; }",
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
    block.appendChild(contentDiv);
    wrapper.appendChild(block);
  }

  host.appendChild(wrapper);

  try {
    await renderMermaidDiagrams(wrapper);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const canvas = await html2canvas(wrapper, {
      windowWidth: 800,
      backgroundColor: null,
      scale: 2,
      logging: false,
      useCORS: true,
      onclone: (clonedDoc) => {
        // 1. Size every rendered Mermaid SVG full-size and razor-sharp using its
        // viewBox (pure SVG labels, htmlLabels: false, so html2canvas can
        // rasterize them instead of leaving blank boxes).
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
          const targetW = 700;
          const targetH = Math.round(targetW * (vbH / vbW));
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

        // 2. Replace YouTube embed iframes with compact, always-visible
        // clickable link cards so the video stays reachable when an embed is
        // blocked or unplayable (rather than a 315px blank box).
        clonedDoc.querySelectorAll('.video-wrapper iframe[src*="youtube.com/embed"]').forEach((iframe) => {
          const match = iframe.src.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
          const videoId = match ? match[1] : "";
          const watchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : iframe.src;
          const card = clonedDoc.createElement("div");
          card.className = "video-link-card";
          const link = clonedDoc.createElement("a");
          link.href = watchUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = "Watch Official Video on YouTube: " + watchUrl;
          card.appendChild(link);
          iframe.replaceWith(card);
        });

        // 3. Neutralize unsupported Tailwind colors (oklch/oklab/color-mix) so
        // html2canvas never throws "Attempting to parse an unsupported color
        // function". Safe inline colors are forced on every cloned node.
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

      // ---- Diagonal background watermark (drawn first, behind content) ----
      drawWatermark(pdf, pageWidth, pageHeight, WATERMARK_TEXT);

      const contentY = margin + headerHeight;
      const sliceRenderHeight = srcH * scaleFactor;
      pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, contentY, usableWidth, sliceRenderHeight);

      // ---- Break-free pagination: nudge any block within 18px of a page edge
      // onto the next page so nothing is clipped at page seams. The safe content
      // region (starts at margin+headerHeight ~ 37mm > 58pt top safe zone, ends
      // well above the 48pt bottom safe zone) already honors marginTop/
      // marginBottom padding; this pass catches blocks that still hug a page
      // boundary. ----
      const pageSliceCssPx = contentHeight * 800 / usableWidth;
      const scrollY = window.scrollY || 0;
      const BOUNDARY_NUDGE_PX = 18;
      const leafSelector =
        "h1, h2, h3, h4, p, li, tr, blockquote, pre, .mermaid-rendered, .video-link-card";
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
 * Draw a visible soft diagonal watermark across the page.
 * Draws the "AI Role Agents" watermark rotated 32° across the centre of every
 * page using jsPDF GState({ opacity: 0.09 }) so it is clearly visible in the
 * background while keeping all foreground text sharp and readable. Falls back
 * to setTextColor(228, 232, 245) when GState is unavailable.
 */
function drawWatermark(pdf, pageWidth, pageHeight, text) {
  const cx = pageWidth / 2;
  const cy = pageHeight / 2;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(40);
  let gstate = null;
  try {
    gstate = pdf.addGState({ opacity: 0.09 });
    pdf.setGState(gstate);
  } catch (e) {
    pdf.setTextColor(228, 232, 245);
  }
  pdf.text(text, cx, cy, { angle: 32, align: "center", baseline: "middle" });
  // Restore full opacity so page content drawn afterward is not faded.
  try {
    pdf.setGState(pdf.addGState({ opacity: 1 }));
  } catch (e) {
    pdf.setTextColor(0, 0, 0);
  }
}
