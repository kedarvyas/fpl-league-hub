import React from 'react';
import { SectionHeader } from './PlayerStatCell';
import { formatCount } from '../lib/playerStats';
import { formatMoney, formatMoneyDelta } from '../lib/transferPlan';

/**
 * The transfer ledger — the same object as the H2H page's differential ledger:
 * two columns whose subtotals reconcile to the headline numbers above.
 *
 * It matters more here than there. On the H2H page the ledger explains a score
 * FPL already published, so the arithmetic can be checked against the source.
 * Here two of the three headline figures are *derived* — the selling prices
 * behind "in the bank", and a free-transfer count that FPL publishes nowhere
 * at all — so this is the only place the reader can see the working and
 * disagree with it.
 */

/** One line of the reconciliation. */
const Row = ({ label, value, tone = 'default' }) => (
    <div className="flex items-center justify-between gap-3 bg-panel px-3 py-2.5">
        <span className="truncate text-[8px] leading-none tracking-[0.14em] text-muted-foreground">
            {label}
        </span>
        <span
            className={`shrink-0 text-[13px] font-bold leading-none tracking-[-0.03em] ${
                tone === 'negative'
                    ? 'text-destructive-ink'
                    : tone === 'zero'
                        ? 'text-muted-foreground'
                        : 'text-foreground'
            }`}
        >
            {value}
        </span>
    </div>
);

/** One column, with the subtotal that column is worth. */
const Column = ({ label, rows, subtotal, empty, align = 'left' }) => (
    <div className="flex flex-col gap-px bg-border">
        <div className={`bg-panel px-3 py-2 ${align === 'right' ? 'text-right' : ''}`}>
            <span className="block truncate text-[7.5px] leading-none tracking-[0.14em] text-muted-foreground">
                {label}
            </span>
            <span className="mt-1.5 block text-[20px] font-bold leading-none tracking-[-0.04em] text-foreground">
                {formatMoney(subtotal)}
            </span>
        </div>
        {rows.length === 0 ? (
            <div className="bg-panel px-3 py-3 text-[8px] tracking-[0.12em] text-muted-foreground">
                {empty}
            </div>
        ) : (
            rows.map((row) => (
                <div
                    key={row.id}
                    className={`flex items-center gap-2 bg-panel px-3 py-2.5 ${
                        align === 'right' ? 'flex-row-reverse text-right' : ''
                    }`}
                >
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-[10px] font-medium leading-none text-foreground">
                            {row.name}
                        </span>
                        <span className="mt-1 block truncate text-[7.5px] leading-none tracking-[0.12em] text-muted-foreground">
                            {row.position} · {row.club}
                        </span>
                    </span>
                    <span className="shrink-0 text-[11px] font-bold leading-none tracking-[-0.03em] text-foreground">
                        {formatMoney(row.money)}
                    </span>
                </div>
            ))
        )}
    </div>
);

const PlanLedger = ({ applied, finances, onReset }) => {
    const outRows = applied.slots
        .filter((s) => s.removed)
        .map((s) => ({ ...s.original, money: s.original.selling }));
    const inRows = applied.slots
        .filter((s) => s.incoming)
        .map((s) => ({ ...s.incoming, money: s.incoming.price }));

    return (
        <>
            <SectionHeader label="Ledger">
                {finances.transfers > 0 || applied.pending.length > 0 ? (
                    <button
                        type="button"
                        onClick={onReset}
                        className="min-h-[24px] px-1 text-[8px] font-medium tracking-[0.12em] text-muted-foreground hover:text-foreground"
                    >
                        CLEAR PLAN
                    </button>
                ) : null}
            </SectionHeader>

            <div className="grid grid-cols-2 gap-px bg-border">
                <Column label="OUT" rows={outRows} subtotal={finances.sales} empty="NOBODY OUT" />
                <Column label="IN" rows={inRows} subtotal={finances.buys} empty="NOBODY IN" align="right" />
            </div>

            <div className="mt-px flex flex-col gap-px bg-border">
                <Row label="IN THE BANK NOW" value={formatMoney(finances.bankBefore)} />
                <Row
                    label="SALES"
                    value={formatMoneyDelta(finances.sales)}
                    tone={finances.sales === 0 ? 'zero' : 'default'}
                />
                <Row
                    label="PURCHASES"
                    value={formatMoneyDelta(-finances.buys)}
                    tone={finances.buys === 0 ? 'zero' : 'default'}
                />
                <Row
                    label="LEFT AFTER THE PLAN"
                    value={formatMoney(finances.bankAfter)}
                    tone={finances.bankAfter < 0 ? 'negative' : 'default'}
                />
                <Row
                    label={`${formatCount(finances.transfers)} TRANSFER${
                        finances.transfers === 1 ? '' : 'S'
                    } · ${
                        finances.chip ? 'CHIP COVERS THEM' : `${formatCount(finances.free)} FREE`
                    }`}
                    value={finances.hit > 0 ? `−${formatCount(finances.hit)}` : '0'}
                    tone={finances.hit > 0 ? 'negative' : 'zero'}
                />
            </div>

            {applied.pending.length > 0 && (
                <p className="pt-2 text-[8px] leading-[1.6] tracking-[0.06em] text-muted-foreground">
                    {formatCount(applied.pending.length)} SLOT
                    {applied.pending.length === 1 ? '' : 'S'} STILL EMPTY — THE MONEY IS RELEASED, BUT
                    AN EMPTY SLOT IS NOT A TRANSFER AND COSTS NOTHING YET.
                </p>
            )}
        </>
    );
};

export default PlanLedger;
