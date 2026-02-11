const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

app.post('/api/proxy', async (req, res) => {
    // 從前端 Header 獲取目標配置
    let targetUrl = req.headers['x-target-url'];
    const targetKey = req.headers['x-target-key'];
    
    if (!targetUrl) {
        return res.status(400).json({ error: "Missing x-target-url header" });
    }

    // 智能 Key 注入：如果 URL 沒有 ?key= 且前端提供了 Key，自動補上
    if (targetKey && !targetUrl.includes('key=')) {
        const separator = targetUrl.includes('?') ? '&' : '?';
        targetUrl = `${targetUrl}${separator}key=${targetKey}`;
    }

    console.log(`[Proxy] Forwarding to: ${targetUrl.substring(0, 60)}...`);

    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 偽裝瀏覽器，避免被簡單阻擋
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: JSON.stringify(req.body)
        });

        const rawText = await response.text();
        console.log(`[Proxy] Upstream Status: ${response.status}`);

        // 嘗試解析 JSON，如果失敗則包裝錯誤訊息
        try {
            const data = JSON.parse(rawText);
            res.status(response.status).json(data);
        } catch (e) {
            res.status(502).json({
                error: "Invalid JSON from Upstream",
                status: response.status,
                raw_preview: rawText.substring(0, 500) // 回傳部分 HTML 供 Debug
            });
        }

    } catch (error) {
        console.error("Proxy Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`🚀 Proxy Server running on port ${PORT}`));
