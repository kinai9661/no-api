const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

// 允許跨域，並設定較大的 JSON 限制以支援多圖回傳
app.use(cors());
app.use(express.json({ limit: '100mb' })); 
app.use(express.static('public'));

// 通用 Proxy 接口
app.post('/api/proxy', async (req, res) => {
    // 1. 從 Header 獲取前端傳來的目標設定
    let targetUrl = req.headers['x-target-url'];
    const targetKey = req.headers['x-target-key'];
    
    // 基本驗證
    if (!targetUrl) {
        return res.status(400).json({ error: "Missing x-target-url header" });
    }

    // 2. 智能 Key 注入
    // 如果 URL 裡沒有 ?key= 但前端傳了 Key，自動補上
    if (targetKey && !targetUrl.includes('key=')) {
        const separator = targetUrl.includes('?') ? '&' : '?';
        targetUrl = `${targetUrl}${separator}key=${targetKey}`;
    }

    console.log(`[Proxy] Request -> ${targetUrl.substring(0, 60)}...`);

    try {
        // 3. 轉發請求
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 偽裝 User-Agent 避免被簡單的反爬蟲擋下
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: JSON.stringify(req.body)
        });

        // 4. 處理回應
        const rawText = await response.text();
        console.log(`[Proxy] Response Status: ${response.status} (Size: ${(rawText.length/1024).toFixed(2)} KB)`);

        try {
            // 嘗試解析 JSON
            const data = JSON.parse(rawText);
            res.status(response.status).json(data);
        } catch (e) {
            // 解析失敗（通常是 HTML 錯誤頁）
            console.error("Proxy JSON Parse Error. First 100 chars:", rawText.substring(0, 100));
            res.status(502).json({
                error: "Upstream API returned non-JSON response",
                status: response.status,
                raw_preview: rawText.substring(0, 1000) // 回傳部分內容供前端 debug
            });
        }

    } catch (error) {
        console.error("Proxy Internal Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Proxy Server running on port ${PORT}`);
});
