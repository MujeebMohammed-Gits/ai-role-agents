import { marked } from 'marked';
import DOMPurify from 'dompurify';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'Inter, system-ui, sans-serif',
  suppressErrorRendering: true,
});

marked.setOptions({
  breaks: true,
  gfm: true,
});

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizeMermaid(source) {
  let text = String(source || '').replace(/\r\n/g, '\n').trim();
  // Truncate if an unclosed fence swallowed subsequent Markdown headings or horizontal rules
  text = text.split(/\n(?:---|###\s)/)[0].trim();
  text = text.replace(
    /^(stateDiagram-v2|stateDiagram|flowchart\s+[A-Z]{2}|graph\s+[A-Z]{2}|sequenceDiagram|gantt|classDiagram|erDiagram)\s+(?!\n)/i,
    '$1\n'
  );
  const isStateDiagram = /^stateDiagram/i.test(text);

  return text.split('\n').map((rawLine) => {
    let line = rawLine.trim();
    if (!line) return '';
    if (isStateDiagram) {
      line = line.replace(/^state\s+"([^"]+)"\s*(-->|->)/, (_, sName, arrow) => {
        const cleanId = sName.replace(/[^A-Za-z0-9_]/g, '_');
        return `${cleanId} ${arrow}`;
      });
      line = line.replace(/\u2265/g, '>=').replace(/\u2264/g, '<=').replace(/\u2260/g, '!=').replace(/\u2192/g, 'to');
      line = line.replace(/^([^:\n]+:\s*)(.+)$/, (m, prefix, lbl) => {
        const cleanLbl = lbl.replace(/"/g, "'").trim();
        return `${prefix}${cleanLbl}`;
      });
      return line;
    }
    return line.replace(
      /([A-Za-z_][\w\-]*)\[(".*?"|'.*?'|[^\]]*)\]/g,
      (match, id, label) => {
        const isQuoted = /^["'].*['"]$/.test(label);
        if (isQuoted) {
          const inner = label.slice(1, -1).replace(/\\?"/g, "'");
          return `${id}["${inner}"]`;
        }
        const cleaned = label.replace(/\\?"/g, "'").replace(/\u2265/g, '>=').replace(/\u2264/g, '<=');
        const needsQuote = /[()\[\]{}|&;<>':\/]/.test(cleaned);
        return needsQuote ? `${id}["${cleaned}"]` : `${id}[${cleaned}]`;
      }
    );
  }).join('\n');
}

export function renderMarkdown(text) {
  if (!text) return '';

  // Strip raw OpenAI/NIM vector file-search artifacts
  let cleaned = String(text).replace(/\u3010[^\u3011]*\u3011/g, '');

  // Extract mermaid blocks into placeholder containers before Marked parses Markdown
  const mermaidBlocks = [];
  cleaned = cleaned.replace(/```mermaid\s*([\s\(\S\)]*?)```/gi, (_, code) => {
    const idx = mermaidBlocks.length;
    mermaidBlocks.push(sanitizeMermaid(code));
    return `\n\n@@MERMAID_BLOCK_${idx}@@\n\n`;
  });

  const rawHtml = marked.parse(cleaned);
  let safeHtml = DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ['target', 'rel', 'class', 'style'],
  });

  // Restore Mermaid placeholder containers with hidden .mermaid-source for renderMermaidDiagrams()
  safeHtml = safeHtml.replace(/(?:<p>)?@@MERMAID_BLOCK_(\d+)@@(?:<\/p>)?/g, (_, idxStr) => {
    const src = mermaidBlocks[Number(idxStr)] || '';
    const esc = escapeHtml(src);
    return (
      `<div class="mermaid-placeholder my-3">` +
        `<pre class="mermaid-source" style="display:none;">${esc}</pre>` +
        `<div class="mermaid-viewport" style="overflow-x:auto;overflow-y:auto;max-height:540px;width:100%;padding:12px;">` +
          `<pre class="text-xs text-slate-600">${esc}</pre>` +
        `</div>` +
      `</div>`
    );
  });

  // Convert verified YouTube links into responsive, playable 16:9 embedded video players
  safeHtml = safeHtml.replace(
    /<a[^>]+href="https?:\/\/(?:www\.)?(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})[^"]*"[^>]*>(.*?)<\/a>/gi,
    '<div class="video-wrapper my-4 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-xs">' +
      `<iframe class="w-full aspect-video" style="height:315px;width:100%;" src="https://www.youtube.com/embed/$1" title="$2" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>` +
      '<div class="px-3.5 py-2 text-xs font-medium text-slate-100 bg-slate-800 flex items-center justify-between"><span>Play: $2</span><span class="text-indigo-300">Official Reference</span></div>' +
    '</div>'
  );

  return safeHtml;
}

