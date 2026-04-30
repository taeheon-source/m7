export interface TradeRecord {
  fundCode: string;
  brokerName: string;
  securityName: string;
  assetType: string;
  tradeType: '매도' | '매수';
  quantity: number;
  rate: number;
  maturityDate: string;
}

export type GroupedTrades = [string, { sell: TradeRecord[]; buy: TradeRecord[] }][];

function parseNum(s: string): number {
  return parseFloat((s ?? '').replace(/,/g, '')) || 0;
}

// 엑셀 붙여넣기 기준 컬럼 인덱스
// 0:일자 1:주문번호 2:펀드코드 3:주문지명 4:매매처명 5:종목코드 6:종목명
// 7:자산구분 8:매매유형 9:매매구분 10:체결확인
// 주문내역: 11:액면 12:단가 13:승인요청시간 14:집행시간 15:이율
// 체결내역: 16:액면 17:단가 18:금액 19:체결시간 20:이율
// 트레이더: 21:액면 22:단가 23:이율
// 24:발행일 25:상환일 26:신용등급
const COL = {
  date: 0,
  fundCode: 2,
  brokerName: 4,
  securityName: 6,
  assetType: 7,
  tradeType: 9,
  settlementFace: 16,
  settlementRate: 20,
  maturityDate: 25,
};

const DATE_RE = /^\d{4}\/\d{2}\/\d{2}$/;

const ASSET_ORDER: Record<string, number> = {
  채권: 1,
  전자단기: 2,
  전자단기사채: 2,
  선물: 3,
};

export const ASSET_LABELS: Record<string, string> = {
  전자단기: '전자단기사채',
};

export function parseTradeData(raw: string): TradeRecord[] {
  const records: TradeRecord[] = [];

  for (const line of raw.split(/\r?\n/)) {
    const cols = line.split('\t');
    if (!DATE_RE.test(cols[COL.date]?.trim())) continue;

    const tradeType = cols[COL.tradeType]?.trim();
    if (tradeType !== '매도' && tradeType !== '매수') continue;

    const faceValue = parseNum(cols[COL.settlementFace]);

    records.push({
      fundCode: cols[COL.fundCode]?.trim() ?? '',
      brokerName: cols[COL.brokerName]?.trim() ?? '',
      securityName: cols[COL.securityName]?.trim() ?? '',
      assetType: cols[COL.assetType]?.trim() ?? '',
      tradeType: tradeType as '매도' | '매수',
      quantity: faceValue / 100_000_000,
      rate: parseNum(cols[COL.settlementRate]),
      maturityDate: cols[COL.maturityDate]?.trim() ?? '',
    });
  }

  return records;
}

export function groupTrades(records: TradeRecord[]): GroupedTrades {
  const map: Record<string, { sell: TradeRecord[]; buy: TradeRecord[] }> = {};

  for (const r of records) {
    if (!map[r.assetType]) map[r.assetType] = { sell: [], buy: [] };
    if (r.tradeType === '매도') map[r.assetType].sell.push(r);
    else map[r.assetType].buy.push(r);
  }

  return Object.entries(map).sort(
    ([a], [b]) => (ASSET_ORDER[a] ?? 99) - (ASSET_ORDER[b] ?? 99)
  );
}
