// 转换股票代码格式
function formatStockCode(code) {
    // 移除所有空格和括号
    code = code.replace(/[\s()]/g, '');
    
    // 如果是美股，使用 105. 前缀
    if (/^[A-Z]+$/.test(code)) {
        return `105.${code}`; // 东方财富网美股代码格式
    }
    
    // 如果是 A 股，添加 SH 或 SZ 前缀
    if (/^6\d{5}$/.test(code)) {
        return `1.${code}`; // 东方财富网沪市代码格式
    } else if (/^0\d{5}$/.test(code)) {
        return `0.${code}`; // 东方财富网深市主板代码格式
    } else if (/^3\d{5}$/.test(code)) {
        return `0.${code}`; // 东方财富网创业板代码格式（使用0前缀）
    }
    
    return code;
}

async function getStockPrice(code) {
    try {
        const formattedCode = formatStockCode(code);
        const url = 'http://push2.eastmoney.com/api/qt/stock/get';
        const params = {
            secid: formattedCode,
            fields: 'f43,f57,f58,f169,f170,f46,f44,f51,f168,f47,f164,f163,f116,f60,f45,f52,f50,f48,f167,f117,f71,f161,f49,f530,f135,f136,f137,f138,f139,f141,f142,f144,f145,f147,f148,f140,f143,f146,f149,f55,f62,f162,f92,f173,f104,f105,f84,f85,f183,f184,f185,f186,f187,f188,f189,f190,f191,f192,f107,f111,f86,f177,f78,f110,f262,f263,f264,f267,f268,f250,f251,f252,f253,f254,f255,f256,f257,f258,f266,f269,f270,f271,f273,f274,f275,f127,f199,f128,f193,f196,f194,f195,f197,f80,f280,f281,f282,f284,f285,f286,f287,f292',
            ut: 'fa5fd1943c7b386f172d6893dbfba10b',
            fltt: 2,
            invt: 2
        };

        const response = await fetch(`${url}?${new URLSearchParams(params)}`);
        const data = await response.json();
        
        if (data.data) {
            // 判断是否为美股
            const isUSStock = /^[A-Z]+$/.test(code);
            const price = isUSStock ? data.data.f43 : data.data.f43;
            const change = isUSStock ? data.data.f170 : data.data.f170;
            const changePercent = isUSStock ? data.data.f171 : data.data.f171;

            return {
                code: code,
                name: data.data.f58 || code,
                price: price || 0,
                change: change || 0,
                changePercent: changePercent || 0,
                volume: data.data.f47 || 0,
                amount: data.data.f48 || 0
            };
        } else {
            throw new Error('未找到股票数据');
        }
    } catch (error) {
        console.error('获取股票价格失败:', error);
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // 加载已保存的股票列表
    loadStockList();

    // 添加股票按钮事件
    document.getElementById('addStockBtn').addEventListener('click', addStock);
});

async function loadStockList() {
    const { stocks = [] } = await chrome.storage.local.get('stocks');
    const stockList = document.getElementById('stockList');
    stockList.innerHTML = '';

    // 获取所有股票的最新价格
    await Promise.all(stocks.map(async (stock) => {
        try {
            const data = await getStockPrice(stock.code);
            stock.currentPrice = data.price;
        } catch (error) {
            console.error(`获取股票 ${stock.code} 价格失败:`, error);
            stock.currentPrice = '--';
        }
    }));

    // 更新存储的价格
    await chrome.storage.local.set({ stocks });

    // 渲染列表
    stocks.forEach((stock, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${stock.code}</td>
            <td>${stock.currentPrice || '--'}</td>
            <td>${stock.minPrice}</td>
            <td>${stock.targetPrice}</td>
            <td>${stock.maxPrice}</td>
            <td>${stock.updateInterval}分钟</td>
            <td>
                <button class="delete-btn" data-index="${index}">删除</button>
            </td>
        `;
        
        // 为删除按钮添加事件监听器
        const deleteBtn = row.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => deleteStock(index));
        
        stockList.appendChild(row);
    });
}

async function addStock() {
    const stockCode = document.getElementById('stockCode').value;
    const minPrice = parseFloat(document.getElementById('minPrice').value);
    const targetPrice = parseFloat(document.getElementById('targetPrice').value);
    const maxPrice = parseFloat(document.getElementById('maxPrice').value);
    const updateInterval = parseInt(document.getElementById('updateInterval').value);

    if (!stockCode || !minPrice || !targetPrice || !maxPrice) {
        alert('请填写完整信息');
        return;
    }

    try {
        // 先获取股票价格
        const data = await getStockPrice(stockCode);
        
        if (!data.price) {
            alert('获取股票价格失败，请检查股票代码是否正确');
            return;
        }

        const { stocks = [] } = await chrome.storage.local.get('stocks');
        stocks.push({
            code: stockCode,
            minPrice,
            targetPrice,
            maxPrice,
            updateInterval,
            currentPrice: data.price
        });

        await chrome.storage.local.set({ stocks });
        await loadStockList();

        // 清空表单
        document.getElementById('stockCode').value = '';
        document.getElementById('minPrice').value = '';
        document.getElementById('targetPrice').value = '';
        document.getElementById('maxPrice').value = '';
    } catch (error) {
        console.error('添加股票失败:', error);
        alert('添加股票失败，请检查股票代码是否正确');
    }
}

async function deleteStock(index) {
    const { stocks = [] } = await chrome.storage.local.get('stocks');
    stocks.splice(index, 1);
    await chrome.storage.local.set({ stocks });
    await loadStockList();
}