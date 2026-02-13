// src/server/services/pdfGenerator.ts
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

type AssignmentData = {
    collaboratorId: string;
    collaboratorName: string | null;
    hotelName: string | null;
    departmentName: string | null;
    teamName: string | null;
    assignedAt: Date;
    engineerName: string; // Nombre del ingeniero que asignó
    equipment: Array<{
        type: string | null;
        brand: string | null;
        model: string | null;
        serial: string;
    }>;
};

type LoanData = {
    collaboratorId: string;
    collaboratorName: string | null;
    hotelName: string | null;
    departmentName: string | null;
    teamName: string | null;
    loanStartDate: Date;
    loanReturnDate: Date;
    engineerName: string; // Nombre del ingeniero que creó el préstamo
    equipment: Array<{
        type: string | null;
        brand: string | null;
        model: string | null;
        serial: string;
    }>;
};

type ManualAssignmentData = {
    collaboratorName: string;
    collaboratorEmail: string | null;
    hotelName: string | null;
    departmentName: string | null;
    assignedAt: Date;
    engineerName: string; // Nombre del ingeniero que asignó
    equipment: Array<{
        type: string | null;
        brand: string | null;
        model: string | null;
        serial: string;
    }>;
};

/**
 * Genera un PDF de resguardo de equipo con el formato oficial
 * Soporta múltiples páginas para colaboradores con muchos equipos
 * @param data Datos del colaborador y equipos asignados
 * @returns Buffer del PDF generado
 */
