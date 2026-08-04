import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

// Generic block-based Word document builder shared by every inspector-side
// document (محضر فتح تحويلة, محضر جاهزية, تقرير TDP-FU, محضر إغلاق تحويلة).
// Each document just describes its content as an array of "blocks" instead
// of everyone writing their own docx boilerplate.
//
// Supported block types:
//   { type: 'heading', textAr, textEn }
//   { type: 'paragraph', textAr, textEn }
//   { type: 'fields', pairs: [[labelAr, labelEn, value], ...] }
//   { type: 'table', headersAr, headersEn, rows: [[...], ...] }
//   { type: 'signatures', signers: [{ roleAr, roleEn, name, date }, ...] }

const cellText = (text, opts = {}) => new Paragraph({
  alignment: opts.align || AlignmentType.RIGHT,
  bidirectional: true,
  children: [new TextRun({ text: text || '', bold: !!opts.bold, size: opts.size || 20 })]
});

const thinBorders = {
  top: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' },
  left: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' },
  right: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' }
};

function buildBlock(block, isArabic) {
  if (block.type === 'heading') {
    return [new Paragraph({
      heading: HeadingLevel.HEADING_2,
      alignment: isArabic ? AlignmentType.RIGHT : AlignmentType.LEFT,
      bidirectional: isArabic,
      spacing: { before: 300, after: 150 },
      children: [new TextRun({ text: isArabic ? block.textAr : block.textEn, bold: true, size: 26, color: '016B68' })]
    })];
  }

  if (block.type === 'paragraph') {
    return [new Paragraph({
      alignment: isArabic ? AlignmentType.RIGHT : AlignmentType.LEFT,
      bidirectional: isArabic,
      spacing: { after: 200 },
      children: [new TextRun({ text: isArabic ? block.textAr : block.textEn, size: 22 })]
    })];
  }

  if (block.type === 'fields') {
    const rows = block.pairs.map(([labelAr, labelEn, value]) => new TableRow({
      children: [
        new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: thinBorders, shading: { fill: 'F5FAF8' }, children: [cellText(isArabic ? labelAr : labelEn, { bold: true, size: 20 })] }),
        new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: thinBorders, children: [cellText(value)] })
      ]
    }));
    return [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows })];
  }

  if (block.type === 'table') {
    const headers = isArabic ? block.headersAr : block.headersEn;
    const headerRow = new TableRow({
      children: headers.map(h => new TableCell({ borders: thinBorders, shading: { fill: '016B68' }, children: [cellText(h, { bold: true })] }))
    });
    const dataRows = block.rows.map(r => new TableRow({
      children: r.map(cell => new TableCell({ borders: thinBorders, children: [cellText(String(cell))] }))
    }));
    return [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] })];
  }

  if (block.type === 'signatures') {
    const roleRow = new TableRow({
      children: block.signers.map(s => new TableCell({ borders: thinBorders, shading: { fill: 'F5FAF8' }, children: [cellText(isArabic ? s.roleAr : s.roleEn, { bold: true, align: AlignmentType.CENTER })] }))
    });
    const nameRow = new TableRow({
      children: block.signers.map(s => new TableCell({ borders: thinBorders, children: [cellText(s.name || '\u2014', { align: AlignmentType.CENTER })] }))
    });
    const dateRow = new TableRow({
      children: block.signers.map(s => new TableCell({ borders: thinBorders, children: [cellText(s.date || '\u2014', { align: AlignmentType.CENTER })] }))
    });
    return [
      new Paragraph({ spacing: { before: 300, after: 100 }, alignment: isArabic ? AlignmentType.RIGHT : AlignmentType.LEFT, bidirectional: isArabic, children: [new TextRun({ text: isArabic ? 'التوقيعات' : 'Signatures', bold: true, size: 22, color: '016B68' })] }),
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [roleRow, nameRow, dateRow] })
    ];
  }

  return [];
}

/**
 * Build and immediately download a .docx file from a simple block description.
 * @param {Object} opts
 * @param {string} opts.titleAr / titleEn - document title
 * @param {Array} opts.blocks - content blocks (see supported types above)
 * @param {string} opts.fileName - without extension
 * @param {boolean} opts.isArabic
 */
export async function exportDocxReport({ titleAr, titleEn, blocks, fileName, isArabic = true }) {
  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: isArabic,
      spacing: { after: 300 },
      children: [new TextRun({ text: isArabic ? titleAr : titleEn, bold: true, size: 36, color: '043531' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: 'Tahcom \u2014 \u0646\u0638\u0627\u0645 \u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0631\u0648\u0631', size: 18, color: '999999' })]
    })
  ];

  blocks.forEach(block => {
    children.push(...buildBlock(block, isArabic));
    children.push(new Paragraph({ text: '' }));
  });

  const doc = new Document({
    sections: [{ properties: {}, children }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${fileName}.docx`);
}
