const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

// 允許前端獲取 Debug Header
app.use(cors({
    exposedHeaders: ['x-final-destination', 'x-proxy-latency']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

app.post('/api/proxy', async (req, res) => {
    const startTime = Date.now();
    let targetUrl = req.headers['x-target-url'];
    const targetKey = req.headers['x-target-key'];

    if (!targetUrl) return res.status(400).json({ error: "Missing Target URL" });

    // --- 智慧 Key 注入策略 ---
    const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Gemini-Proxy/4.0 (Node.js)'
    };

    // 策略 A: Google 官方或相容 API -> 使用 ?key=
    if (targetKey && (targetUrl.includes('googleapis.com') || targetUrl.includes('goog'))) {
        if (!targetUrl.includes('key=')) {
            const separator = targetUrl.includes('?') ? '&' : '?';
            targetUrl = `${targetUrl}${separator}key=${targetKey}`;
        }
    } 
    // 策略 B: 其他標準 Proxy (OpenAI 格式) -> 使用 Bearer Token
    else if (targetKey) {
        headers['Authorization'] = `Bearer ${targetKey}`;
        headers['x-api-key'] = targetKey; // 某些代理用這個
    }

    // --- 準備 Debug 資訊 (遮蔽 Key) ---
    let debugUrl = targetUrl.replace(/key=([^&]+)/, 'key=HIDDEN_KEY');
    console.log(`[Proxy] Forwarding to: ${debugUrl}`);

    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(req.body)
        });

        // 設定 Debug Headers
        res.setHeader('x-final-destination', debugUrl);
        res.setHeader('x-proxy-latency', `${Date.now() - startTime}ms`);

        const rawText = await response.text();
        
        try {
            const data = JSON.parse(rawText);
            res.status(response.status).json(data);
        } catch (e) {
            // 處理非 JSON 回應 (如 HTML 錯誤頁)
            res.status(502).json({
                error: "Upstream Non-JSON Response",
                status: response.status,
                preview: rawText.substring(0, 1000)
            });
        }

    } catch (error) {
        console.error("[Proxy Error]", error.message);
        res.setHeader('x-final-destination', debugUrl);
        res.status(500).json({ error: "Internal Proxy Error", details: error.message });
    }
});

app.listen(PORT, () => console.log(`🚀 Proxy v4.0 running on port ${PORT}`));
