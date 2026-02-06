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
 * @param data Datos del colaborador y equipos asignados
 * @returns Buffer del PDF generado
 */
export async function generateAssignmentPDF(data: AssignmentData): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    // Página en orientación HORIZONTAL (landscape): 11" x 8.5"
    const page = pdfDoc.addPage([792, 612]); // Invertido para landscape

    const { width, height } = page.getSize();
    const margin = 50;
    let yPosition = height - margin;

    // Fuentes
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // ========== CARGAR Y AGREGAR LOGO ==========
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const sharp = (await import('sharp')).default;

        // Ruta al logo SVG en public/images/
        const logoPath = path.join(process.cwd(), 'public', 'images', 'PALACERESORTS.svg');
        const svgBuffer = await fs.readFile(logoPath);

        // Convertir SVG a PNG usando sharp
        const pngBuffer = await sharp(svgBuffer)
            .resize({ width: 120 })
            .png()
            .toBuffer();

        const logoImage = await pdfDoc.embedPng(pngBuffer);

        // Dimensiones del logo (escalado apropiadamente)
        const logoWidth = 80;
        const logoHeight = logoImage.height * (logoWidth / logoImage.width);

        // Dibujar logo en esquina superior izquierda
        page.drawImage(logoImage, {
            x: margin,
            y: yPosition - logoHeight,
            width: logoWidth,
            height: logoHeight,
        });
    } catch (error) {
        // Si no se encuentra el logo, continuar sin él
        console.warn('Logo no encontrado en public/images/PALACERESORTS.svg:', error);
    }


    // ========== ENCABEZADO ==========
    const titleSize = 14;
    const subtitleSize = 12;

    // Sistema de Inventario TI y fecha (arriba a la derecha)
    const systemLabel = 'Sistema de Inventario TI';
    page.drawText(systemLabel, {
        x: width - margin - fontRegular.widthOfTextAtSize(systemLabel, 9),
        y: yPosition,
        size: 9,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3),
    });

    yPosition -= 15;

    const today = new Date(data.assignedAt);
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    page.drawText(formattedDate, {
        x: width - margin - fontRegular.widthOfTextAtSize(formattedDate, 9),
        y: yPosition,
        size: 9,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3),
    });

    yPosition -= 10;

    // Título principal
    const title = 'TECNOLOGÍA DE LA INFORMACIÓN';
    page.drawText(title, {
        x: width / 2 - (fontBold.widthOfTextAtSize(title, titleSize) / 2),
        y: yPosition,
        size: titleSize,
        font: fontBold,
        color: rgb(0, 0, 0),
    });
    yPosition -= 20;

    // Subtítulo
    const subtitle = 'RESGUARDO DE EQUIPO DE CÓMPUTO';
    page.drawText(subtitle, {
        x: width / 2 - (fontBold.widthOfTextAtSize(subtitle, subtitleSize) / 2),
        y: yPosition,
        size: subtitleSize,
        font: fontBold,
        color: rgb(0, 0, 0),
    });
    yPosition -= 30;

    // Línea separadora
    page.drawLine({
        start: { x: margin, y: yPosition },
        end: { x: width - margin, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
    });
    yPosition -= 20;

    // ========== INFORMACIÓN DEL COLABORADOR ==========
    const infoFontSize = 10;

    // Nombre completo, departamento y hotel/company
    const collaboratorLine = `${data.collaboratorName || data.collaboratorId}   ${data.departmentName || ''}   ${data.hotelName || ''}`;
    page.drawText(collaboratorLine, {
        x: margin,
        y: yPosition,
        size: infoFontSize,
        font: fontRegular,
    });
    yPosition -= 20;

    // Nombre del equipo (team name)
    if (data.teamName) {
        const teamText = `Nombre de equipo :   ${data.teamName}`;
        page.drawText(teamText, {
            x: margin,
            y: yPosition,
            size: infoFontSize,
            font: fontRegular,
        });
        yPosition -= 25;
    }

    // Texto introductorio
    const introText = 'Recibí en resguardo los equipos que a continuación se describen:';
    page.drawText(introText, {
        x: margin,
        y: yPosition,
        size: infoFontSize,
        font: fontRegular,
    });
    yPosition -= 20;

    // ========== TABLA DE EQUIPOS ==========
    const tableTop = yPosition;
    const rowHeight = 25;
    const cols = [
        { label: 'TIPO', x: margin, width: 80 },
        { label: 'MARCA', x: margin + 85, width: 100 },
        { label: 'MODELO', x: margin + 190, width: 150 },
        { label: 'No.Serie:', x: margin + 345, width: 200 },
    ];

    // Encabezados de tabla
    cols.forEach((col) => {
        page.drawText(col.label, {
            x: col.x + 5,
            y: yPosition - 5,
            size: 9,
            font: fontBold,
        });
    });

    yPosition -= rowHeight;

    // Filas de equipos
    data.equipment.forEach((item, index) => {
        const rowY = yPosition - (index * rowHeight);

        // Verificar que no se pase del espacio disponible
        if (rowY < margin + 150) {
            return; // Evitar que el contenido se salga de la página
        }

        const values = [
            item.type || '—',
            item.brand || '—',
            item.model || '—',
            item.serial || '—',
        ];

        cols.forEach((col, i) => {
            const text = values[i];
            page.drawText(text, {
                x: col.x + 5,
                y: rowY - 5,
                size: 9,
                font: fontRegular,
            });
        });
    });


    yPosition -= (data.equipment.length * rowHeight) + 10;

    // ========== TEXTO DE RESPONSABILIDAD ==========
    const responsibilityText = `Acepto que he recibido equipo de cómputo y accesorios que se describen, estoy obligado a conservarlos en buen estado, deberé utilizarlo exclusivamente para actividades laborales asignadas e informar al área de Soporte Técnico cualquier avería o falla que pueda presentarse durante la operación normal del equipo, cuando la empresa así lo requiera podré revisarlo para validar su estado por lo que deberé mantenerlo y resguardarlo adecuadamente en mi centro de trabajo, ac eptaré la responsabilidad por mal uso o daño que pueda ocasionarle.`;

    // Dividir texto largo en líneas
    const words = responsibilityText.split(' ');
    let currentLine = '';
    const maxLineWidth = width - (margin * 2);

    words.forEach((word) => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const lineWidth = fontRegular.widthOfTextAtSize(testLine, 9);

        if (lineWidth > maxLineWidth && currentLine) {
            if (yPosition < margin + 80) return; // Evitar salirse de la página

            page.drawText(currentLine, {
                x: margin,
                y: yPosition,
                size: 9,
                font: fontRegular,
            });
            yPosition -= 12;
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    });

    if (currentLine && yPosition >= margin + 80) {
        page.drawText(currentLine, {
            x: margin,
            y: yPosition,
            size: 9,
            font: fontRegular,
        });
        yPosition -= 12;
    }

    yPosition -= 20;

    // ========== TEXTO EN INGLÉS ==========
    const responsibilityTextEN = `I acknowledge that I have received computer equipment and accessories as described above. I am obligated to keep them in good condition and use them exclusively for assigned work activities. I will inform the Technical Support area of any fault or failure that may occur during the normal operation of the equipment. When the company requires, I will allow inspection to validate its condition, therefore I must properly maintain and safeguard it at my workplace. I accept responsibility for any misuse or damage that may occur.`;

    // Dividir texto en inglés
    const wordsEN = responsibilityTextEN.split(' ');
    let currentLineEN = '';

    wordsEN.forEach((word) => {
        const testLine = currentLineEN ? `${currentLineEN} ${word}` : word;
        const lineWidth = fontRegular.widthOfTextAtSize(testLine, 9);

        if (lineWidth > maxLineWidth && currentLineEN) {
            if (yPosition < margin + 80) return;

            page.drawText(currentLineEN, {
                x: margin,
                y: yPosition,
                size: 9,
                font: fontRegular,
            });
            yPosition -= 12;
            currentLineEN = word;
        } else {
            currentLineEN = testLine;
        }
    });

    if (currentLineEN && yPosition >= margin + 80) {
        page.drawText(currentLineEN, {
            x: margin,
            y: yPosition,
            size: 9,
            font: fontRegular,
        });
        yPosition -= 12;
    }

    yPosition -= 40;

    // ========== SECCIÓN DE FIRMAS ==========
    const lineLength = 200;
    const signature1X = margin + 50;
    const signature2X = width - margin - lineLength - 50;

    // Líneas de firma
    page.drawLine({
        start: { x: signature1X, y: yPosition },
        end: { x: signature1X + lineLength, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
    });

    page.drawLine({
        start: { x: signature2X, y: yPosition },
        end: { x: signature2X + lineLength, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
    });

    yPosition -= 10;

    // Nombres debajo de las líneas
    const collaboratorFullName = `${data.collaboratorId} / ${data.collaboratorName || data.collaboratorId}`;

    page.drawText(collaboratorFullName, {
        x: signature1X + (lineLength / 2) - (fontBold.widthOfTextAtSize(collaboratorFullName, 9) / 2),
        y: yPosition,
        size: 9,
        font: fontBold,
    });

    page.drawText(data.engineerName, {
        x: signature2X + (lineLength / 2) - (fontBold.widthOfTextAtSize(data.engineerName, 9) / 2),
        y: yPosition,
        size: 9,
        font: fontBold,
    });

    yPosition -= 15;

    // Labels
    page.drawText('Firma del Colaborador', {
        x: signature1X + (lineLength / 2) - (fontRegular.widthOfTextAtSize('Firma del Colaborador', 9) / 2),
        y: yPosition,
        size: 9,
        font: fontRegular,
    });

    page.drawText('Firma de Soporte Técnico', {
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
 * @param data Datos del colaborador, fechas de préstamo y equipos
 * @returns Buffer del PDF generado
 */
export async function generateLoanPDF(data: LoanData): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    // Página en orientación HORIZONTAL (landscape): 11" x 8.5"
    const page = pdfDoc.addPage([792, 612]); // Invertido para landscape

    const { width, height } = page.getSize();
    const margin = 50;
    let yPosition = height - margin;

    // Fuentes
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // ========== CARGAR Y AGREGAR LOGO ==========
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const sharp = (await import('sharp')).default;

        // Ruta al logo SVG en public/images/
        const logoPath = path.join(process.cwd(), 'public', 'images', 'PALACERESORTS.svg');
        const svgBuffer = await fs.readFile(logoPath);

        // Convertir SVG a PNG usando sharp
        const pngBuffer = await sharp(svgBuffer)
            .resize({ width: 120 })
            .png()
            .toBuffer();

        const logoImage = await pdfDoc.embedPng(pngBuffer);

        // Dimensiones del logo (escalado apropiadamente)
        const logoWidth = 80;
        const logoHeight = logoImage.height * (logoWidth / logoImage.width);

        // Dibujar logo en esquina superior izquierda
        page.drawImage(logoImage, {
            x: margin,
            y: yPosition - logoHeight,
            width: logoWidth,
            height: logoHeight,
        });
    } catch (error) {
        // Si no se encuentra el logo, continuar sin él
        console.warn('Logo no encontrado en public/images/PALACERESORTS.svg:', error);
    }

    // ========== ENCABEZADO ==========
    const titleSize = 14;
    const subtitleSize = 12;

    // Sistema de Inventario TI y fecha (arriba a la derecha)
    const systemLabel = 'Sistema de Inventario TI';
    page.drawText(systemLabel, {
        x: width - margin - fontRegular.widthOfTextAtSize(systemLabel, 9),
        y: yPosition,
        size: 9,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3),
    });

    yPosition -= 15;

    const today = new Date(data.loanStartDate);
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    page.drawText(formattedDate, {
        x: width - margin - fontRegular.widthOfTextAtSize(formattedDate, 9),
        y: yPosition,
        size: 9,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3),
    });

    yPosition -= 10;

    // Título principal
    const title = 'TECNOLOGÍA DE LA INFORMACIÓN';
    page.drawText(title, {
        x: width / 2 - (fontBold.widthOfTextAtSize(title, titleSize) / 2),
        y: yPosition,
        size: titleSize,
        font: fontBold,
        color: rgb(0, 0, 0),
    });
    yPosition -= 20;

    // Subtítulo
    const subtitle = 'PRÉSTAMO DE EQUIPO DE CÓMPUTO';
    page.drawText(subtitle, {
        x: width / 2 - (fontBold.widthOfTextAtSize(subtitle, subtitleSize) / 2),
        y: yPosition,
        size: subtitleSize,
        font: fontBold,
        color: rgb(0, 0, 0),
    });
    yPosition -= 30;

    // Línea separadora
    page.drawLine({
        start: { x: margin, y: yPosition },
        end: { x: width - margin, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
    });
    yPosition -= 20;

    // ========== INFORMACIÓN DEL COLABORADOR ==========
    const infoFontSize = 10;

    // Nombre completo, departamento y hotel/company
    const collaboratorLine = `${data.collaboratorName || data.collaboratorId}   ${data.departmentName || ''}   ${data.hotelName || ''}`;
    page.drawText(collaboratorLine, {
        x: margin,
        y: yPosition,
        size: infoFontSize,
        font: fontRegular,
    });
    yPosition -= 15;

    // ========== FECHAS DE PRÉSTAMO Y DEVOLUCIÓN ==========
    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const loanStartText = `Fecha de préstamo :   ${formatDate(data.loanStartDate)}`;
    const loanReturnText = `Fecha de devolución :   ${formatDate(data.loanReturnDate)}`;

    page.drawText(loanStartText, {
        x: margin,
        y: yPosition,
        size: infoFontSize,
        font: fontRegular,
    });

    page.drawText(loanReturnText, {
        x: margin + 250,
        y: yPosition,
        size: infoFontSize,
        font: fontRegular,
    });
    yPosition -= 20;

    // Texto introductorio
    const introText = 'Recibí en préstamo los equipos que a continuación se describen:';
    page.drawText(introText, {
        x: margin,
        y: yPosition,
        size: infoFontSize,
        font: fontRegular,
    });
    yPosition -= 15;

    // ========== TABLA DE EQUIPOS ==========
    const tableTop = yPosition;
    const rowHeight = 25; // Aumentado de 20 a 25 para mejor legibilidad
    const cols = [
        { label: 'TIPO', x: margin, width: 80 },
        { label: 'MARCA', x: margin + 85, width: 100 },
        { label: 'MODELO', x: margin + 190, width: 150 },
        { label: 'No.Serie:', x: margin + 345, width: 200 },
    ];

    // Encabezados de tabla
    cols.forEach((col) => {
        page.drawText(col.label, {
            x: col.x + 5,
            y: yPosition - 5,
            size: 9,
            font: fontBold,
        });
    });

    // Sin línea debajo del encabezado (tabla sin líneas)
    yPosition -= rowHeight;

    // Filas de equipos
    data.equipment.forEach((item, index) => {
        const rowY = yPosition - (index * rowHeight);

        // Verificar que no se pase del espacio disponible
        if (rowY < margin + 150) {
            return; // Evitar que el contenido se salga de la página
        }

        const values = [
            item.type || '—',
            item.brand || '—',
            item.model || '—',
            item.serial || '—',
        ];

        cols.forEach((col, i) => {
            const text = values[i];
            page.drawText(text, {
                x: col.x + 5,
                y: rowY - 5,
                size: 9,
                font: fontRegular,
            });
        });
    });

    yPosition -= (data.equipment.length * rowHeight) + 15;

    // ========== TÉRMINOS Y CONDICIONES ==========
    const termsText = `Acepto que he recibido equipo y accesorios que se describen, estoy obligado a conservarlos en buen estado, deberé utilizarlo exclusivamente para actividades laborales asignadas e informar al área de Soporte Técnico cualquier avería o falla que pueda presentarse durante la operación normal del equipo, cuando la empresa así lo requiera podré revisarlo para validar su estado por lo que deberé mantenerlo y resguardarlo adecuadamente en mi centro de trabajo, aceptaré la responsabilidad por mal uso o daño que pueda ocasionarle.`;

    // Dividir texto largo en líneas
    const words = termsText.split(' ');
    let currentLine = '';
    const maxLineWidth = width - (margin * 2);

    words.forEach((word) => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const lineWidth = fontRegular.widthOfTextAtSize(testLine, 9);

        if (lineWidth > maxLineWidth && currentLine) {
            if (yPosition < margin + 80) return;

            page.drawText(currentLine, {
                x: margin,
                y: yPosition,
                size: 9,
                font: fontRegular,
            });
            yPosition -= 12;
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    });

    if (currentLine && yPosition >= margin + 80) {
        page.drawText(currentLine, {
            x: margin,
            y: yPosition,
            size: 9,
            font: fontRegular,
        });
        yPosition -= 12;
    }

    yPosition -= 20;

    // ========== TEXTO EN INGLÉS ==========
    const responsibilityTextEN = `I acknowledge that I have received computer equipment and accessories as described above. I am obligated to keep them in good condition and use them exclusively for assigned work activities. I will inform the Technical Support area of any fault or failure that may occur during the normal operation of the equipment. When the company requires, I will allow inspection to validate its condition, therefore I must properly maintain and safeguard it at my workplace. I accept responsibility for any misuse or damage that may occur.`;

    // Dividir texto en inglés
    const wordsEN = responsibilityTextEN.split(' ');
    let currentLineEN = '';

    wordsEN.forEach((word) => {
        const testLine = currentLineEN ? `${currentLineEN} ${word}` : word;
        const lineWidth = fontRegular.widthOfTextAtSize(testLine, 9);

        if (lineWidth > maxLineWidth && currentLineEN) {
            if (yPosition < margin + 80) return;

            page.drawText(currentLineEN, {
                x: margin,
                y: yPosition,
                size: 9,
                font: fontRegular,
            });
            yPosition -= 12;
            currentLineEN = word;
        } else {
            currentLineEN = testLine;
        }
    });

    if (currentLineEN && yPosition >= margin + 80) {
        page.drawText(currentLineEN, {
            x: margin,
            y: yPosition,
            size: 9,
            font: fontRegular,
        });
        yPosition -= 12;
    }

    yPosition -= 40;

    // ========== SECCIÓN DE FIRMAS ==========
    const lineLength = 200;
    const signature1X = margin + 50;
    const signature2X = width - margin - lineLength - 50;

    // Líneas de firma
    page.drawLine({
        start: { x: signature1X, y: yPosition },
        end: { x: signature1X + lineLength, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
    });

    page.drawLine({
        start: { x: signature2X, y: yPosition },
        end: { x: signature2X + lineLength, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
    });

    yPosition -= 10;

    // Nombres debajo de las líneas
    const collaboratorFullName = `${data.collaboratorId} / ${data.collaboratorName || data.collaboratorId}`;

    page.drawText(collaboratorFullName, {
        x: signature1X + (lineLength / 2) - (fontBold.widthOfTextAtSize(collaboratorFullName, 9) / 2),
        y: yPosition,
        size: 9,
        font: fontBold,
    });

    page.drawText(data.engineerName, {
        x: signature2X + (lineLength / 2) - (fontBold.widthOfTextAtSize(data.engineerName, 9) / 2),
        y: yPosition,
        size: 9,
        font: fontBold,
    });

    yPosition -= 15;

    // Labels
    page.drawText('Firma del Colaborador', {
        x: signature1X + (lineLength / 2) - (fontRegular.widthOfTextAtSize('Firma del Colaborador', 9) / 2),
        y: yPosition,
        size: 9,
        font: fontRegular,
    });

    page.drawText('Firma de Soporte Técnico', {
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
 * @param data Datos del colaborador y equipos asignados manualmente
 * @returns Buffer del PDF generado
 */
export async function generateManualAssignmentPDF(data: ManualAssignmentData): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    // Página en orientación HORIZONTAL (landscape): 11" x 8.5"
    const page = pdfDoc.addPage([792, 612]);

    const { width, height } = page.getSize();
    const margin = 50;
    let yPosition = height - margin;

    // Fuentes
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // ========== CARGAR Y AGREGAR LOGO ==========
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const sharp = (await import('sharp')).default;

        const logoPath = path.join(process.cwd(), 'public', 'images', 'PALACERESORTS.svg');
        const svgBuffer = await fs.readFile(logoPath);

        const pngBuffer = await sharp(svgBuffer)
            .resize({ width: 120 })
            .png()
            .toBuffer();

        const logoImage = await pdfDoc.embedPng(pngBuffer);

        const logoWidth = 80;
        const logoHeight = logoImage.height * (logoWidth / logoImage.width);

        page.drawImage(logoImage, {
            x: margin,
            y: yPosition - logoHeight,
            width: logoWidth,
            height: logoHeight,
        });
    } catch (error) {
        console.warn('Logo no encontrado en public/images/PALACERESORTS.svg:', error);
    }

    // ========== ENCABEZADO ==========
    const titleSize = 14;
    const subtitleSize = 12;

    // Sistema de Inventario TI y fecha (arriba a la derecha)
    const systemLabel = 'Sistema de Inventario TI';
    page.drawText(systemLabel, {
        x: width - margin - fontRegular.widthOfTextAtSize(systemLabel, 9),
        y: yPosition,
        size: 9,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3),
    });

    yPosition -= 15;

    const today = new Date(data.assignedAt);
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    page.drawText(formattedDate, {
        x: width - margin - fontRegular.widthOfTextAtSize(formattedDate, 9),
        y: yPosition,
        size: 9,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3),
    });

    yPosition -= 10;

    // Título principal
    const title = 'TECNOLOGÍA DE LA INFORMACIÓN';
    page.drawText(title, {
        x: width / 2 - (fontBold.widthOfTextAtSize(title, titleSize) / 2),
        y: yPosition,
        size: titleSize,
        font: fontBold,
        color: rgb(0, 0, 0),
    });
    yPosition -= 20;

    // Subtítulo
    const subtitle = 'RESGUARDO DE EQUIPO DE CÓMPUTO';
    page.drawText(subtitle, {
        x: width / 2 - (fontBold.widthOfTextAtSize(subtitle, subtitleSize) / 2),
        y: yPosition,
        size: subtitleSize,
        font: fontBold,
        color: rgb(0, 0, 0),
    });
    yPosition -= 30;

    // Línea separadora
    page.drawLine({
        start: { x: margin, y: yPosition },
        end: { x: width - margin, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
    });
    yPosition -= 20;

    // ========== INFORMACIÓN DEL COLABORADOR ==========
    const infoFontSize = 10;

    // Nombre completo, departamento y hotel
    const collaboratorLine = `${data.collaboratorName}   ${data.departmentName || ''}   ${data.hotelName || ''}`;
    page.drawText(collaboratorLine, {
        x: margin,
        y: yPosition,
        size: infoFontSize,
        font: fontRegular,
    });
    yPosition -= 15;

    // Email (si existe)
    if (data.collaboratorEmail) {
        const emailText = `Email: ${data.collaboratorEmail}`;
        page.drawText(emailText, {
            x: margin,
            y: yPosition,
            size: infoFontSize,
            font: fontRegular,
        });
        yPosition -= 25;
    } else {
        yPosition -= 10;
    }

    // Texto introductorio
    const introText = 'Recibí en resguardo los equipos que a continuación se describen:';
    page.drawText(introText, {
        x: margin,
        y: yPosition,
        size: infoFontSize,
        font: fontRegular,
    });
    yPosition -= 20;

    // ========== TABLA DE EQUIPOS ==========
    const rowHeight = 25;
    const cols = [
        { label: 'TIPO', x: margin, width: 80 },
        { label: 'MARCA', x: margin + 85, width: 100 },
        { label: 'MODELO', x: margin + 190, width: 150 },
        { label: 'No.Serie:', x: margin + 345, width: 200 },
    ];

    // Encabezados de tabla
    cols.forEach((col) => {
        page.drawText(col.label, {
            x: col.x + 5,
            y: yPosition - 5,
            size: 9,
            font: fontBold,
        });
    });

    yPosition -= rowHeight;

    // Filas de equipos
    data.equipment.forEach((item, index) => {
        const rowY = yPosition - (index * rowHeight);

        if (rowY < margin + 150) {
            return;
        }

        const values = [
            item.type || '—',
            item.brand || '—',
            item.model || '—',
            item.serial || '—',
        ];

        cols.forEach((col, i) => {
            const text = values[i];
            page.drawText(text, {
                x: col.x + 5,
                y: rowY - 5,
                size: 9,
                font: fontRegular,
            });
        });
    });

    yPosition -= (data.equipment.length * rowHeight) + 10;

    // ========== TEXTO DE RESPONSABILIDAD ==========
    const responsibilityText = `Acepto que he recibido equipo de cómputo y accesorios que se describen, estoy obligado a conservarlos en buen estado, deberé utilizarlo exclusivamente para actividades laborales asignadas e informar al área de Soporte Técnico cualquier avería o falla que pueda presentarse durante la operación normal del equipo, cuando la empresa así lo requiera podré revisarlo para validar su estado por lo que deberé mantenerlo y resguardarlo adecuadamente en mi centro de trabajo, aceptaré la responsabilidad por mal uso o daño que pueda ocasionarle.`;

    // Dividir texto largo en líneas
    const words = responsibilityText.split(' ');
    let currentLine = '';
    const maxLineWidth = width - (margin * 2);

    words.forEach((word) => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const lineWidth = fontRegular.widthOfTextAtSize(testLine, 9);

        if (lineWidth > maxLineWidth && currentLine) {
            if (yPosition < margin + 80) return;

            page.drawText(currentLine, {
                x: margin,
                y: yPosition,
                size: 9,
                font: fontRegular,
            });
            yPosition -= 12;
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    });

    if (currentLine && yPosition >= margin + 80) {
        page.drawText(currentLine, {
            x: margin,
            y: yPosition,
            size: 9,
            font: fontRegular,
        });
        yPosition -= 12;
    }

    yPosition -= 20;

    // ========== TEXTO EN INGLÉS ==========
    const responsibilityTextEN = `I acknowledge that I have received computer equipment and accessories as described above. I am obligated to keep them in good condition and use them exclusively for assigned work activities. I will inform the Technical Support area of any fault or failure that may occur during the normal operation of the equipment. When the company requires, I will allow inspection to validate its condition, therefore I must properly maintain and safeguard it at my workplace. I accept responsibility for any misuse or damage that may occur.`;

    const wordsEN = responsibilityTextEN.split(' ');
    let currentLineEN = '';

    wordsEN.forEach((word) => {
        const testLine = currentLineEN ? `${currentLineEN} ${word}` : word;
        const lineWidth = fontRegular.widthOfTextAtSize(testLine, 9);

        if (lineWidth > maxLineWidth && currentLineEN) {
            if (yPosition < margin + 80) return;

            page.drawText(currentLineEN, {
                x: margin,
                y: yPosition,
                size: 9,
                font: fontRegular,
            });
            yPosition -= 12;
            currentLineEN = word;
        } else {
            currentLineEN = testLine;
        }
    });

    if (currentLineEN && yPosition >= margin + 80) {
        page.drawText(currentLineEN, {
            x: margin,
            y: yPosition,
            size: 9,
            font: fontRegular,
        });
        yPosition -= 12;
    }

    yPosition -= 40;

    // ========== SECCIONES DE FIRMAS ==========
    const lineLength = 200;
    const signature1X = margin + 50;
    const signature2X = width - margin - lineLength - 50;

    // Líneas para firmas
    page.drawLine({
        start: { x: signature1X, y: yPosition },
        end: { x: signature1X + lineLength, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
    });

    page.drawLine({
        start: { x: signature2X, y: yPosition },
        end: { x: signature2X + lineLength, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
    });

    yPosition -= 15;

    // Nombres
    page.drawText(data.collaboratorName, {
        x: signature1X + (lineLength / 2) - (fontBold.widthOfTextAtSize(data.collaboratorName, 9) / 2),
        y: yPosition,
        size: 9,
        font: fontBold,
    });

    page.drawText(data.engineerName, {
        x: signature2X + (lineLength / 2) - (fontBold.widthOfTextAtSize(data.engineerName, 9) / 2),
        y: yPosition,
        size: 9,
        font: fontBold,
    });

    yPosition -= 15;

    // Labels
    page.drawText('Firma del Colaborador', {
        x: signature1X + (lineLength / 2) - (fontRegular.widthOfTextAtSize('Firma del Colaborador', 9) / 2),
        y: yPosition,
        size: 9,
        font: fontRegular,
    });

    page.drawText('Firma de Soporte Técnico', {
        x: signature2X + (lineLength / 2) - (fontRegular.widthOfTextAtSize('Firma de Soporte Técnico', 9) / 2),
        y: yPosition,
        size: 9,
        font: fontRegular,
    });

    // ========== GENERAR PDF ==========
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}
