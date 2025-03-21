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

// 初始化时设置定时任务
chrome.runtime.onInstalled.addListener(() => {
    setupStockMonitoring();
});

// 设置股票监控
async function setupStockMonitoring() {
    const { stocks = [] } = await chrome.storage.local.get('stocks');
    
    // 清除现有的定时任务
    await chrome.alarms.clearAll();
    
    // 为每个股票设置监控任务
    stocks.forEach(stock => {
        chrome.alarms.create(`stock_${stock.code}`, {
            periodInMinutes: stock.updateInterval
        });
    });
}

// 监听定时任务
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name.startsWith('stock_')) {
        const stockCode = alarm.name.replace('stock_', '');
        await checkStockPrice(stockCode);
    }
});

// 检查股票价格
async function checkStockPrice(stockCode) {
    try {
        const { stocks = [] } = await chrome.storage.local.get('stocks');
        const stockIndex = stocks.findIndex(s => s.code === stockCode);
        
        if (stockIndex !== -1) {
            const stock = stocks[stockIndex];
            const formattedCode = formatStockCode(stockCode);
            
            // 获取最新价格
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
                const isUSStock = /^[A-Z]+$/.test(stockCode);
                const price = data.data.f43;
                stock.currentPrice = price;
                
                // 更新存储的价格
                await chrome.storage.local.set({ stocks });
                
                // 检查是否需要发送通知
                if (price >= stock.minPrice && price <= stock.maxPrice) {
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'images/icon128.svg',
                        title: '股票价格提醒',
                        message: `${stock.code} (${data.data.f58}) 当前价格: ${price.toFixed(2)}`
                    });
                }
            }
        }
    } catch (error) {
        console.error('获取股票价格失败:', error);
    }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'openAddStockForm') {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.sidePanel.open({windowId: tabs[0].windowId});
        });
    }
});