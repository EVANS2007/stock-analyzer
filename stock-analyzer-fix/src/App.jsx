import { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  Line
} from "recharts";

// ─── Mock Data ────────────────────────────────────────────────────────────────
function generatePriceData(basePrice, days = 90) {
  const data = [];
  let price = basePrice;
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const change = (Math.random() - 0.48) * price * 0.025;
    price = Math.max(price + change, basePrice * 0.5);
    const open = price + (Math.random() - 0.5) * price * 0.01;
    const high = Math.max(price, open) * (1 + Math.random() * 0.015);
    const low = Math.min(price, open) * (1 - Math.random() * 0.015);
    const volume = Math.floor(Math.random() * 50000000 + 10000000);
    data.push({
      date: date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }),
      close: parseFloat(price.toFixed(2)),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      volume,
    });
  }
  return data;
}

function calcRSI(data, period = 14) {
  const result = [...data];
  for (let i = period; i < result.length; i++) {
    let gains = 0, losses = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = result[j].close - result[j - 1].close;
      if (diff > 0) gains += diff; else losses -= diff;
    }
    const rs = gains / (losses || 0.0001);
    result[i].rsi = parseFloat((100 - 100 / (1 + rs)).toFixed(2));
  }
  return result;
}

function calcMACD(data) {
  const k12 = 2 / 13, k26 = 2 / 27;
  let ema12 = data[0].close, ema26 = data[0].close;
  return data.map((d, i) => {
    if (i > 0) {
      ema12 = d.close * k12 + ema12 * (1 - k12);
      ema26 = d.close * k26 + ema26 * (1 - k26);
    }
    return { ...d, macd: parseFloat((ema12 - ema26).toFixed(3)) };
  });
}

const STOCKS = {
  AAPL:     { name: "苹果公司",   price: 189.5, pe: 28.4, pb: 43.2, mktcap: "2.94T",     sector: "科技",       roe: "147%",  revenue: "3834亿", netIncome: "970亿",  debtRatio: "31%", divYield: "0.5%",  eps: "6.67",  beta: "1.24" },
  TSLA:     { name: "特斯拉",     price: 248.3, pe: 65.2, pb: 12.8, mktcap: "791B",      sector: "汽车/新能源", roe: "19.4%", revenue: "967亿",  netIncome: "150亿", debtRatio: "18%", divYield: "—",    eps: "3.81",  beta: "2.31" },
  NVDA:     { name: "英伟达",     price: 875.4, pe: 52.1, pb: 28.7, mktcap: "2.16T",     sector: "半导体",     roe: "55.3%", revenue: "609亿",  netIncome: "298亿", debtRatio: "14%", divYield: "0.03%", eps: "16.84", beta: "1.97" },
  BABA:     { name: "阿里巴巴",   price: 77.2,  pe: 14.3, pb: 1.8,  mktcap: "198B",      sector: "电商/云计算", roe: "12.8%", revenue: "9315亿", netIncome: "711亿", debtRatio: "22%", divYield: "—",    eps: "5.41",  beta: "0.87" },
  "600519": { name: "贵州茅台",   price: 1680,  pe: 29.5, pb: 8.4,  mktcap: "2.1T(RMB)", sector: "白酒",       roe: "31.2%", revenue: "1505亿", netIncome: "747亿", debtRatio: "8%",  divYield: "2.8%",  eps: "59.49", beta: "0.62" },
};

const QUARTERLY = [
  { q: "Q1 2023", revenue: 1174, netIncome: 241, eps: 1.52 },
  { q: "Q2 2023", revenue: 1218, netIncome: 198, eps: 1.26 },
  { q: "Q3 2023", revenue: 1346, netIncome: 307, eps: 1.94 },
  { q: "Q4 2023", revenue: 1196, netIncome: 224, eps: 1.43 },
  { q: "Q1 2024", revenue: 1353, netIncome: 289, eps: 1.85 },
  { q: "Q2 2024", revenue: 1498, netIncome: 341, eps: 2.19 },
];

