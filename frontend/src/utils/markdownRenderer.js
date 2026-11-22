import { marked } from 'marked';
import DOMPurify from 'dompurify';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  suppressErrorRendering: true,
  securityLevel: 'loose',
  themeVariables: { fontSize: '13px' },
  flowchart: { nodeSpacing: 32, rankSpacing: 36, padding: 12, useMaxWidth: false },
});

function escapeHtml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Sanitize common LLM Mermaid syntax quirks before rendering. LLM-generated
// diagrams often emit unquoted node labels with parentheses or special
// characters (e.g. `A[Text (Note)]`), which Mermaid rejects. Wrap those
// labels in quotes so they parse cleanly: `A["Text (Note)"]`.
function sanitizeMermaid(source) {
  const isStateDiagram = /^\s*stateDiagram(-v2)?\b/m.test(source);
  return source.split('\n').map((line) => {
    let out = line.replace(
      /([A-Za-z_][\w\-]*)\[(".*?"|'.*?'|[^\]]*)\]/g,
      (match, id, label) => {
        const isQuoted = /^["'].*['"]$/.test(label);
        if (isQuoted) {
          const inner = label.slice(1, -1).replace(/\\?"/g, "'");
          return `${id}["${inner}"]`;
        }
        const cleaned = label.replace(/\\?"/g, "'");
        const needsQuote = /[()\[\]{}|&;<>']/.test(cleaned);
        if (needsQuote) {
          return `${id}["${cleaned}"]`;
        }
        return `${id}[${cleaned}]`;
      }
    );

    if (isStateDiagram) {
      // Never mangle state transitions; normalize Unicode operators to ASCII.
      out = out.replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/→/g, 'to');

      // Quote unquoted transition labels containing colons or parentheses,
      // e.g. `A --> B : Refined (Note)` -> `A --> B : "Refined (Note)"`.
      out = out.replace(/(-->\s*\S+\s*:)\s*([^"\n][^\n]*)$/g, (match, arrow, label) => {
        const trimmed = label.trim();
        if (/^["'].*['"]$/.test(trimmed)) return match;
        return `${arrow} "${trimmed}"`;
      });

      // Normalize spaces in unquoted state identifiers: `Idea Backlog` -> `Idea_Backlog`.
      const protectedSegments = [];
      out = out.replace(/"[^"]*"|'[^']*'/g, (m) => {
        const key = `__MERMAID_Q${protectedSegments.length}__`;
        protectedSegments.push(m);
        return key;
      });
      out = out.replace(/([A-Za-z][A-Za-z0-9_]*(?: [A-Za-z0-9_]+)+)/g, (m) => m.replace(/ /g, '_'));
      protectedSegments.forEach((seg, i) => {
        out = out.replace(`__MERMAID_Q${i}__`, seg);
      });
    }

    return out;
  }).join('\n');
}

export function renderMarkdown(text) {
  if (!text) return '';

  // Ensure Markdown headings always start on a fresh line (blank line before
  // `##` / `###`) so they render as headings instead of raw `##` text, in the
  // chat UI and in exported PDFs alike.
  text = text.replace(/\n+(?=#+\s)/g, '\n\n')

  const renderer = new marked.Renderer();

  // External links open in a new tab. [video](url) becomes an embedded player.
  const originalLink = renderer.link;
  renderer.link = function (href, title, text) {
    if (text && String(text).trim().toLowerCase() === 'video') {
      return `<div class="video-wrapper my-3"><iframe class="w-full h-64" src="${escapeHtml(href)}" frameborder="0" allowfullscreen loading="lazy" sandbox="allow-same-origin allow-scripts"></iframe></div>`;
    }
    const html = originalLink.call(this, href, title, text);
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return html.replace('<a ', '<a target="_blank" rel="noopener noreferrer" ');
    }
    return html;
  };

  // Responsive images with rounded styling.
  const originalImage = renderer.image;
  renderer.image = function (href, title, text) {
    const html = originalImage.call(this, href, title, text);
    return html.replace('<img ', '<img class="rounded-lg max-w-full my-3" ');
  };

  // Mermaid code blocks become placeholders that are rendered as SVG once the
  // stream closes (see renderMermaidDiagrams / MessageBubble).
  const originalCode = renderer.code;
  renderer.code = function (codeOrToken, language) {
    const rawCode = typeof codeOrToken === 'object' && codeOrToken !== null ? codeOrToken.text : codeOrToken;
    const rawLang = typeof codeOrToken === 'object' && codeOrToken !== null ? codeOrToken.lang : language;
    if (rawLang != null && String(rawLang).trim().toLowerCase() === 'mermaid') {
      return `<div class="mermaid-placeholder"><div class="mermaid-loading">Rendering workflow diagram...</div><div class="mermaid-source">${escapeHtml(rawCode)}</div></div>`;
    }
    return originalCode.apply(this, arguments);
  };

  let html = marked.parse(text, {
    mangle: false,
    headerIds: false,
    breaks: true,
    renderer,
  });

  html = html.replace(
    /(https?:\/\/player\.vimeo\.com\/video\/([0-9]+)|https?:\/\/vimeo\.com\/([0-9]+))/g,
    '<div class="video-wrapper my-3"><iframe class="w-full h-64" src="https://player.vimeo.com/video/$2$3" frameborder="0" allowfullscreen loading="lazy"></iframe></div>'
  );

  html = DOMPurify.sanitize(html, {
    ADD_ATTR: ['target', 'rel', 'class', 'allowfullscreen', 'loading', 'frameborder', 'src', 'sandbox', 'referrerpolicy'],
    ADD_TAGS: ['iframe'],
    ADD_URI_ATTR: [],
  });

  // Convert verified YouTube links to responsive 16:9 embed iframes after sanitization.
  html = html.replace(
    /<a[^>]*href="https?:\/\/(?:www\.youtube(?:-nocookie)?\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})"[^>]*>.*?<\/a>/g,
    '<div class="video-wrapper my-3"><iframe class="w-full h-64" src="https://www.youtube-nocookie.com/embed/$1" frameborder="0" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>'
  );

  return html;
}

/**
 * Render any `.mermaid-placeholder` nodes inside `container` as inline SVG
 * diagrams using mermaid.render. Safe to call repeatedly; already-rendered
 * placeholders are skipped via a data attribute. Intended to run after a
 * streaming message has finished so the placeholder stays visible during the
 * stream.
 */
export function renderMermaidDiagrams(container) {
  if (!container) return;

  const placeholders = container.querySelectorAll('.mermaid-placeholder');
  placeholders.forEach((placeholder) => {
    if (placeholder.dataset.rendered === 'true') return;

    const sourceEl = placeholder.querySelector('.mermaid-source');
    if (!sourceEl) return;
    let source = sourceEl.textContent;
    if (!source.trim()) return;

    // Sanitize common LLM Mermaid syntax quirks before rendering.
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
        <div class="mermaid-viewport">
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
      // Remove any orphaned Mermaid error SVG injected into document.body.
      document.querySelectorAll('svg[id^="dmermaid-"]').forEach((el) => el.remove());
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
