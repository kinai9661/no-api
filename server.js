const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

// 預設線路列表 (後端備份用，主要邏輯在前端傳過來)
const DEFAULT_URL = "https://api-integrations.appmedo.com/app-7r29gu4xs001/api-Xa6JZ58oPMEa/v1beta/models/gemini-3-pro-image-preview:generateContent";

app.use(cors());
app.use(express.json({ limit: '50mb' })); // 增大限制以防多圖回傳爆掉
app.use(express.static('public'));

app.post('/api/generate', async (req, res) => {
    // 1. 獲取前端指定的目標 URL
    // 如果前端沒傳 x-target-endpoint，就用後端寫死的預設值
    let targetUrl = req.headers['x-target-endpoint'] || DEFAULT_URL;
    let customKey = req.headers['x-custom-key'];

    console.log(`[Proxy] Target: ${targetUrl.substring(0, 50)}...`);

    // 2. 處理 API Key (如果是官方 URL，需要拼接到 query string)
    if (customKey && targetUrl.includes('googleapis.com')) {
        // 如果 URL 已經有參數用 &，沒有用 ?
        const separator = targetUrl.includes('?') ? '&' : '?';
        targetUrl = `${targetUrl}${separator}key=${customKey}`;
    }

    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0 Safari/537.36'
            },
            body: JSON.stringify(req.body)
        });

        const rawText = await response.text();
        console.log(`[Proxy] Status: ${response.status}`);

        try {
            const jsonData = JSON.parse(rawText);
            res.status(response.status).json(jsonData);
        } catch (e) {
            res.status(502).json({
                error: "Non-JSON Response",
                status: response.status,
                raw_preview: rawText.substring(0, 1000)
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
