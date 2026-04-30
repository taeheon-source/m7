'use client';

import { useState, useCallback } from 'react';
import { parseTradeData, groupTrades, GroupedTrades, TradeRecord, ASSET_LABELS } from '@/lib/parser';

const COLUMNS = ['매매', '매매처명', '종목명', '펀드코드', '자산', '수량', '금리', '상환일'] as const;

function formatQuantity(q: number) {
  return q % 1 === 0 ? q.toLocaleString('ko-KR') : q.toFixed(2);
}

function TradeTable({ records }: { records: TradeRecord[] }) {
  if (records.length === 0) return null;

  return (
    <table className="w-full border-collapse text-sm mb-4">
      <thead>
        <tr>
          {COLUMNS.map((col) => (
            <th
              key={col}
              className="border border-gray-300 px-3 py-2 text-center font-semibold bg-orange-300 whitespace-nowrap"
            >
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {records.map((r, i) => (
          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-orange-50'}>
            <td className="border border-gray-300 px-3 py-1.5 text-center text-blue-600 whitespace-nowrap">
              {r.tradeType}
            </td>
            <td className="border border-gray-300 px-3 py-1.5 text-blue-600 whitespace-nowrap">
              {r.brokerName}
            </td>
            <td className="border border-gray-300 px-3 py-1.5">{r.securityName}</td>
            <td className="border border-gray-300 px-3 py-1.5 text-center whitespace-nowrap">
              {r.fundCode}
            </td>
            <td className="border border-gray-300 px-3 py-1.5 text-center whitespace-nowrap">
              {ASSET_LABELS[r.assetType] ?? r.assetType}
            </td>
            <td className="border border-gray-300 px-3 py-1.5 text-right whitespace-nowrap">
              {formatQuantity(r.quantity)}
            </td>
            <td className="border border-gray-300 px-3 py-1.5 text-right whitespace-nowrap">
              {r.rate.toFixed(3)}
            </td>
            <td className="border border-gray-300 px-3 py-1.5 text-center whitespace-nowrap">
              {r.maturityDate}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AssetSection({ assetType, sell, buy }: { assetType: string; sell: TradeRecord[]; buy: TradeRecord[] }) {
  const label = ASSET_LABELS[assetType] ?? assetType;
  return (
    <div className="mb-8">
      <h2 className="text-base font-bold mb-2">{label}</h2>
      <TradeTable records={sell} />
      <TradeTable records={buy} />
    </div>
  );
}

export default function Home() {
  const [grouped, setGrouped] = useState<GroupedTrades | null>(null);

  const process = useCallback((text: string) => {
    const records = parseTradeData(text);
    setGrouped(records.length > 0 ? groupTrades(records) : null);
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const text = e.clipboardData.getData('text');
      setTimeout(() => process(text), 0);
    },
    [process]
  );

  return (
    <main className="p-8 max-w-screen-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">매매내역 정리</h1>

      <textarea
        className="w-full h-24 border border-gray-300 rounded p-3 mb-8 font-mono text-xs resize-none focus:outline-none focus:ring-1 focus:ring-orange-300"
        placeholder="매매내역 엑셀 데이터를 여기에 붙여넣으세요..."
        onPaste={handlePaste}
      />

      {grouped === null ? null : grouped.length === 0 ? (
        <p className="text-gray-400 text-sm">데이터를 파싱할 수 없습니다. 형식을 확인해주세요.</p>
      ) : (
        grouped.map(([assetType, { sell, buy }]) => (
          <AssetSection key={assetType} assetType={assetType} sell={sell} buy={buy} />
        ))
      )}
    </main>
  );
}
