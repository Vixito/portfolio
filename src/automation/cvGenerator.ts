import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib";

export async function generateCV(
  userData: any,
  jobData: any
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Carta (Letter) size: 8.5 x 11 inches
  
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const margin = 36; // 0.5 inch margins
  let currentY = page.getHeight() - margin;
  const maxWidth = page.getWidth() - margin * 2;

  const sanitizeWinAnsi = (text: string) => {
    if (!text) return "";
    return text
      .replace(/[\u2011\u2012\u2013\u2014]/g, "-") // dashes
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // single quotes
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // double quotes
      .replace(/[\u2022\u2023\u25E6\u2043]/g, "*") // bullets
      .replace(/[\u2026]/g, "...")                 // ellipsis
      .replace(/[^\x00-\xFF]/g, "");               // remove remaining unsupported chars
  };

  const drawText = (text: string, font: any, size: number, x: number, y: number, color = rgb(0, 0, 0)) => {
    page.drawText(sanitizeWinAnsi(text), { x, y, size, font, color, maxWidth });
  };

  // 1. HEADER
  const nameSize = 20;
  const safeName = sanitizeWinAnsi(userData.name);
  const nameWidth = fontBold.widthOfTextAtSize(safeName, nameSize);
  drawText(safeName, fontBold, nameSize, (page.getWidth() - nameWidth) / 2, currentY);
  currentY -= 20;

  const contactText = [
    userData.phone,
    userData.location,
    userData.email,
    userData.linkedin ? `linkedin.com/in/${userData.linkedin}` : null,
    userData.portfolio
  ].filter(Boolean).join(" | ");
  
  const contactSize = 10;
  const safeContact = sanitizeWinAnsi(contactText);
  const contactWidth = fontRegular.widthOfTextAtSize(safeContact, contactSize);
  drawText(safeContact, fontRegular, contactSize, (page.getWidth() - contactWidth) / 2, currentY, rgb(0.3, 0.3, 0.3));
  currentY -= 30;

  // Helper for Section Headers
  const drawSectionHeader = (title: string) => {
    drawText(title, fontBold, 12, margin, currentY);
    currentY -= 4;
    page.drawLine({
      start: { x: margin, y: currentY },
      end: { x: page.getWidth() - margin, y: currentY },
      thickness: 1,
      color: rgb(0, 0, 0)
    });
    currentY -= 15;
  };

  // 2. PROFESSIONAL SUMMARY
  drawSectionHeader("PROFESSIONAL SUMMARY");
  
  // A simple word wrap for the summary
  const summaryText = jobData.tailoredSummary || userData.summary || "";
  const words = summaryText.split(" ");
  let line = "";
  
  for (const word of words) {
    const testLine = sanitizeWinAnsi(line + word + " ");
    const testWidth = fontRegular.widthOfTextAtSize(testLine, 10);
    if (testWidth > maxWidth && line !== "") {
      drawText(line, fontRegular, 10, margin, currentY);
      currentY -= 14;
      line = word + " ";
    } else {
      line = testLine;
    }
  }
  drawText(line, fontRegular, 10, margin, currentY);
  currentY -= 25;

  // 3. SKILLS
  drawSectionHeader("SKILLS");
  if (userData.skills) {
    for (const [category, skills] of Object.entries(userData.skills)) {
      drawText(`${category}:`, fontBold, 10, margin, currentY);
      const safeCategory = sanitizeWinAnsi(`${category}: `);
      const catWidth = fontBold.widthOfTextAtSize(safeCategory, 10);
      drawText(skills as string, fontRegular, 10, margin + catWidth, currentY);
      currentY -= 14;
    }
  }
  currentY -= 10;

  // 4. EXPERIENCE
  if (userData.experience && userData.experience.length > 0) {
    drawSectionHeader("EXPERIENCE");
    for (const exp of userData.experience) {
      drawText(exp.company, fontBold, 11, margin, currentY);
      const safeDates = sanitizeWinAnsi(exp.dates);
      const datesWidth = fontRegular.widthOfTextAtSize(safeDates, 10);
      drawText(exp.dates, fontRegular, 10, page.getWidth() - margin - datesWidth, currentY);
      currentY -= 14;
      
      drawText(exp.title, fontBold, 10, margin, currentY);
      currentY -= 14;

      if (exp.bullets) {
        for (const bullet of exp.bullets) {
          drawText(`•  ${bullet}`, fontRegular, 10, margin + 10, currentY);
          currentY -= 14; // simplistic wrap not applied to bullets for brevity, but could be added
        }
      }
      currentY -= 10;
    }
  }

  // Generate bytes
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
