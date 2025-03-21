const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// 根路由
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: '股票价格监控代理服务器正在运行'
    });
});

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

// 获取股票价格
app.get('/api/stock/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const formattedCode = formatStockCode(code);
        
        // 使用东方财富网的 API
        const url = `http://push2.eastmoney.com/api/qt/stock/get`;
        const params = {
            secid: formattedCode,
            fields: 'f43,f57,f58,f169,f170,f46,f44,f51,f168,f47,f164,f163,f116,f60,f45,f52,f50,f48,f167,f117,f71,f161,f49,f530,f135,f136,f137,f138,f139,f141,f142,f144,f145,f147,f148,f140,f143,f146,f149,f55,f62,f162,f92,f173,f104,f105,f84,f85,f183,f184,f185,f186,f187,f188,f189,f190,f191,f192,f107,f111,f86,f177,f78,f110,f262,f263,f264,f267,f268,f250,f251,f252,f253,f254,f255,f256,f257,f258,f266,f269,f270,f271,f273,f274,f275,f127,f199,f128,f193,f196,f194,f195,f197,f80,f280,f281,f282,f284,f285,f286,f287,f292',
            ut: 'fa5fd1943c7b386f172d6893dbfba10b',
            fltt: 2,
            invt: 2
        };
        
        console.log('请求URL:', url);
        console.log('请求参数:', params);
        
        const response = await axios.get(url, { params });
        const data = response.data;
        
        console.log('API 响应:', JSON.stringify(data, null, 2));
        
        if (data.data) {
            // 判断是否为美股
            const isUSStock = /^[A-Z]+$/.test(code);
            const price = isUSStock ? data.data.f43  : data.data.f43;
            const change = isUSStock ? data.data.f170  : data.data.f170;
            const changePercent = isUSStock ? data.data.f171  : data.data.f171;

            res.json({
                code: code,
                name: data.data.f58 || code,
                price: price || 0,
                change: change || 0,
                changePercent: changePercent || 0,
                volume: data.data.f47 || 0,
                amount: data.data.f48 || 0
            });
        } else {
            throw new Error('未找到股票数据');
        }
    } catch (error) {
        console.error('获取股票价格失败:', error);
        if (error.response) {
            console.error('错误响应:', error.response.data);
            console.error('错误状态:', error.response.status);
            console.error('错误头:', error.response.headers);
        }
        res.status(500).json({
            error: '获取股票价格失败',
            details: error.message,
            stack: error.stack
        });
    }
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: '服务器内部错误',
        details: err.message
    });
});

// 404 处理
app.use((req, res) => {
    res.status(404).json({
        error: '未找到请求的资源',
        path: req.path
    });
});

app.listen(port, () => {
    console.log(`代理服务器运行在 http://localhost:${port}`);
});