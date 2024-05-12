const apiUrl = 'https://data.tradingview.com/history';
const symbol = 'AAPL'; // Mã cổ phiếu hoặc tài sản tài chính
const resolution = '1D'; // Độ phân giải dữ liệu (1D: ngày, 1W: tuần, 1M: tháng)
const from = Math.floor((Date.now() - (365 * 24 * 60 * 60 * 1000)) / 1000); // Timestamp từ 1 năm trước
const to = Math.floor(Date.now() / 1000); // Timestamp hiện tại

const url = `${apiUrl}?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}`;

fetch(url)
  .then(response => response.json())
  .then(data => {
    const prices = data.c; // Mảng giá đóng cửa

    // Tính toán EMA50 từ giá đóng cửa
    const ema50 = calculateEMA(prices, 50);

    // Lấy giá trị EMA50 từ 1 năm trước
    const ema50FromOneYearAgo = ema50[ema50.length - 365];

    console.log(`EMA50 từ 1 năm trước: ${ema50FromOneYearAgo}`);
  })
  .catch(error => console.error(error));

// Hàm tính toán EMA
function calculateEMA(prices, period) {
  const k = 2 / (period + 1);
  const ema = [];
  let prevEma = prices[0];

  ema[0] = prices[0];

  for (let i = 1; i < prices.length; i++) {
    prevEma = prices[i] * k + prevEma * (1 - k);
    ema[i] = prevEma;
  }

  return ema;
}

