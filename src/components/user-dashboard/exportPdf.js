import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// A4 portrait in mm
const A4_W = 210;
const A4_H = 297;
const MARGIN_X = 12;
const HEADER_H = 22;
const FOOTER_H = 10;
const CONTENT_PAD_TOP = 6;
const CONTENT_PAD_BOTTOM = 4;
const SECTION_GAP = 6;
const CONTENT_W = A4_W - MARGIN_X * 2;
const CONTENT_H = A4_H - HEADER_H - FOOTER_H - CONTENT_PAD_TOP - CONTENT_PAD_BOTTOM;
const CONTENT_TOP = HEADER_H + CONTENT_PAD_TOP;

// Logo PNG is 1038 x 440 (~2.36:1).
const LOGO_W = 26;
const LOGO_ASPECT = 1038 / 440;
const LOGO_H = LOGO_W / LOGO_ASPECT;

async function loadLogoDataUrl(src) {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawHeader(pdf, title, logoDataUrl) {
  if (logoDataUrl) {
    try {
      pdf.addImage(logoDataUrl, 'PNG', MARGIN_X, 7, LOGO_W, LOGO_H, undefined, 'FAST');
    } catch {
      /* ignore */
    }
  }
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(244, 244, 248);
  pdf.text(title, A4_W - MARGIN_X, 7 + LOGO_H / 2 + 1.5, { align: 'right' });
  pdf.setDrawColor(42, 42, 56);
  pdf.setLineWidth(0.2);
  pdf.line(MARGIN_X, HEADER_H - 4, A4_W - MARGIN_X, HEADER_H - 4);
}

function drawFooter(pdf, pageNum, totalPages) {
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(113, 113, 127);
  pdf.text(
    `Page ${pageNum} of ${totalPages} · Siksha Assessment Platform`,
    A4_W / 2,
    A4_H - 5,
    { align: 'center' }
  );
}

function applyCloneVisibilityFixes(rootId) {
  return (clonedDoc) => {
    clonedDoc.querySelectorAll('[data-pdf-hide]').forEach((n) => {
      n.style.display = 'none';
    });
    const style = clonedDoc.createElement('style');
    style.textContent = `
      html, body { background: #000000 !important; }
      .reveal, .reveal.reveal-left, .reveal.reveal-right, .reveal.reveal-scale,
      .stagger > *, .page-enter,
      .animate-fade-in, .animate-fade-in-up, .animate-fade-in-down,
      .animate-fade-in-left, .animate-fade-in-right, .animate-scale-in,
      .animate-float, .hover-lift {
        opacity: 1 !important;
        transform: none !important;
        animation: none !important;
        transition: none !important;
        filter: none !important;
      }
      [style*="overflow-x: auto"], [style*="overflowX: auto"] {
        overflow: visible !important;
      }
    `;
    clonedDoc.head.appendChild(style);
    const clonedRoot = clonedDoc.getElementById(rootId);
    if (clonedRoot) {
      clonedRoot.querySelectorAll('*').forEach((el) => el.classList.add('in-view'));

      // html2canvas bug: inline borderRadius: 999 / 9999 renders as squared
      // corners because the radius exceeds half the element's height. Clamp
      // any such pill to a fixed 999rem→24px so html2canvas computes the
      // correct corner curve.
      clonedRoot.querySelectorAll('[style*="border-radius"], [style*="borderRadius"]').forEach((el) => {
        const cs = clonedDoc.defaultView.getComputedStyle(el);
        const br = parseFloat(cs.borderRadius);
        const h = el.getBoundingClientRect().height;
        if (br && h && br > h) {
          // It's a pill — clamp to half height so html2canvas draws a round end.
          el.style.borderRadius = `${h / 2}px`;
        }
      });
    }
  };
}

/**
 * Capture the WHOLE tab root as one big canvas, then slice it into A4 pages
 * using section boundaries measured from the live DOM so a title and its
 * content don't get split across pages.
 */
export async function exportTabRootToPdf({ rootId, title, filename, logoSrc = '/Siksha-Logo.png' }) {
  const root = document.getElementById(rootId);
  if (!root) {
    console.warn(`[exportPdf] root element #${rootId} not found`);
    return;
  }

  // Measure section boundaries from the live DOM BEFORE we render, so we
  // know where natural break points are. Each top-level child (except the
  // export-button row) is a candidate section.
  const rootRect = root.getBoundingClientRect();
  const sections = Array.from(root.children)
    .filter((el) => !el.hasAttribute('data-pdf-hide'))
    .map((el) => {
      const r = el.getBoundingClientRect();
      return {
        topPx: r.top - rootRect.top,
        bottomPx: r.bottom - rootRect.top,
      };
    });

  // Render the whole root in one shot — preserves layout exactly.
  const canvas = await html2canvas(root, {
    backgroundColor: '#000000',
    scale: 2,
    useCORS: true,
    logging: false,
    width: rootRect.width,
    windowWidth: rootRect.width,
    onclone: applyCloneVisibilityFixes(rootId),
  });

  // px-per-mm at the chosen content width
  const pxPerMmCanvas = canvas.width / CONTENT_W;
  const liveToCanvasScale = canvas.width / rootRect.width; // accounts for html2canvas scale + width mapping
  const maxPxPerPage = Math.floor(CONTENT_H * pxPerMmCanvas);

  // Map live-DOM section offsets to canvas pixels.
  const sectionsPx = sections.map((s) => ({
    topPx: s.topPx * liveToCanvasScale,
    bottomPx: s.bottomPx * liveToCanvasScale,
  }));

  // Compute slice ranges. Strategy:
  // - Greedily walk down the canvas. For each page, take as many full
  //   sections as fit within maxPxPerPage starting from the current cursor.
  // - If even the first section is larger than maxPxPerPage, slice it
  //   internally to fill the page and continue on the next page.
  const pageSlices = []; // [{ startPx, endPx }]
  let cursor = 0;
  let nextSectionIdx = sectionsPx.findIndex((s) => s.bottomPx > cursor);
  if (nextSectionIdx === -1) nextSectionIdx = sectionsPx.length;

  while (cursor < canvas.height) {
    const pageBudgetEnd = cursor + maxPxPerPage;

    // Find the last section that fully fits within the page budget.
    let lastFittingEnd = -1;
    let i = nextSectionIdx;
    while (i < sectionsPx.length && sectionsPx[i].bottomPx <= pageBudgetEnd) {
      lastFittingEnd = sectionsPx[i].bottomPx;
      i += 1;
    }

    let endPx;
    if (lastFittingEnd > cursor) {
      // At least one section fits — page ends at the last full section.
      endPx = lastFittingEnd;
      nextSectionIdx = i;
    } else {
      // Even the next section doesn't fit. Slice mid-section to fill the page.
      endPx = Math.min(pageBudgetEnd, canvas.height);
      // The section straddling this boundary is still pending — find new nextSectionIdx
      while (nextSectionIdx < sectionsPx.length && sectionsPx[nextSectionIdx].bottomPx <= endPx) {
        nextSectionIdx += 1;
      }
    }

    pageSlices.push({ startPx: cursor, endPx });
    cursor = endPx;
  }

  // Render to PDF.
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const logoDataUrl = await loadLogoDataUrl(logoSrc);
  const totalPages = pageSlices.length;

  pageSlices.forEach((slice, i) => {
    if (i > 0) pdf.addPage();
    pdf.setFillColor(0, 0, 0);
    pdf.rect(0, 0, A4_W, A4_H, 'F');
    drawHeader(pdf, title, logoDataUrl);

    const sliceH = slice.endPx - slice.startPx;
    const sCanvas = document.createElement('canvas');
    sCanvas.width = canvas.width;
    sCanvas.height = sliceH;
    const ctx = sCanvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, sCanvas.width, sCanvas.height);
    ctx.drawImage(canvas, 0, slice.startPx, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

    const imgData = sCanvas.toDataURL('image/png');
    const hMm = (sliceH * CONTENT_W) / canvas.width;
    pdf.addImage(imgData, 'PNG', MARGIN_X, CONTENT_TOP, CONTENT_W, hMm, undefined, 'FAST');

    drawFooter(pdf, i + 1, totalPages);
  });

  pdf.save(filename);
}
