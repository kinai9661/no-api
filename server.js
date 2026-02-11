const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 目標 API URL (Appmedo Gemini 3 Proxy)
const TARGET_API_URL = "https://api-integrations.appmedo.com/app-7r29gu4xs001/api-Xa6JZ58oPMEa/v1beta/models/gemini-3-pro-image-preview:generateContent";

app.use(cors());
// 增加 payload 限制以支援大圖片請求（雖然通常請求不大，但回應很大）
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public')); // 託管 public 資料夾中的網頁

// API Proxy Endpoint
app.post('/api/generate', async (req, res) => {
    console.log(`[${new Date().toISOString()}] 收到生成請求`);

    try {
        const response = await fetch(TARGET_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 偽裝 Header 避免簡單的反爬蟲
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://appmedo.com/'
            },
            body: JSON.stringify(req.body)
        });

        // 先讀取文本，避免直接 .json() 解析失敗
        const rawText = await response.text();
        console.log(`目標伺服器回應狀態: ${response.status}`);

        try {
            // 嘗試解析為 JSON
            const jsonData = JSON.parse(rawText);
            res.status(response.status).json(jsonData);
        } catch (parseError) {
            // 解析失敗，說明回傳的是 HTML 錯誤頁面 (如 404, 502, Cloudflare 驗證等)
            console.error("解析 JSON 失敗，原始回應預覽:", rawText.substring(0, 200));
            
            res.status(502).json({
                error: "Upstream API Error (Non-JSON Response)",
                status: response.status,
                details: "The target API returned HTML instead of JSON. It might be down or blocking requests.",
                raw_preview: rawText.substring(0, 1000) // 回傳部分 HTML 供前端 Debug
            });
        }

    } catch (error) {
        console.error("Proxy 內部錯誤:", error);
        res.status(500).json({ error: "Internal Proxy Error", details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