// ─── UI Components ────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, highlight }) {
  return (
    <div style={{
      background: highlight ? "rgba(0,255,136,0.06)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${highlight ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.06)"}`,
      borderRadius: 8, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4,
    }}>
      <span style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace" }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 700, color: highlight ? "#00ff88" : "#f0f0f0", fontFamily: "monospace" }}>{value}</span>
      {sub && <span style={{ fontSize: 11, color: "#666" }}>{sub}</span>}
    </div>
  );
}

function Tab({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: active ? "rgba(0,255,136,0.12)" : "transparent",
      border: active ? "1px solid rgba(0,255,136,0.4)" : "1px solid transparent",
      borderRadius: 6, color: active ? "#00ff88" : "#888",
      cursor: "pointer", fontSize: 13, fontFamily: "monospace",
      fontWeight: active ? 600 : 400, letterSpacing: "0.05em",
      padding: "6px 14px", transition: "all 0.15s",
    }}>{children}</button>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0d0d0d", border: "1px solid rgba(0,255,136,0.3)", borderRadius: 6, padding: "10px 14px", fontSize: 12, fontFamily: "monospace" }}>
      <div style={{ color: "#888", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || "#00ff88" }}>
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [ticker, setTicker] = useState("AAPL");
  const [inputVal, setInputVal] = useState("AAPL");
  const [activeTab, setActiveTab] = useState("overview");
  const [chartType, setChartType] = useState("price");
  const [priceData, setPriceData] = useState([]);

  const stock = STOCKS[ticker] || STOCKS["AAPL"];

  useEffect(() => {
    const raw = generatePriceData(stock.price);
    const withIndicators = calcMACD(calcRSI(raw.map((d, i) => {
      const s20 = raw.slice(Math.max(0, i - 19), i + 1);
      const s60 = raw.slice(Math.max(0, i - 59), i + 1);
      return {
        ...d,
        ma20: parseFloat((s20.reduce((s, x) => s + x.close, 0) / s20.length).toFixed(2)),
        ma60: parseFloat((s60.reduce((s, x) => s + x.close, 0) / s60.length).toFixed(2)),
      };
    })));
    setPriceData(withIndicators);
  }, [ticker]);

  const currentPrice = priceData[priceData.length - 1]?.close || stock.price;
  const prevPrice = priceData[priceData.length - 2]?.close || stock.price;
  const change = currentPrice - prevPrice;
  const changePct = ((change / prevPrice) * 100).toFixed(2);
  const isUp = change >= 0;

  const handleSearch = () => {
    const t = inputVal.trim().toUpperCase();
    const key = STOCKS[t] ? t : inputVal.trim();
    if (STOCKS[key]) setTicker(key);
    else alert("暂支持：AAPL · TSLA · NVDA · BABA · 600519");
  };

  const displayData = priceData.slice(-60);
  const priceMin = displayData.length ? Math.min(...displayData.map(d => d.low)) * 0.995 : 0;
  const priceMax = displayData.length ? Math.max(...displayData.map(d => d.high)) * 1.005 : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#e8e8e8", fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)" }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px 60px", position: "relative", zIndex: 2 }}>

        {/* Header */}
        <header style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #00ff88, #00b8ff)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📈</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", color: "#fff" }}>StockAI</div>
              <div style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>智能股票分析终端</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={inputVal}
              onChange={e => setInputVal(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="输入股票代码 AAPL / 600519..."
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e8e8e8", fontFamily: "monospace", fontSize: 13, outline: "none", padding: "8px 14px", width: 240 }}
            />
            <button onClick={handleSearch} style={{ background: "linear-gradient(135deg, #00ff88, #00cc6a)", border: "none", borderRadius: 8, color: "#000", cursor: "pointer", fontSize: 13, fontWeight: 700, padding: "8px 18px" }}>
              搜索
            </button>
          </div>
        </header>

        {/* Hero */}
        <div style={{ padding: "24px 0 20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "#fff" }}>{stock.name}</span>
                <span style={{ fontSize: 13, color: "#888", fontFamily: "monospace", background: "rgba(255,255,255,0.06)", borderRadius: 4, padding: "2px 8px" }}>{ticker}</span>
                <span style={{ fontSize: 11, color: "#666", background: "rgba(255,255,255,0.04)", borderRadius: 4, padding: "2px 8px" }}>{stock.sector}</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 42, fontWeight: 700, fontFamily: "monospace", color: "#fff" }}>{currentPrice.toFixed(2)}</span>
                <span style={{ fontSize: 18, fontFamily: "monospace", fontWeight: 600, color: isUp ? "#00ff88" : "#ff4d6d", background: isUp ? "rgba(0,255,136,0.08)" : "rgba(255,77,109,0.08)", borderRadius: 6, padding: "2px 10px" }}>
                  {isUp ? "▲" : "▼"} {Math.abs(change).toFixed(2)} ({isUp ? "+" : ""}{changePct}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs — 只有三个，去掉 AI 问答 */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 16, flexWrap: "wrap" }}>
          {[["overview","📊 基本面"],["chart","📉 技术分析"],["financials","📋 财报"]].map(([t, label]) => (
            <Tab key={t} active={activeTab === t} onClick={() => setActiveTab(t)}>{label}</Tab>
          ))}
        </div>

        {/* ── Overview ── */}
        {activeTab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 10, marginBottom: 28 }}>
              <MetricCard label="市值" value={stock.mktcap} highlight />
              <MetricCard label="市盈率 P/E" value={stock.pe} sub="越低越便宜" />
              <MetricCard label="市净率 P/B" value={stock.pb} />
              <MetricCard label="ROE" value={stock.roe} sub="越高越优质" />
              <MetricCard label="EPS" value={`$${stock.eps}`} sub="每股收益" />
              <MetricCard label="Beta" value={stock.beta} sub="相对市场波动" />
              <MetricCard label="股息率" value={stock.divYield} />
              <MetricCard label="资产负债率" value={stock.debtRatio} sub="越低越安全" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 20 }}>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 14, fontFamily: "monospace", letterSpacing: "0.08em" }}>营收 vs 净利润（亿）</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={QUARTERLY} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="q" tick={{ fontSize: 10, fill: "#666", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#666", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue" name="营收" fill="rgba(0,184,255,0.6)" radius={[3,3,0,0]} />
                    <Bar dataKey="netIncome" name="净利润" fill="rgba(0,255,136,0.7)" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 20 }}>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 14, fontFamily: "monospace", letterSpacing: "0.08em" }}>EPS 趋势</div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={QUARTERLY}>
                    <defs>
                      <linearGradient id="epsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="q" tick={{ fontSize: 10, fill: "#666", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#666", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="eps" name="EPS" stroke="#00ff88" strokeWidth={2} fill="url(#epsGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── Chart ── */}
        {activeTab === "chart" && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {[["price","价格 + MA"],["rsi","RSI"],["macd","MACD"],["volume","成交量"]].map(([c, l]) => (
                <Tab key={c} active={chartType === c} onClick={() => setChartType(c)}>{l}</Tab>
              ))}
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "20px 10px 10px" }}>
              <ResponsiveContainer width="100%" height={320}>
                {chartType === "price" ? (
                  <AreaChart data={displayData}>
                    <defs>
                      <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00ff88" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#555", fontFamily: "monospace" }} axisLine={false} tickLine={false} interval={9} />
                    <YAxis domain={[priceMin, priceMax]} tick={{ fontSize: 10, fill: "#555", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="close" name="收盘价" stroke="#00ff88" strokeWidth={2} fill="url(#priceGrad)" dot={false} />
                    <Line type="monotone" dataKey="ma20" name="MA20" stroke="#00b8ff" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="ma60" name="MA60" stroke="#ff9500" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                  </AreaChart>
                ) : chartType === "rsi" ? (
                  <AreaChart data={displayData}>
                    <defs>
                      <linearGradient id="rsiGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#555", fontFamily: "monospace" }} axisLine={false} tickLine={false} interval={9} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#555", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={70} stroke="#ff4d6d" strokeDasharray="4 2" label={{ value: "超买 70", fill: "#ff4d6d", fontSize: 10 }} />
                    <ReferenceLine y={30} stroke="#00ff88" strokeDasharray="4 2" label={{ value: "超卖 30", fill: "#00ff88", fontSize: 10 }} />
                    <Area type="monotone" dataKey="rsi" name="RSI" stroke="#a855f7" strokeWidth={2} fill="url(#rsiGrad)" dot={false} />
                  </AreaChart>
                ) : chartType === "macd" ? (
                  <BarChart data={displayData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#555", fontFamily: "monospace" }} axisLine={false} tickLine={false} interval={9} />
                    <YAxis tick={{ fontSize: 10, fill: "#555", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                    <Bar dataKey="macd" name="MACD" fill="#00b8ff" radius={[2,2,0,0]} />
                  </BarChart>
                ) : (
                  <BarChart data={displayData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#555", fontFamily: "monospace" }} axisLine={false} tickLine={false} interval={9} />
                    <YAxis tick={{ fontSize: 10, fill: "#555", fontFamily: "monospace" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1e6).toFixed(0)}M`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="volume" name="成交量" fill="rgba(0,184,255,0.5)" radius={[2,2,0,0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 16 }}>
              <MetricCard label="52周最高" value={(currentPrice * 1.28).toFixed(2)} />
              <MetricCard label="52周最低" value={(currentPrice * 0.72).toFixed(2)} />
              <MetricCard label="RSI(14)" value={displayData[displayData.length - 1]?.rsi?.toFixed(1) || "--"} />
              <MetricCard label="20日均量" value="42M" />
            </div>
          </div>
        )}

        {/* ── Financials ── */}
        {activeTab === "financials" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 20 }}>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 16, fontFamily: "monospace", letterSpacing: "0.08em" }}>📋 季度财报摘要</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "monospace" }}>
                  <thead>
                    <tr>{["季度","营收(亿)","净利润(亿)","EPS"].map(h => (
                      <th key={h} style={{ textAlign: "right", color: "#555", fontWeight: 500, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {QUARTERLY.map((q, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <td style={{ padding: "8px 0", color: "#888" }}>{q.q}</td>
                        <td style={{ textAlign: "right", color: "#e0e0e0" }}>{q.revenue}</td>
                        <td style={{ textAlign: "right", color: q.netIncome > 250 ? "#00ff88" : "#e0e0e0" }}>{q.netIncome}</td>
                        <td style={{ textAlign: "right", color: "#00b8ff" }}>${q.eps}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 20 }}>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 12, fontFamily: "monospace" }}>💰 盈利能力</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <MetricCard label="毛利率" value="43.8%" />
                    <MetricCard label="净利率" value="25.3%" />
                    <MetricCard label="ROE" value={stock.roe} highlight />
                    <MetricCard label="ROA" value="28.3%" />
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 20 }}>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 12, fontFamily: "monospace" }}>🏦 资产负债</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <MetricCard label="总资产" value="3523亿" />
                    <MetricCard label="总负债" value="2748亿" />
                    <MetricCard label="负债率" value={stock.debtRatio} />
                    <MetricCard label="流动比率" value="0.99" />
                  </div>
                </div>
              </div>
            </div>
            <div style={{ background: "rgba(0,255,136,0.04)", border: "1px solid rgba(0,255,136,0.15)", borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#00ff88", marginBottom: 8, fontFamily: "monospace" }}>📝 财报解读</div>
              <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.7 }}>
                {stock.name} 近两个季度营收持续增长，Q2 2024 达 1498 亿，同比增长约 23%。净利润率维持在 22-23%，盈利质量稳定。
                ROE {stock.roe} 显示资本使用效率{parseInt(stock.roe) > 20 ? "优秀" : "良好"}，资产负债率 {stock.debtRatio} 处于健康水平。
                <span style={{ color: "#00ff88" }}> 综合来看基本面稳健，盈利增长趋势明确。</span>
                <br /><br />
                <span style={{ color: "#666", fontSize: 11 }}>⚠️ 模拟数据仅供演示，不构成投资建议。</span>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 40, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "#444", fontFamily: "monospace" }}>StockAI · 数据仅供参考，不构成投资建议</span>
          <span style={{ fontSize: 11, color: "#333", fontFamily: "monospace" }}>Built with React + Recharts</span>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        input::placeholder { color: #444; }
      `}</style>
    </div>
  );
}