export function renderMermaidDiagrams(container) {
  if (!container) return;

  const placeholders = container.querySelectorAll('.mermaid-placeholder');
  placeholders.forEach((placeholder) => {
    if (placeholder.dataset.rendered === 'true') return;

    const sourceEl = placeholder.querySelector('.mermaid-source');
    if (!sourceEl) return;
    let source = sourceEl.textContent || '';
    if (!source.trim()) return;

    source = sanitizeMermaid(source);
    const id = 'mermaid-' + Math.random().toString(36).slice(2, 9);

    mermaid.render(id, source).then(({ svg }) => {
      placeholder.dataset.rendered = 'true';
      placeholder.innerHTML = `
        <div class="mermaid-toolbar">
          <span class="mermaid-badge">Workflow Diagram</span>
          <div class="mermaid-zoom-controls">
            <button type="button" class="mermaid-zoom-btn" data-action="out" title="Zoom out">-</button>
            <span class="mermaid-zoom-level">100%</span>
            <button type="button" class="mermaid-zoom-btn" data-action="in" title="Zoom in">+</button>
            <button type="button" class="mermaid-zoom-btn" data-action="reset" title="Reset zoom">Reset</button>
          </div>
        </div>
        <div class="mermaid-viewport" style="overflow-x:auto;overflow-y:auto;max-height:540px;width:100%;padding:12px;">
          <div class="mermaid-canvas">${svg}</div>
        </div>
      `;
      const svgEl = placeholder.querySelector('svg');
      const canvas = placeholder.querySelector('.mermaid-canvas');
      const label = placeholder.querySelector('.mermaid-zoom-level');
      if (svgEl) {
        svgEl.removeAttribute('style');
        svgEl.style.maxWidth = '100%';
        svgEl.style.maxHeight = '360px';
        svgEl.style.width = 'auto';
        svgEl.style.height = 'auto';
        svgEl.style.display = 'block';
        svgEl.style.margin = '0 auto';
      }
      let scale = 1.0;
      const applyZoom = () => {
        if (canvas) {
          canvas.style.transform = `scale(${scale})`;
          canvas.style.transformOrigin = 'top left';
        }
        if (label) label.textContent = `${Math.round(scale * 100)}%`;
      };
      placeholder.querySelectorAll('.mermaid-zoom-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const action = btn.getAttribute('data-action');
          if (action === 'in') scale = Math.min(2.2, +(scale + 0.2).toFixed(2));
          else if (action === 'out') scale = Math.max(0.5, +(scale - 0.2).toFixed(2));
          else scale = 1.0;
          applyZoom();
        });
      });
      placeholder.classList.add('mermaid-rendered');
    }).catch((err) => {
      console.error('[mermaid] render failed:', err);
      document.querySelectorAll('[id^="dmermaid-"], svg[id^="dmermaid-"]').forEach((el) => el.remove());
      placeholder.innerHTML = `
        <div class="mermaid-error">
          <div class="mermaid-error-title">Unable to render workflow diagram</div>
          <pre class="mermaid-error-source">${escapeHtml(source)}</pre>
        </div>
      `;
      placeholder.classList.add('mermaid-error-placeholder');
    });
  });
}

export function externalLinkAttrs() {
  return { target: '_blank', rel: 'noopener noreferrer' };
}
