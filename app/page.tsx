'use client';

import { useState, useCallback, useRef } from 'react';
import {
  parseBondData, parseFuturesData, groupTrades,
  GroupedTrades, TradeRecord, ASSET_LABELS,
} from '@/lib/parser';

function fmtQty(q: number) {
  return q % 1 === 0 ? q.toLocaleString('ko-KR') : q.toFixed(2);
}

function TradeTable({ records, isFutures }: { records: TradeRecord[]; isFutures: boolean }) {
  if (!records.length) return null;
  const isSell = records[0].tradeType === '매도';
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 58 }} />
          <col style={{ width: 130 }} />
          <col />
          <col style={{ width: 82 }} />
          <col style={{ width: 100 }} />
          <col style={{ width: 76 }} />
          <col style={{ width: 76 }} />
          <col style={{ width: 92 }} />
        </colgroup>
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {['매매', '매매처명', '종목명', '펀드코드', '자산', isFutures ? '계약수' : '수량', isFutures ? '단가' : '금리', isFutures ? '' : '상환일'].map((h, i) => (
              <th key={i} className="px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                style={{ textAlign: i === 2 ? 'left' : 'center' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
              <td className="px-3 py-2 text-center">
                <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${isSell ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                  {r.tradeType}
                </span>
              </td>
              <td className="px-3 py-2 text-indigo-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis">{r.brokerName}</td>
              <td className="px-3 py-2 text-left whitespace-nowrap overflow-hidden text-ellipsis" title={r.securityName}>{r.securityName}</td>
              <td className="px-3 py-2 text-center whitespace-nowrap">{r.fundCode}</td>
              <td className="px-3 py-2 text-center whitespace-nowrap">{ASSET_LABELS[r.assetType] ?? r.assetType}</td>
              <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{fmtQty(r.quantity)}</td>
              <td className="px-3 py-2 text-right tabular-nums font-medium whitespace-nowrap">{r.rate.toFixed(isFutures ? 2 : 3)}</td>
              <td className="px-3 py-2 text-center whitespace-nowrap">{r.maturityDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AssetSection({ assetType, sell, buy, isFutures }: {
  assetType: string; sell: TradeRecord[]; buy: TradeRecord[]; isFutures: boolean;
}) {
  const label = ASSET_LABELS[assetType] ?? assetType;
  const total = sell.length + buy.length;
  const hasBoth = sell.length > 0 && buy.length > 0;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 mb-6 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
        <span className="text-[13px] font-semibold text-slate-900">{label}</span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{total}건</span>
      </div>
      <TradeTable records={sell} isFutures={isFutures} />
      {hasBoth && <div className="h-px bg-slate-200" />}
      <TradeTable records={buy} isFutures={isFutures} />
    </div>
  );
}

function PasteArea({ label, onPaste }: { label: string; onPaste: (text: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text');
    setTimeout(() => onPaste(text), 0);
  }, [onPaste]);

  return (
    <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-4 focus-within:border-indigo-400 transition-colors">
      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">{label}</div>
      <textarea
        ref={ref}
        className="w-full h-18 bg-transparent border-none outline-none resize-none font-mono text-[11px] text-slate-500 leading-relaxed placeholder:text-slate-300"
        style={{ height: 72 }}
        placeholder="여기에 붙여넣기 (Ctrl+V)..."
        onPaste={handlePaste}
      />
    </div>
  );
}

export default function Home() {
  const [grouped, setGrouped] = useState<GroupedTrades | null>(null);
  const bondRef    = useRef('');
  const futuresRef = useRef('');

  const rerender = useCallback(() => {
    const all = [...parseBondData(bondRef.current), ...parseFuturesData(futuresRef.current)];
    setGrouped(all.length ? groupTrades(all) : null);
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-12 py-10 max-w-screen-xl mx-auto">
      <header className="mb-7">
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">매매내역 정리</h1>
        <p className="mt-1 text-[12px] text-slate-400">아래 각 영역에 엑셀 매매내역을 붙여넣으세요</p>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-9">
        <PasteArea
          label="채권 / 전자단기사채 / CP / CD"
          onPaste={(t) => { bondRef.current = t; rerender(); }}
        />
        <PasteArea
          label="선물"
          onPaste={(t) => { futuresRef.current = t; rerender(); }}
        />
      </div>

      {grouped?.map(([assetType, { sell, buy, isFutures }]) => (
        <AssetSection key={assetType} assetType={assetType} sell={sell} buy={buy} isFutures={isFutures} />
      ))}
    </main>
  );
}
