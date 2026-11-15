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
  return source.split('\n').map((line) => {
    return line.replace(
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
  }).join('\n');
}

export function renderMarkdown(text) {
  if (!text) return '';

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
  renderer.code = function (code, language) {
    if (language != null && String(language).trim().toLowerCase() === 'mermaid') {
      return `<div class="mermaid-placeholder"><div class="mermaid-loading">Rendering workflow diagram...</div><div class="mermaid-source">${escapeHtml(code)}</div></div>`;
    }
    return originalCode.call(this, code, language);
  };

  let html = marked.parse(text, {
    mangle: false,
    headerIds: false,
    breaks: true,
    renderer,
  });

  // Convert YouTube / Vimeo URLs to responsive embedded iframes.
  html = html.replace(
    /(https?:\/\/www\.youtube(?:-nocookie)?\.com\/watch\?v=([a-zA-Z0-9_-]{11})|https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11}))/g,
    '<div class="video-wrapper my-3"><iframe class="w-full h-64" src="https://www.youtube.com/embed/$2$3" frameborder="0" allowfullscreen loading="lazy"></iframe></div>'
  );
  html = html.replace(
    /(https?:\/\/player\.vimeo\.com\/video\/([0-9]+)|https?:\/\/vimeo\.com\/([0-9]+))/g,
    '<div class="video-wrapper my-3"><iframe class="w-full h-64" src="https://player.vimeo.com/video/$2$3" frameborder="0" allowfullscreen loading="lazy"></iframe></div>'
  );

  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['target', 'rel', 'class', 'allowfullscreen', 'loading', 'frameborder', 'src', 'sandbox'],
    ADD_TAGS: ['iframe'],
    ADD_URI_ATTR: [],
  });
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
        svgEl.style.maxWidth = 'none';
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
