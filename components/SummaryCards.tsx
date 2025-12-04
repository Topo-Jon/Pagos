import React from 'react';
import { Card } from './ui/Card';

interface SummaryCardsProps {
    summary: {
        totalLoan: number;
        totalPaid: number;
        remainingBalance: number;
        paidCount: number;
        totalInterest: number;
        shortfall: number;
        previousDebt: number;
    };
    totalPayments: number;
}

const currencyFormatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
});

const SummaryCard: React.FC<{ title: string, value: string, description?: string, colorClass: string }> = ({ title, value, description, colorClass }) => (
    <Card>
        <div className="p-5">
            <h3 className={`text-sm font-medium text-slate-500`}>{title}</h3>
            <p className={`mt-1 text-3xl font-semibold ${colorClass}`}>{value}</p>
            {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
        </div>
    </Card>
);

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, totalPayments }) => {
    const pendingCount = totalPayments - summary.paidCount;
    const hasPreviousDebt = summary.previousDebt > 0;

    return (
        <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {hasPreviousDebt && (
                    <SummaryCard 
                        title="Deuda Total"
                        value={currencyFormatter.format(summary.remainingBalance + summary.previousDebt)}
                        description="Saldo Préstamo + Deuda Anterior"
                        colorClass="text-red-700"
                    />
                )}
                 <SummaryCard 
                    title="Saldo Restante"
                    value={currencyFormatter.format(summary.remainingBalance)}
                    description="Capital pendiente (calculado)"
                    colorClass="text-orange-600"
                />
                <SummaryCard 
                    title="Total Prestado"
                    value={currencyFormatter.format(summary.totalLoan)}
                    description="Cantidad inicial"
                    colorClass="text-slate-800"
                />
                 <SummaryCard 
                    title="Total Abonado"
                    value={currencyFormatter.format(summary.totalPaid)}
                    description="Suma de todos los abonos"
                    colorClass="text-green-600"
                />
                 {hasPreviousDebt && (
                    <SummaryCard 
                        title="Deuda Anterior"
                        value={currencyFormatter.format(summary.previousDebt)}
                        description="Monto adicional adeudado"
                        colorClass="text-gray-600"
                    />
                )}
                {summary.shortfall > 0 && (
                     <div className={hasPreviousDebt ? '' : 'col-start-1'}>
                        <SummaryCard 
                            title="Monto Atrasado"
                            value={currencyFormatter.format(summary.shortfall)}
                            description="Suma de pagos incompletos"
                            colorClass="text-red-600"
                        />
                    </div>
                )}
                 <SummaryCard 
                    title="Interés Total (Plan)"
                    value={currencyFormatter.format(summary.totalInterest)}
                    description="Costo del crédito original"
                    colorClass="text-purple-600"
                />
                <SummaryCard 
                    title="Quincenas Procesadas"
                    value={String(summary.paidCount)}
                    description={`de ${totalPayments} totales`}
                    colorClass="text-blue-600"
                />
                <SummaryCard 
                    title="Quincenas Pendientes"
                    value={String(pendingCount)}
                    description="Para liquidar"
                    colorClass="text-yellow-600"
                />
            </div>
        </div>
    );
};