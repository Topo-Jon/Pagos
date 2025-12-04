import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { LoanDetails, Payment } from '../types';

type Summary = {
    totalLoan: number;
    totalPaid: number;
    remainingBalance: number;
    paidCount: number;
    totalInterest: number;
    shortfall: number;
    previousDebt: number;
};

// Color palette mapping (RGB values)
const colors = {
    orange: [234, 88, 12],   // Saldo Restante
    green: [22, 163, 74],    // Total Abonado
    slate: [30, 41, 59],     // Total Prestado
    red: [220, 38, 38],      // Monto Atrasado / Deuda Total
    gray: [75, 85, 99],      // Deuda Anterior
    purple: [147, 51, 234],  // Interés
    blue: [37, 99, 235],     // Procesadas
    yellow: [202, 138, 4],   // Pendientes
    
    // Backgrounds for schedule rows (Light versions)
    bgGreen: [220, 252, 231], // green-100
    bgAmber: [254, 243, 199], // amber-100
    bgRed: [254, 226, 226],   // red-100 (for pending)
};

export const generatePdf = (
  loanDetails: LoanDetails, 
  payments: Payment[], 
  summary: Summary
) => {
    const doc = new jsPDF();

    // Formatters
    const currencyFormatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
    const dateFormatter = new Intl.DateTimeFormat('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });

    // Title
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text('Resumen de Préstamo', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 14, 26);
    
    // --- SUMMARY CARDS (Custom Drawing) ---
    // We will draw rectangles to mimic the dashboard cards
    
    const cardData = [];

    // Row 1
    if (summary.previousDebt > 0) {
        cardData.push({ title: 'Deuda Total', value: currencyFormatter.format(summary.remainingBalance + summary.previousDebt), desc: 'Saldo Préstamo + Deuda Ant.', color: colors.red });
    }
    cardData.push({ title: 'Saldo Restante', value: currencyFormatter.format(summary.remainingBalance), desc: 'Capital pendiente', color: colors.orange });
    cardData.push({ title: 'Total Prestado', value: currencyFormatter.format(summary.totalLoan), desc: 'Cantidad inicial', color: colors.slate });
    cardData.push({ title: 'Total Abonado', value: currencyFormatter.format(summary.totalPaid), desc: 'Suma de abonos', color: colors.green });
    
    // Row 2
    if (summary.previousDebt > 0) {
        cardData.push({ title: 'Deuda Anterior', value: currencyFormatter.format(summary.previousDebt), desc: 'Monto adicional', color: colors.gray });
    }
    if (summary.shortfall > 0) {
        cardData.push({ title: 'Monto Atrasado', value: currencyFormatter.format(summary.shortfall), desc: 'Pagos incompletos', color: colors.red });
    }
    cardData.push({ title: 'Interés Total', value: currencyFormatter.format(summary.totalInterest), desc: 'Costo del crédito', color: colors.purple });
    cardData.push({ title: 'Quincenas Proc.', value: summary.paidCount.toString(), desc: `de ${loanDetails.paymentsCount} totales`, color: colors.blue });
    cardData.push({ title: 'Quincenas Pend.', value: (loanDetails.paymentsCount - summary.paidCount).toString(), desc: 'Para liquidar', color: colors.yellow });

    
    let startX = 14;
    let startY = 35;
    const cardWidth = 58; // 3 columns approx for A4 width (210 - 28 margin = 182 / 3 = 60)
    const cardHeight = 22;
    const gapX = 4;
    const gapY = 5;
    
    // Draw Cards
    doc.setLineWidth(0.1);
    doc.setDrawColor(200, 200, 200); // Light grey border

    cardData.forEach((card, index) => {
        const colIndex = index % 3;
        const rowIndex = Math.floor(index / 3);

        const x = startX + (colIndex * (cardWidth + gapX));
        const y = startY + (rowIndex * (cardHeight + gapY));

        // Background
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

        // Title
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.text(card.title, x + 3, y + 6);

        // Value
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(card.color[0], card.color[1], card.color[2]);
        doc.text(card.value, x + 3, y + 13);

        // Description
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(148, 163, 184); // Slate 400
        doc.text(card.desc, x + 3, y + 18);
    });

    const rows = Math.ceil(cardData.length / 3);
    const finalCardY = startY + (rows * (cardHeight + gapY));

    // --- PAYMENT SCHEDULE TABLE ---
    doc.setFontSize(16);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    doc.text('Calendario de Pagos', 14, finalCardY + 10);

    const tableHead = [['#', 'Fecha', 'Monto', 'Interés', 'Principal', 'Saldo Ideal', 'Estado', 'Abono']];
    const tableBody = payments.map(p => [
        p.paymentNumber.toString(),
        dateFormatter.format(p.paymentDate),
        currencyFormatter.format(p.amount),
        currencyFormatter.format(p.interest),
        currencyFormatter.format(p.principal),
        currencyFormatter.format(p.remainingBalance),
        p.status === 'paid' ? 'Pagado' : p.status === 'partial' ? 'Parcial' : 'Pendiente',
        currencyFormatter.format(p.amountPaid ?? 0)
    ]);

    autoTable(doc, {
        startY: finalCardY + 15,
        head: tableHead,
        body: tableBody,
        theme: 'grid',
        headStyles: { 
            fillColor: [51, 65, 85], // Slate 700
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 9, // Slightly smaller font to fit columns better
            cellPadding: 2,
            valign: 'middle'
        },
        columnStyles: {
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' },
            6: { halign: 'center', fontStyle: 'bold' },
            7: { halign: 'right' }
        },
        didParseCell: (data) => {
            if (data.section === 'body') {
                const status = data.row.raw[6]; // Index of 'Estado' column

                // Highlight entire rows based on status
                if (status === 'Pagado') {
                    data.cell.styles.fillColor = colors.bgGreen as [number, number, number];
                    if (data.column.index === 6) data.cell.styles.textColor = [21, 128, 61]; // Dark Green text for status
                } else if (status === 'Parcial') {
                    data.cell.styles.fillColor = colors.bgAmber as [number, number, number];
                    if (data.column.index === 6) data.cell.styles.textColor = [180, 83, 9]; // Dark Amber text for status
                } else if (status === 'Pendiente') {
                     // Highlight Pending with a very light red to separate from white paper
                    data.cell.styles.fillColor = colors.bgRed as [number, number, number];
                    if (data.column.index === 6) data.cell.styles.textColor = [185, 28, 28]; // Red text for status
                }
            }
        }
    });
    
    doc.save(`resumen_prestamo_${new Date().toISOString().slice(0,10)}.pdf`);
}