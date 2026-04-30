export interface TradeRecord {
  fundCode: string;
  brokerName: string;
  securityName: string;
  assetType: string;
  tradeType: '매도' | '매수';
  quantity: number;
  rate: number;
  maturityDate: string;
  isFutures: boolean;
}

export type GroupedTrades = [string, { sell: TradeRecord[]; buy: TradeRecord[]; isFutures: boolean }][];

// 자산 순서: 채권 → 선물 → 전자단기사채 → CP → CD
export const ASSET_ORDER: Record<string, number> = {
  채권: 1, 선물: 2, 전자단기: 3, 전자단기사채: 3, CP: 4, CD: 5,
};

export const ASSET_LABELS: Record<string, string> = {
  전자단기: '전자단기사채',
};

function parseNum(s: string): number {
  return parseFloat((s ?? '').replace(/,/g, '')) || 0;
}

// 채권/전자단기사채/CP/CD 컬럼
// 0:일자 2:펀드코드 4:매매처명 6:종목명 7:자산구분 9:매매구분
// 주문내역(11-15) 체결내역(16-20): 16:액면 20:이율 25:상환일
const BCOL = {
  date: 0, fundCode: 2, brokerName: 4, securityName: 6,
  assetType: 7, tradeType: 9, settlementFace: 16, settlementRate: 20, maturityDate: 25,
};

// 선물 컬럼
// 0:No 1:일자 3:펀드코드 5:자산구분 6:매매구분 8:종목명 9:체결단가 10:체결계약수 13:매매처명
const FCOL = {
  no: 0, date: 1, fundCode: 3, assetType: 5, tradeType: 6,
  securityName: 8, rate: 9, quantity: 10, brokerName: 13,
};

const BOND_DATE_RE = /^\d{4}\/\d{2}\/\d{2}$/;

export function parseBondData(raw: string): TradeRecord[] {
  const records: TradeRecord[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const cols = line.split('\t');
    if (!BOND_DATE_RE.test(cols[BCOL.date]?.trim())) continue;
    const tradeType = cols[BCOL.tradeType]?.trim();
    if (tradeType !== '매도' && tradeType !== '매수') continue;

    records.push({
      fundCode:     cols[BCOL.fundCode]?.trim() ?? '',
      brokerName:   cols[BCOL.brokerName]?.trim() ?? '',
      securityName: cols[BCOL.securityName]?.trim() ?? '',
      assetType:    cols[BCOL.assetType]?.trim() ?? '',
      tradeType:    tradeType as '매도' | '매수',
      quantity:     parseNum(cols[BCOL.settlementFace]) / 1e8,
      rate:         parseNum(cols[BCOL.settlementRate]),
      maturityDate: cols[BCOL.maturityDate]?.trim() ?? '',
      isFutures:    false,
    });
  }
  return records;
}

export function parseFuturesData(raw: string): TradeRecord[] {
  const records: TradeRecord[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const cols = line.split('\t');
    if (!/^\d+$/.test(cols[FCOL.no]?.trim())) continue;
    if (!BOND_DATE_RE.test(cols[FCOL.date]?.trim())) continue;
    const tradeType = cols[FCOL.tradeType]?.trim();
    if (tradeType !== '매도' && tradeType !== '매수') continue;

    records.push({
      fundCode:     cols[FCOL.fundCode]?.trim() ?? '',
      brokerName:   cols[FCOL.brokerName]?.trim() ?? '',
      securityName: cols[FCOL.securityName]?.trim() ?? '',
      assetType:    '선물',
      tradeType:    tradeType as '매도' | '매수',
      quantity:     parseNum(cols[FCOL.quantity]),
      rate:         parseNum(cols[FCOL.rate]),
      maturityDate: '',
      isFutures:    true,
    });
  }
  return records;
}

export function groupTrades(records: TradeRecord[]): GroupedTrades {
  const map: Record<string, { sell: TradeRecord[]; buy: TradeRecord[]; isFutures: boolean }> = {};
  for (const r of records) {
    if (!map[r.assetType]) map[r.assetType] = { sell: [], buy: [], isFutures: r.isFutures };
    if (r.tradeType === '매도') map[r.assetType].sell.push(r);
    else map[r.assetType].buy.push(r);
  }
  return Object.entries(map).sort(
    ([a], [b]) => (ASSET_ORDER[a] ?? 99) - (ASSET_ORDER[b] ?? 99)
  );
}