export async function generateAssignmentPDF(data: AssignmentData): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const PAGE_WIDTH = 792;
    const PAGE_HEIGHT = 612;
    const margin = 50;
    const rowHeight = 25;
    const maxLineWidth = PAGE_WIDTH - (margin * 2);

    // Fuentes
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // ========== CARGAR LOGO (una sola vez) ==========
    let logoImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
    let logoWidth = 80;
    let logoHeight = 0;
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const sharp = (await import('sharp')).default;
        const logoPath = path.join(process.cwd(), 'public', 'images', 'PALACERESORTS.svg');
        const svgBuffer = await fs.readFile(logoPath);
        const pngBuffer = await sharp(svgBuffer).resize({ width: 120 }).png().toBuffer();
        logoImage = await pdfDoc.embedPng(pngBuffer);
        logoHeight = logoImage.height * (logoWidth / logoImage.width);
    } catch {
        console.warn('Logo no encontrado en public/images/PALACERESORTS.svg');
    }

    // Columnas de la tabla
    const cols = [
        { label: 'TIPO', x: margin, width: 80 },
        { label: 'MARCA', x: margin + 85, width: 100 },
        { label: 'MODELO', x: margin + 190, width: 150 },
        { label: 'No.Serie:', x: margin + 345, width: 200 },
    ];

    // --- Helper: dibujar encabezados de tabla en la página actual ---
    function drawTableHeaders(page: ReturnType<typeof pdfDoc.addPage>, y: number): number {
        cols.forEach((col) => {
            page.drawText(col.label, {
                x: col.x + 5,
                y: y - 5,
                size: 9,
                font: fontBold,
            });
        });
        return y - rowHeight;
    }

    // --- Helper: dibujar una fila de equipo ---
    function drawEquipmentRow(page: ReturnType<typeof pdfDoc.addPage>, item: typeof data.equipment[0], y: number) {
        const values = [
            item.type || '—',
            item.brand || '—',
            item.model || '—',
            item.serial || '—',
        ];
        cols.forEach((col, i) => {
            page.drawText(values[i], {
                x: col.x + 5,
                y: y - 5,
                size: 9,
                font: fontRegular,
            });
        });
    }

    // --- Helper: dibujar texto multilínea, devuelve nueva yPosition ---
    function drawWrappedText(page: ReturnType<typeof pdfDoc.addPage>, text: string, y: number, minY: number): number {
        const words = text.split(' ');
        let currentLine = '';
        let yPos = y;
        words.forEach((word) => {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const lineWidth = fontRegular.widthOfTextAtSize(testLine, 9);
            if (lineWidth > maxLineWidth && currentLine) {
                if (yPos < minY) return;
                page.drawText(currentLine, { x: margin, y: yPos, size: 9, font: fontRegular });
                yPos -= 12;
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });
        if (currentLine && yPos >= minY) {
            page.drawText(currentLine, { x: margin, y: yPos, size: 9, font: fontRegular });
            yPos -= 12;
        }
        return yPos;
    }

    // ========== PAGINACIÓN ==========
    // Espacio mínimo necesario para el footer (responsabilidad ES + EN + firmas)
    const footerHeight = 200;
    // Umbral mínimo para seguir dibujando filas en una página
    const minRowY = margin + 30;

    let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let yPosition = PAGE_HEIGHT - margin;
    let pageNumber = 1;

    // ========== PÁGINA 1: ENCABEZADO COMPLETO ==========
    // Logo
    if (logoImage) {
        currentPage.drawImage(logoImage, {
            x: margin,
            y: yPosition - logoHeight,
            width: logoWidth,
            height: logoHeight,
        });
    }

    // Sistema de Inventario TI y fecha (arriba a la derecha)
    const systemLabel = 'Sistema de Inventario TI';
    currentPage.drawText(systemLabel, {
        x: PAGE_WIDTH - margin - fontRegular.widthOfTextAtSize(systemLabel, 9),
        y: yPosition,
        size: 9,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3),
    });
    yPosition -= 15;

    const today = new Date(data.assignedAt);
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    currentPage.drawText(formattedDate, {
        x: PAGE_WIDTH - margin - fontRegular.widthOfTextAtSize(formattedDate, 9),
        y: yPosition,
        size: 9,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3),
    });
    yPosition -= 10;

    // Título principal
    const titleSize = 14;
    const title = 'TECNOLOGÍA DE LA INFORMACIÓN';
    currentPage.drawText(title, {
        x: PAGE_WIDTH / 2 - (fontBold.widthOfTextAtSize(title, titleSize) / 2),
        y: yPosition,
        size: titleSize,
        font: fontBold,
        color: rgb(0, 0, 0),
    });
    yPosition -= 20;

    // Subtítulo
    const subtitleSize = 12;
    const subtitle = 'RESGUARDO DE EQUIPO DE CÓMPUTO';
    currentPage.drawText(subtitle, {
        x: PAGE_WIDTH / 2 - (fontBold.widthOfTextAtSize(subtitle, subtitleSize) / 2),
        y: yPosition,
        size: subtitleSize,
        font: fontBold,
        color: rgb(0, 0, 0),
    });
    yPosition -= 30;

    // Línea separadora
    currentPage.drawLine({
        start: { x: margin, y: yPosition },
        end: { x: PAGE_WIDTH - margin, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
    });
    yPosition -= 20;

    // Información del colaborador
    const infoFontSize = 10;
    const collaboratorLine = `${data.collaboratorName || data.collaboratorId}   ${data.departmentName || ''}   ${data.hotelName || ''}`;
    currentPage.drawText(collaboratorLine, {
        x: margin, y: yPosition, size: infoFontSize, font: fontRegular,
    });
    yPosition -= 20;

    if (data.teamName) {
        const teamText = `Nombre de equipo :   ${data.teamName}`;
        currentPage.drawText(teamText, {
            x: margin, y: yPosition, size: infoFontSize, font: fontRegular,
        });
        yPosition -= 25;
    }

    const introText = 'Recibí en resguardo los equipos que a continuación se describen:';
    currentPage.drawText(introText, {
        x: margin, y: yPosition, size: infoFontSize, font: fontRegular,
    });
    yPosition -= 20;

    // Encabezados de tabla
    yPosition = drawTableHeaders(currentPage, yPosition);



    // ========== RENDERIZAR TODAS LAS FILAS DE EQUIPOS ==========
    for (let itemIndex = 0; itemIndex < data.equipment.length; itemIndex++) {
        const item = data.equipment[itemIndex];

        // Sin reservar espacio para footer — el footer se pone al final o en una nueva página
        const bottomLimit = minRowY;

        // ¿Necesitamos nueva página?
        if (yPosition - rowHeight < bottomLimit) {
            // Crear nueva página
            pageNumber++;
            currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            yPosition = PAGE_HEIGHT - margin;

            // Mini encabezado de continuación
            if (logoImage) {
                currentPage.drawImage(logoImage, {
                    x: margin,
                    y: yPosition - logoHeight,
                    width: logoWidth,
                    height: logoHeight,
                });
            }

            const contLabel = 'RESGUARDO DE EQUIPO DE CÓMPUTO (continuación)';
            currentPage.drawText(contLabel, {
                x: PAGE_WIDTH / 2 - (fontBold.widthOfTextAtSize(contLabel, 11) / 2),
                y: yPosition - 5,
                size: 11,
                font: fontBold,
            });
            yPosition -= 30;

            // Encabezados de tabla (sin info de colaborador)
            yPosition = drawTableHeaders(currentPage, yPosition);
        }

        // Dibujar fila de equipo
        drawEquipmentRow(currentPage, item, yPosition);
        yPosition -= rowHeight;
    }

    // ========== FOOTER: TEXTO DE RESPONSABILIDAD + FIRMAS ==========
    // Si no hay espacio suficiente para el footer, crear nueva página
    if (yPosition < margin + footerHeight) {
        currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        yPosition = PAGE_HEIGHT - margin;

        // Mini encabezado
        if (logoImage) {
            currentPage.drawImage(logoImage, {
                x: margin,
                y: yPosition - logoHeight,
                width: logoWidth,
                height: logoHeight,
            });
        }
        const contLabel = 'RESGUARDO DE EQUIPO DE CÓMPUTO (continuación)';
        currentPage.drawText(contLabel, {
            x: PAGE_WIDTH / 2 - (fontBold.widthOfTextAtSize(contLabel, 11) / 2),
            y: yPosition - 5,
            size: 11,
            font: fontBold,
        });
        yPosition -= 40;
    }
    yPosition -= 10;

    // Texto de responsabilidad (español)
    const responsibilityText = `Acepto que he recibido equipo de cómputo y accesorios que se describen, estoy obligado a conservarlos en buen estado, deberé utilizarlo exclusivamente para actividades laborales asignadas e informar al área de Soporte Técnico cualquier avería o falla que pueda presentarse durante la operación normal del equipo, cuando la empresa así lo requiera podré revisarlo para validar su estado por lo que deberé mantenerlo y resguardarlo adecuadamente en mi centro de trabajo, aceptaré la responsabilidad por mal uso o daño que pueda ocasionarle.`;
    yPosition = drawWrappedText(currentPage, responsibilityText, yPosition, margin + 80);

    yPosition -= 15;

    // Texto de responsabilidad (inglés)
    const responsibilityTextEN = `I acknowledge that I have received computer equipment and accessories as described above. I am obligated to keep them in good condition and use them exclusively for assigned work activities. I will inform the Technical Support area of any fault or failure that may occur during the normal operation of the equipment. When the company requires, I will allow inspection to validate its condition, therefore I must properly maintain and safeguard it at my workplace. I accept responsibility for any misuse or damage that may occur.`;
    yPosition = drawWrappedText(currentPage, responsibilityTextEN, yPosition, margin + 40);

    yPosition -= 30;

    // ========== SECCIÓN DE FIRMAS ==========
    const lineLength = 200;
    const signature1X = margin + 50;
    const signature2X = PAGE_WIDTH - margin - lineLength - 50;

    // Líneas de firma
    currentPage.drawLine({
        start: { x: signature1X, y: yPosition },
        end: { x: signature1X + lineLength, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
    });
    currentPage.drawLine({
        start: { x: signature2X, y: yPosition },
        end: { x: signature2X + lineLength, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
    });
    yPosition -= 10;

    // Nombres debajo de las líneas
    const collaboratorFullName = `${data.collaboratorId} / ${data.collaboratorName || data.collaboratorId}`;
    currentPage.drawText(collaboratorFullName, {
        x: signature1X + (lineLength / 2) - (fontBold.widthOfTextAtSize(collaboratorFullName, 9) / 2),
        y: yPosition,
        size: 9,
        font: fontBold,
    });
    currentPage.drawText(data.engineerName, {
        x: signature2X + (lineLength / 2) - (fontBold.widthOfTextAtSize(data.engineerName, 9) / 2),
        y: yPosition,
        size: 9,
        font: fontBold,
    });
    yPosition -= 15;

    // Labels
    currentPage.drawText('Firma del Colaborador', {
        x: signature1X + (lineLength / 2) - (fontRegular.widthOfTextAtSize('Firma del Colaborador', 9) / 2),
        y: yPosition,
        size: 9,
        font: fontRegular,
    });
    currentPage.drawText('Firma de Soporte Técnico', {
        x: signature2X + (lineLength / 2) - (fontRegular.widthOfTextAtSize('Firma de Soporte Técnico', 9) / 2),
        y: yPosition,
        size: 9,
        font: fontRegular,
    });

    // ========== GENERAR PDF ==========
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}

/**
 * Genera un PDF de préstamo de equipo con el formato oficial
 * Soporta múltiples páginas para préstamos con muchos equipos
 * @param data Datos del colaborador, fechas de préstamo y equipos
 * @returns Buffer del PDF generado
 */
export async function generateLoanPDF(data: LoanData): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const PAGE_WIDTH = 792;
    const PAGE_HEIGHT = 612;
    const margin = 50;
    const rowHeight = 25;
    const maxLineWidth = PAGE_WIDTH - (margin * 2);

    // Fuentes
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // ========== CARGAR LOGO (una sola vez) ==========
    let logoImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
    let logoWidth = 80;
    let logoHeight = 0;
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const sharp = (await import('sharp')).default;
        const logoPath = path.join(process.cwd(), 'public', 'images', 'PALACERESORTS.svg');
        const svgBuffer = await fs.readFile(logoPath);
        const pngBuffer = await sharp(svgBuffer).resize({ width: 120 }).png().toBuffer();
        logoImage = await pdfDoc.embedPng(pngBuffer);
        logoHeight = logoImage.height * (logoWidth / logoImage.width);
    } catch {
        console.warn('Logo no encontrado en public/images/PALACERESORTS.svg');
    }

    // Columnas de la tabla
    const cols = [
        { label: 'TIPO', x: margin, width: 80 },
        { label: 'MARCA', x: margin + 85, width: 100 },
        { label: 'MODELO', x: margin + 190, width: 150 },
        { label: 'No.Serie:', x: margin + 345, width: 200 },
    ];

    // --- Helper: dibujar encabezados de tabla ---
    function drawTableHeaders(page: ReturnType<typeof pdfDoc.addPage>, y: number): number {
        cols.forEach((col) => {
            page.drawText(col.label, {
                x: col.x + 5,
                y: y - 5,
                size: 9,
                font: fontBold,
            });
        });
        return y - rowHeight;
    }

    // --- Helper: dibujar una fila de equipo ---
    function drawEquipmentRow(page: ReturnType<typeof pdfDoc.addPage>, item: typeof data.equipment[0], y: number) {
        const values = [
            item.type || '—',
            item.brand || '—',
            item.model || '—',
            item.serial || '—',
        ];
        cols.forEach((col, i) => {
            page.drawText(values[i], {
                x: col.x + 5,
                y: y - 5,
                size: 9,
                font: fontRegular,
            });
        });
    }

    // --- Helper: dibujar texto multilínea ---
    function drawWrappedText(page: ReturnType<typeof pdfDoc.addPage>, text: string, y: number, minY: number): number {
        const words = text.split(' ');
        let currentLine = '';
        let yPos = y;
        words.forEach((word) => {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const lineWidth = fontRegular.widthOfTextAtSize(testLine, 9);
            if (lineWidth > maxLineWidth && currentLine) {
                if (yPos < minY) return;
                page.drawText(currentLine, { x: margin, y: yPos, size: 9, font: fontRegular });
                yPos -= 12;
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });
        if (currentLine && yPos >= minY) {
            page.drawText(currentLine, { x: margin, y: yPos, size: 9, font: fontRegular });
            yPos -= 12;
        }
        return yPos;
    }

    // ========== PAGINACIÓN ==========
    const footerHeight = 200;
    const minRowY = margin + 30;

    let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let yPosition = PAGE_HEIGHT - margin;
    let pageNumber = 1;

    // ========== PÁGINA 1: ENCABEZADO COMPLETO ==========
    if (logoImage) {
        currentPage.drawImage(logoImage, {
            x: margin,
            y: yPosition - logoHeight,
            width: logoWidth,
            height: logoHeight,
        });
    }

    const systemLabel = 'Sistema de Inventario TI';
    currentPage.drawText(systemLabel, {
        x: PAGE_WIDTH - margin - fontRegular.widthOfTextAtSize(systemLabel, 9),
        y: yPosition,
        size: 9,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3),
    });
    yPosition -= 15;

    const today = new Date(data.loanStartDate);
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    currentPage.drawText(formattedDate, {
        x: PAGE_WIDTH - margin - fontRegular.widthOfTextAtSize(formattedDate, 9),
        y: yPosition,
        size: 9,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3),
    });
    yPosition -= 10;

    const titleSize = 14;
    const title = 'TECNOLOGÍA DE LA INFORMACIÓN';
    currentPage.drawText(title, {
        x: PAGE_WIDTH / 2 - (fontBold.widthOfTextAtSize(title, titleSize) / 2),
        y: yPosition,
        size: titleSize,
        font: fontBold,
        color: rgb(0, 0, 0),
    });
    yPosition -= 20;

    const subtitleSize = 12;
    const subtitle = 'PRÉSTAMO DE EQUIPO DE CÓMPUTO';
    currentPage.drawText(subtitle, {
        x: PAGE_WIDTH / 2 - (fontBold.widthOfTextAtSize(subtitle, subtitleSize) / 2),
        y: yPosition,
        size: subtitleSize,
        font: fontBold,
        color: rgb(0, 0, 0),
    });
    yPosition -= 30;

    currentPage.drawLine({
        start: { x: margin, y: yPosition },
        end: { x: PAGE_WIDTH - margin, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
    });
    yPosition -= 20;

    // Información del colaborador
    const infoFontSize = 10;
    const collaboratorLine = `${data.collaboratorName || data.collaboratorId}   ${data.departmentName || ''}   ${data.hotelName || ''}`;
    currentPage.drawText(collaboratorLine, {
        x: margin, y: yPosition, size: infoFontSize, font: fontRegular,
    });
    yPosition -= 15;

    // Fechas de préstamo y devolución
    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const loanStartText = `Fecha de préstamo :   ${formatDate(data.loanStartDate)}`;
    const loanReturnText = `Fecha de devolución :   ${formatDate(data.loanReturnDate)}`;
    currentPage.drawText(loanStartText, {
        x: margin, y: yPosition, size: infoFontSize, font: fontRegular,
    });
    currentPage.drawText(loanReturnText, {
        x: margin + 250, y: yPosition, size: infoFontSize, font: fontRegular,
    });
    yPosition -= 20;

    const introText = 'Recibí en préstamo los equipos que a continuación se describen:';
    currentPage.drawText(introText, {
        x: margin, y: yPosition, size: infoFontSize, font: fontRegular,
    });
    yPosition -= 15;

    // Encabezados de tabla
    yPosition = drawTableHeaders(currentPage, yPosition);

    // ========== RENDERIZAR TODAS LAS FILAS DE EQUIPOS ==========
    for (let itemIndex = 0; itemIndex < data.equipment.length; itemIndex++) {
        const item = data.equipment[itemIndex];
        const bottomLimit = minRowY;

        if (yPosition - rowHeight < bottomLimit) {
            pageNumber++;
            currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            yPosition = PAGE_HEIGHT - margin;

            if (logoImage) {
                currentPage.drawImage(logoImage, {
                    x: margin,
                    y: yPosition - logoHeight,
                    width: logoWidth,
                    height: logoHeight,
                });
            }

            const contLabel = 'PRÉSTAMO DE EQUIPO DE CÓMPUTO (continuación)';
            currentPage.drawText(contLabel, {
                x: PAGE_WIDTH / 2 - (fontBold.widthOfTextAtSize(contLabel, 11) / 2),
                y: yPosition - 5,
                size: 11,
                font: fontBold,
            });
            yPosition -= 30;

            yPosition = drawTableHeaders(currentPage, yPosition);
        }

        drawEquipmentRow(currentPage, item, yPosition);
        yPosition -= rowHeight;
    }

    // ========== FOOTER: TEXTO DE RESPONSABILIDAD + FIRMAS ==========
    if (yPosition < margin + footerHeight) {
        currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        yPosition = PAGE_HEIGHT - margin;

        if (logoImage) {
            currentPage.drawImage(logoImage, {
                x: margin,
                y: yPosition - logoHeight,
                width: logoWidth,
                height: logoHeight,
            });
        }
        const contLabel = 'PRÉSTAMO DE EQUIPO DE CÓMPUTO (continuación)';
        currentPage.drawText(contLabel, {
            x: PAGE_WIDTH / 2 - (fontBold.widthOfTextAtSize(contLabel, 11) / 2),
            y: yPosition - 5,
            size: 11,
            font: fontBold,
        });
        yPosition -= 40;
    }
    yPosition -= 10;

    const termsText = `Acepto que he recibido equipo y accesorios que se describen, estoy obligado a conservarlos en buen estado, deberé utilizarlo exclusivamente para actividades laborales asignadas e informar al área de Soporte Técnico cualquier avería o falla que pueda presentarse durante la operación normal del equipo, cuando la empresa así lo requiera podré revisarlo para validar su estado por lo que deberé mantenerlo y resguardarlo adecuadamente en mi centro de trabajo, aceptaré la responsabilidad por mal uso o daño que pueda ocasionarle.`;
    yPosition = drawWrappedText(currentPage, termsText, yPosition, margin + 80);

    yPosition -= 15;

    const responsibilityTextEN = `I acknowledge that I have received computer equipment and accessories as described above. I am obligated to keep them in good condition and use them exclusively for assigned work activities. I will inform the Technical Support area of any fault or failure that may occur during the normal operation of the equipment. When the company requires, I will allow inspection to validate its condition, therefore I must properly maintain and safeguard it at my workplace. I accept responsibility for any misuse or damage that may occur.`;
    yPosition = drawWrappedText(currentPage, responsibilityTextEN, yPosition, margin + 40);

    yPosition -= 30;

    // ========== SECCIÓN DE FIRMAS ==========
    const lineLength = 200;
    const signature1X = margin + 50;
    const signature2X = PAGE_WIDTH - margin - lineLength - 50;

    currentPage.drawLine({
        start: { x: signature1X, y: yPosition },
        end: { x: signature1X + lineLength, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
    });
    currentPage.drawLine({
        start: { x: signature2X, y: yPosition },
        end: { x: signature2X + lineLength, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
    });
    yPosition -= 10;

    const collaboratorFullName = `${data.collaboratorId} / ${data.collaboratorName || data.collaboratorId}`;
    currentPage.drawText(collaboratorFullName, {
        x: signature1X + (lineLength / 2) - (fontBold.widthOfTextAtSize(collaboratorFullName, 9) / 2),
        y: yPosition,
        size: 9,
        font: fontBold,
    });
    currentPage.drawText(data.engineerName, {
        x: signature2X + (lineLength / 2) - (fontBold.widthOfTextAtSize(data.engineerName, 9) / 2),
        y: yPosition,
        size: 9,
        font: fontBold,
    });
    yPosition -= 15;

    currentPage.drawText('Firma del Colaborador', {
        x: signature1X + (lineLength / 2) - (fontRegular.widthOfTextAtSize('Firma del Colaborador', 9) / 2),
        y: yPosition,
        size: 9,
        font: fontRegular,
    });
    currentPage.drawText('Firma de Soporte Técnico', {
        x: signature2X + (lineLength / 2) - (fontRegular.widthOfTextAtSize('Firma de Soporte Técnico', 9) / 2),
        y: yPosition,
        size: 9,
        font: fontRegular,
    });

    // ========== GENERAR PDF ==========
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}

/**
 * Genera un PDF de resguardo para asignaciones manuales (sin número de colaborador)
 * Soporta múltiples páginas para asignaciones con muchos equipos
 * @param data Datos del colaborador y equipos asignados manualmente
 * @returns Buffer del PDF generado
 */
export async function generateManualAssignmentPDF(data: ManualAssignmentData): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const PAGE_WIDTH = 792;
    const PAGE_HEIGHT = 612;
    const margin = 50;
    const rowHeight = 25;
    const maxLineWidth = PAGE_WIDTH - (margin * 2);

    // Fuentes
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // ========== CARGAR LOGO (una sola vez) ==========
    let logoImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
    let logoWidth = 80;
    let logoHeight = 0;
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const sharp = (await import('sharp')).default;
        const logoPath = path.join(process.cwd(), 'public', 'images', 'PALACERESORTS.svg');
        const svgBuffer = await fs.readFile(logoPath);
        const pngBuffer = await sharp(svgBuffer).resize({ width: 120 }).png().toBuffer();
        logoImage = await pdfDoc.embedPng(pngBuffer);
        logoHeight = logoImage.height * (logoWidth / logoImage.width);
    } catch {
        console.warn('Logo no encontrado en public/images/PALACERESORTS.svg');
    }

    // Columnas de la tabla
    const cols = [
        { label: 'TIPO', x: margin, width: 80 },
        { label: 'MARCA', x: margin + 85, width: 100 },
        { label: 'MODELO', x: margin + 190, width: 150 },
        { label: 'No.Serie:', x: margin + 345, width: 200 },
    ];

    // --- Helper: dibujar encabezados de tabla ---
    function drawTableHeaders(page: ReturnType<typeof pdfDoc.addPage>, y: number): number {
        cols.forEach((col) => {
            page.drawText(col.label, {
                x: col.x + 5,
                y: y - 5,
                size: 9,
                font: fontBold,
            });
        });
        return y - rowHeight;
    }

    // --- Helper: dibujar una fila de equipo ---
    function drawEquipmentRow(page: ReturnType<typeof pdfDoc.addPage>, item: typeof data.equipment[0], y: number) {
        const values = [
            item.type || '—',
            item.brand || '—',
            item.model || '—',
            item.serial || '—',
        ];
        cols.forEach((col, i) => {
            page.drawText(values[i], {
                x: col.x + 5,
                y: y - 5,
                size: 9,
                font: fontRegular,
            });
        });
    }

    // --- Helper: dibujar texto multilínea ---
    function drawWrappedText(page: ReturnType<typeof pdfDoc.addPage>, text: string, y: number, minY: number): number {
        const words = text.split(' ');
        let currentLine = '';
        let yPos = y;
        words.forEach((word) => {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const lineWidth = fontRegular.widthOfTextAtSize(testLine, 9);
            if (lineWidth > maxLineWidth && currentLine) {
                if (yPos < minY) return;
                page.drawText(currentLine, { x: margin, y: yPos, size: 9, font: fontRegular });
                yPos -= 12;
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });
        if (currentLine && yPos >= minY) {
            page.drawText(currentLine, { x: margin, y: yPos, size: 9, font: fontRegular });
            yPos -= 12;
        }
        return yPos;
    }

    // ========== PAGINACIÓN ==========
    const footerHeight = 200;
    const minRowY = margin + 30;

    let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let yPosition = PAGE_HEIGHT - margin;
    let pageNumber = 1;

    // ========== PÁGINA 1: ENCABEZADO COMPLETO ==========
    if (logoImage) {
        currentPage.drawImage(logoImage, {
            x: margin,
            y: yPosition - logoHeight,
            width: logoWidth,
            height: logoHeight,
        });
    }

    const systemLabel = 'Sistema de Inventario TI';
    currentPage.drawText(systemLabel, {
        x: PAGE_WIDTH - margin - fontRegular.widthOfTextAtSize(systemLabel, 9),
        y: yPosition,
        size: 9,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3),
    });
    yPosition -= 15;

    const today = new Date(data.assignedAt);
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    currentPage.drawText(formattedDate, {
        x: PAGE_WIDTH - margin - fontRegular.widthOfTextAtSize(formattedDate, 9),
        y: yPosition,
        size: 9,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3),
    });
    yPosition -= 10;

    const titleSize = 14;
    const title = 'TECNOLOGÍA DE LA INFORMACIÓN';
    currentPage.drawText(title, {
        x: PAGE_WIDTH / 2 - (fontBold.widthOfTextAtSize(title, titleSize) / 2),
        y: yPosition,
        size: titleSize,
        font: fontBold,
        color: rgb(0, 0, 0),
    });
    yPosition -= 20;

    const subtitleSize = 12;
    const subtitle = 'RESGUARDO DE EQUIPO DE CÓMPUTO';
    currentPage.drawText(subtitle, {
        x: PAGE_WIDTH / 2 - (fontBold.widthOfTextAtSize(subtitle, subtitleSize) / 2),
        y: yPosition,
        size: subtitleSize,
        font: fontBold,
        color: rgb(0, 0, 0),
    });
    yPosition -= 30;

    currentPage.drawLine({
        start: { x: margin, y: yPosition },
        end: { x: PAGE_WIDTH - margin, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
    });
    yPosition -= 20;

    // Información del colaborador
    const infoFontSize = 10;
    const collaboratorLine = `${data.collaboratorName}   ${data.departmentName || ''}   ${data.hotelName || ''}`;
    currentPage.drawText(collaboratorLine, {
        x: margin, y: yPosition, size: infoFontSize, font: fontRegular,
    });
    yPosition -= 15;

    if (data.collaboratorEmail) {
        const emailText = `Email: ${data.collaboratorEmail}`;
        currentPage.drawText(emailText, {
            x: margin, y: yPosition, size: infoFontSize, font: fontRegular,
        });
        yPosition -= 25;
    } else {
        yPosition -= 10;
    }

    const introText = 'Recibí en resguardo los equipos que a continuación se describen:';
    currentPage.drawText(introText, {
        x: margin, y: yPosition, size: infoFontSize, font: fontRegular,
    });
    yPosition -= 20;

    // Encabezados de tabla
    yPosition = drawTableHeaders(currentPage, yPosition);

    // ========== RENDERIZAR TODAS LAS FILAS DE EQUIPOS ==========
    for (let itemIndex = 0; itemIndex < data.equipment.length; itemIndex++) {
        const item = data.equipment[itemIndex];
        const bottomLimit = minRowY;

        if (yPosition - rowHeight < bottomLimit) {
            pageNumber++;
            currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            yPosition = PAGE_HEIGHT - margin;

            if (logoImage) {
                currentPage.drawImage(logoImage, {
                    x: margin,
                    y: yPosition - logoHeight,
                    width: logoWidth,
                    height: logoHeight,
                });
            }

            const contLabel = 'RESGUARDO DE EQUIPO DE CÓMPUTO (continuación)';
            currentPage.drawText(contLabel, {
                x: PAGE_WIDTH / 2 - (fontBold.widthOfTextAtSize(contLabel, 11) / 2),
                y: yPosition - 5,
                size: 11,
                font: fontBold,
            });
            yPosition -= 30;

            yPosition = drawTableHeaders(currentPage, yPosition);
        }

        drawEquipmentRow(currentPage, item, yPosition);
        yPosition -= rowHeight;
    }

    // ========== FOOTER: TEXTO DE RESPONSABILIDAD + FIRMAS ==========
    if (yPosition < margin + footerHeight) {
        currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        yPosition = PAGE_HEIGHT - margin;

        if (logoImage) {
            currentPage.drawImage(logoImage, {
                x: margin,
                y: yPosition - logoHeight,
                width: logoWidth,
                height: logoHeight,
            });
        }
        const contLabel = 'RESGUARDO DE EQUIPO DE CÓMPUTO (continuación)';
        currentPage.drawText(contLabel, {
            x: PAGE_WIDTH / 2 - (fontBold.widthOfTextAtSize(contLabel, 11) / 2),
            y: yPosition - 5,
            size: 11,
            font: fontBold,
        });
        yPosition -= 40;
    }
    yPosition -= 10;

    const responsibilityText = `Acepto que he recibido equipo de cómputo y accesorios que se describen, estoy obligado a conservarlos en buen estado, deberé utilizarlo exclusivamente para actividades laborales asignadas e informar al área de Soporte Técnico cualquier avería o falla que pueda presentarse durante la operación normal del equipo, cuando la empresa así lo requiera podré revisarlo para validar su estado por lo que deberé mantenerlo y resguardarlo adecuadamente en mi centro de trabajo, aceptaré la responsabilidad por mal uso o daño que pueda ocasionarle.`;
    yPosition = drawWrappedText(currentPage, responsibilityText, yPosition, margin + 80);

    yPosition -= 15;

    const responsibilityTextEN = `I acknowledge that I have received computer equipment and accessories as described above. I am obligated to keep them in good condition and use them exclusively for assigned work activities. I will inform the Technical Support area of any fault or failure that may occur during the normal operation of the equipment. When the company requires, I will allow inspection to validate its condition, therefore I must properly maintain and safeguard it at my workplace. I accept responsibility for any misuse or damage that may occur.`;
    yPosition = drawWrappedText(currentPage, responsibilityTextEN, yPosition, margin + 40);

    yPosition -= 30;

    // ========== SECCIÓN DE FIRMAS ==========
    const lineLength = 200;
    const signature1X = margin + 50;
    const signature2X = PAGE_WIDTH - margin - lineLength - 50;

    currentPage.drawLine({
        start: { x: signature1X, y: yPosition },
        end: { x: signature1X + lineLength, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
    });
    currentPage.drawLine({
        start: { x: signature2X, y: yPosition },
        end: { x: signature2X + lineLength, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
    });
    yPosition -= 10;

    currentPage.drawText(data.collaboratorName, {
        x: signature1X + (lineLength / 2) - (fontBold.widthOfTextAtSize(data.collaboratorName, 9) / 2),
        y: yPosition,
        size: 9,
        font: fontBold,
    });
    currentPage.drawText(data.engineerName, {
        x: signature2X + (lineLength / 2) - (fontBold.widthOfTextAtSize(data.engineerName, 9) / 2),
        y: yPosition,
        size: 9,
        font: fontBold,
    });
    yPosition -= 15;

    currentPage.drawText('Firma del Colaborador', {
        x: signature1X + (lineLength / 2) - (fontRegular.widthOfTextAtSize('Firma del Colaborador', 9) / 2),
        y: yPosition,
        size: 9,
        font: fontRegular,
    });
    currentPage.drawText('Firma de Soporte Técnico', {
        x: signature2X + (lineLength / 2) - (fontRegular.widthOfTextAtSize('Firma de Soporte Técnico', 9) / 2),
        y: yPosition,
        size: 9,
        font: fontRegular,
    });

    // ========== GENERAR PDF ==========
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}
