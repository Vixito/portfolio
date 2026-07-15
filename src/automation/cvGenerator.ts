import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib";

export async function generateCV(
  userData: any,
  jobData: any
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([612, 792]); // Carta (Letter)
  
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const margin = 50;
  const usableWidth = page.getWidth() - margin * 2;
  let currentY = page.getHeight() - margin;

  const colorBlack = rgb(0, 0, 0);
  const colorBlue = rgb(0, 0.3, 0.7);
  const colorDarkGray = rgb(0.2, 0.2, 0.2);

  const sanitizeWinAnsi = (text: string) => {
    if (!text) return "";
    return text
      .replace(/[\u2011\u2012\u2013\u2014]/g, "-")
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
      .replace(/[\u2022\u2023\u25E6\u2043]/g, "*")
      .replace(/[\u2026]/g, "...")
      .replace(/[^\x00-\xFF]/g, "");
  };

  const checkPageBreak = (neededHeight: number) => {
    if (currentY - neededHeight < margin) {
      page = pdfDoc.addPage([612, 792]);
      currentY = page.getHeight() - margin;
    }
  };

  const drawText = (text: string, font: any, size: number, x: number, y: number, color = colorBlack) => {
    page.drawText(sanitizeWinAnsi(text), { x, y, size, font, color });
  };

  // Helper to wrap text
  const wrapText = (text: string, font: any, size: number, maxW: number) => {
    if (!text) return [];
    // Primero, dividir por saltos de línea reales (\n)
    const paragraphs = text.split('\n');
    const lines: string[] = [];

    for (const paragraph of paragraphs) {
      if (paragraph.trim() === '') {
        lines.push(''); // Conservar párrafos vacíos
        continue;
      }
      
      const words = paragraph.split(" ");
      let currentLine = "";
      
      for (const word of words) {
        const testLine = currentLine + word + " ";
        const testWidth = font.widthOfTextAtSize(sanitizeWinAnsi(testLine), size);
        if (testWidth > maxW && currentLine !== "") {
          lines.push(currentLine);
          currentLine = word + " ";
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
    }
    return lines;
  };

  // 1. HEADER (Alineado a la izquierda)
  const nameSize = 22;
  drawText(userData.name || "Carlos Andres Vicioso Lara", fontBold, nameSize, margin, currentY);
  currentY -= 18;

  // Info de contacto (2 líneas)
  const contactSize = 9;
  const line1 = [userData.location, userData.phone].filter(Boolean).join(" | ") + " | ";
  drawText(line1, fontRegular, contactSize, margin, currentY, colorDarkGray);
  const line1Width = fontRegular.widthOfTextAtSize(sanitizeWinAnsi(line1), contactSize);
  drawText(userData.email || "", fontRegular, contactSize, margin + line1Width, currentY, colorBlue);
  currentY -= 14;

  const github = "github.com/vixito";
  drawText(github, fontRegular, contactSize, margin, currentY, colorBlue);
  let linkX = margin + fontRegular.widthOfTextAtSize(github, contactSize);
  drawText(" | ", fontRegular, contactSize, linkX, currentY, colorDarkGray);
  linkX += fontRegular.widthOfTextAtSize(" | ", contactSize);
  
  const linkedin = userData.linkedin || "linkedin.com/in/vixis";
  drawText(linkedin, fontRegular, contactSize, linkX, currentY, colorBlue);
  linkX += fontRegular.widthOfTextAtSize(linkedin, contactSize);
  drawText(" | ", fontRegular, contactSize, linkX, currentY, colorDarkGray);
  linkX += fontRegular.widthOfTextAtSize(" | ", contactSize);

  const portfolio = userData.portfolio || "vixis.dev";
  drawText(portfolio, fontRegular, contactSize, linkX, currentY, colorBlue);
  currentY -= 25;

  // Helper for Section Headers
  const drawSectionHeader = (title: string) => {
    checkPageBreak(30);
    drawText(title, fontBold, 11, margin, currentY);
    currentY -= 6;
    page.drawLine({
      start: { x: margin, y: currentY },
      end: { x: page.getWidth() - margin, y: currentY },
      thickness: 1,
      color: colorBlack
    });
    currentY -= 12;
  };

  // 2. PROFESSIONAL SUMMARY
  drawSectionHeader("PROFESSIONAL SUMMARY");
  const summaryText = jobData.tailoredSummary || userData.summary || "";
  const summaryLines = wrapText(summaryText, fontRegular, 9.5, usableWidth);
  for (const line of summaryLines) {
    checkPageBreak(12);
    drawText(line, fontRegular, 9.5, margin, currentY);
    currentY -= 13;
  }
  currentY -= 8;

  // Helper para items con fechas a la derecha
  const drawExperienceItem = (title: string, date: string, bullets: string[]) => {
    checkPageBreak(25);
    drawText(title, fontBold, 10, margin, currentY);
    const safeDate = sanitizeWinAnsi(date).toUpperCase();
    const dateWidth = fontBold.widthOfTextAtSize(safeDate, 9.5);
    drawText(safeDate, fontBold, 9.5, page.getWidth() - margin - dateWidth, currentY);
    currentY -= 13;

    if (bullets && bullets.length > 0) {
      for (const bullet of bullets) {
        const bulletLines = wrapText(bullet, fontRegular, 9.5, usableWidth - 12);
        for (let i = 0; i < bulletLines.length; i++) {
          checkPageBreak(12);
          if (i === 0) {
            page.drawCircle({ x: margin + 4, y: currentY + 3, size: 1.5, color: colorBlack });
          }
          drawText(bulletLines[i], fontRegular, 9.5, margin + 12, currentY);
          currentY -= 13;
        }
      }
    }
    currentY -= 8;
  };

  // 3. WORK EXPERIENCE
  if (userData.experience && userData.experience.length > 0) {
    drawSectionHeader("WORK EXPERIENCE");
    for (const exp of userData.experience) {
      drawExperienceItem(`${exp.title}, ${exp.company}`, exp.dates, exp.bullets);
    }
  }

  // 4. SKILLS
  if (userData.skills && Object.keys(userData.skills).length > 0) {
    drawSectionHeader("SKILLS");
    for (const [category, skills] of Object.entries(userData.skills)) {
      checkPageBreak(15);
      const catText = `${category}: `;
      drawText(catText, fontBold, 9.5, margin, currentY);
      const catWidth = fontBold.widthOfTextAtSize(sanitizeWinAnsi(catText), 9.5);
      
      const skillsLines = wrapText(skills as string, fontRegular, 9.5, usableWidth - catWidth);
      for (let i = 0; i < skillsLines.length; i++) {
        checkPageBreak(12);
        drawText(skillsLines[i], fontRegular, 9.5, i === 0 ? margin + catWidth : margin, currentY);
        currentY -= 13;
      }
    }
    currentY -= 8;
  }

  // 5. EDUCATION
  if (userData.education && userData.education.length > 0) {
    drawSectionHeader("EDUCATION");
    for (const edu of userData.education) {
      drawExperienceItem(`${edu.degree}, ${edu.institution}`, edu.year, edu.bullets);
    }
  }

  // 6. PROJECTS
  if (userData.projects && userData.projects.length > 0) {
    drawSectionHeader("PROJECTS");
    for (const proj of userData.projects) {
      drawExperienceItem(`${proj.title}, ${proj.company}`, proj.dates, proj.bullets);
    }
  }

  return await pdfDoc.save();
}
