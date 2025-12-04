import React from 'react';
import type { LoanDetails, Payment } from '../types';
import { Button } from './ui/Button';
import { PdfIcon } from './icons/PdfIcon';
import { generatePdf } from '../utils/pdf';

interface ExportButtonProps {
    loanDetails: LoanDetails;
    payments: Payment[];
    summary: {
        totalLoan: number;
        totalPaid: number;
        remainingBalance: number;
        paidCount: number;
        totalInterest: number;
        shortfall: number;
        previousDebt: number;
    };
}

export const ExportButton: React.FC<ExportButtonProps> = ({ loanDetails, payments, summary }) => {
    const handleExport = () => {
        if (loanDetails && payments.length > 0) {
            generatePdf(loanDetails, payments, summary);
        }
    };

    return (
        <Button onClick={handleExport} className="bg-red-600 hover:bg-red-700 focus:ring-red-500">
            <PdfIcon className="h-5 w-5 mr-2" />
            Exportar a PDF
        </Button>
    );
};