'use client';

import { useState, useCallback, useRef } from 'react';
import {
  parseBondData, parseFuturesData, groupTrades,
  GroupedTrades, TradeRecord, ASSET_LABELS,
} from '@/lib/parser';

function fmtQty(q: number) {
  return q % 1 === 0 ? q.toLocaleString('ko-KR') : q.toFixed(2);
}

const CELL = 'px-2 py-1.5 text-[11px] text-center whitespace-nowrap border-r border-slate-200 last:border-r-0';

function DataRow({ r, isSell }: { r: TradeRecord; isSell: boolean }) {
  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
      <td className={CELL}>
        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${isSell ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
          {r.tradeType}
        </span>
      </td>
      <td className={`${CELL} text-indigo-500 font-medium`}>{r.brokerName}</td>
      <td className={CELL}>{r.securityName}</td>
      <td className={CELL}>{r.fundCode}</td>
      <td className={CELL}>{ASSET_LABELS[r.assetType] ?? r.assetType}</td>
      <td className={`${CELL} tabular-nums`}>{fmtQty(r.quantity)}</td>
      <td className={`${CELL} tabular-nums font-medium`}>{r.rate.toFixed(r.isFutures ? 2 : 3)}</td>
      <td className={CELL}>{r.maturityDate}</td>
    </tr>
  );
}

function PasteArea({ label, onPaste }: { label: string; onPaste: (text: string) => void }) {
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text');
    setTimeout(() => onPaste(text), 0);
  }, [onPaste]);

  return (
    <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-4 focus-within:border-indigo-400 transition-colors">
      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">{label}</div>
      <textarea
        className="w-full bg-transparent border-none outline-none resize-none font-mono text-[11px] text-slate-500 leading-relaxed placeholder:text-slate-300"
        style={{ height: 72 }}
        placeholder="여기에 붙여넣기 (Ctrl+V)..."
        onPaste={handlePaste}
      />
    </div>
  );
}

const HEADERS = ['매매', '매매처명', '종목명', '펀드코드', '자산', '수량', '금리', '상환일'];

function OrangeHeader() {
  return (
    <tr className="border-b border-orange-200" style={{ background: '#FFEDD5' }}>
      {HEADERS.map((h) => (
        <th key={h} className="px-2 py-1.5 text-[9px] font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap text-center border-r border-orange-200 last:border-r-0">
          {h}
        </th>
      ))}
    </tr>
  );
}

function CopyButton({ tableRef }: { tableRef: React.RefObject<HTMLTableElement | null> }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    const table = tableRef.current;
    if (!table) return;
    const html = table.outerHTML;
    await navigator.clipboard.write([
      new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }) }),
    ]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [tableRef]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
      style={{ background: copied ? '#d1fae5' : '#f1f5f9', color: copied ? '#065f46' : '#475569' }}
    >
      {copied ? '✓ 복사됨' : '테이블 복사'}
    </button>
  );
}

function TradeTableAll({ grouped }: { grouped: GroupedTrades }) {
  const tableRef = useRef<HTMLTableElement>(null);
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center">
        <CopyButton tableRef={tableRef} />
      </div>
      <div className="overflow-x-auto">
        <table ref={tableRef} className="border-collapse" style={{ tableLayout: 'auto', width: '100%' }}>
          <tbody>
            {grouped.map(([assetType, { sell, buy }], si) => {
              const label = ASSET_LABELS[assetType] ?? assetType;
              const total = sell.length + buy.length;
              return (
                <>
                  {si > 0 && (
                    <tr key={`gap-${assetType}`}>
                      <td colSpan={8} className="h-2 bg-slate-50 border-t border-b border-slate-200 p-0" />
                    </tr>
                  )}
                  <tr key={`hd-${assetType}`} className="bg-slate-50 border-b border-slate-200">
                    <td colSpan={8} className="px-4 py-2">
                      <span className="text-[12px] font-semibold text-slate-800">{label}</span>
                      <span className="ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-500">{total}건</span>
                    </td>
                  </tr>
                  <OrangeHeader key={`oh-${assetType}`} />
                  {sell.map((r, i) => <DataRow key={`s${assetType}${i}`} r={r} isSell={true} />)}
                  {sell.length > 0 && buy.length > 0 && (
                    <tr key={`div-${assetType}`}>
                      <td colSpan={8} className="h-px bg-slate-200 p-0" />
                    </tr>
                  )}
                  {buy.map((r, i) => <DataRow key={`b${assetType}${i}`} r={r} isSell={false} />)}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
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

      {grouped && grouped.length > 0 && <TradeTableAll grouped={grouped} />}
    </main>
  );
}
