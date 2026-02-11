const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 目標 API URL
const TARGET_API_URL = "https://api-integrations.appmedo.com/app-7r29gu4xs001/api-Xa6JZ58oPMEa/v1beta/models/gemini-3-pro-image-preview:generateContent";

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/api/generate', async (req, res) => {
    console.log("收到生成請求，正在轉發...");

    try {
        const response = await fetch(TARGET_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 偽裝成瀏覽器，避免被簡單的反爬蟲阻擋
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: JSON.stringify(req.body)
        });

        // 1. 先獲取原始文本，而不是直接 .json()
        const rawText = await response.text();
        console.log("目標伺服器回應狀態:", response.status);

        // 2. 嘗試解析 JSON
        try {
            const jsonData = JSON.parse(rawText);
            // 如果成功解析，就正常回傳
            res.status(response.status).json(jsonData);
        } catch (parseError) {
            // 3. 如果解析失敗，說明回傳的是 HTML 或其他格式
            console.error("解析 JSON 失敗，原始回應是:", rawText.substring(0, 500)); // 只印前500字避免日誌爆炸
            
            // 回傳錯誤給前端，並附上 HTML 的一部分以便查看
            res.status(502).json({
                error: "Target API returned non-JSON response",
                status: response.status,
                raw_response_preview: rawText.substring(0, 1000) // 讓前端能看到 HTML 內容
            });
        }

    } catch (error) {
        console.error("Proxy 請求失敗:", error);
        res.status(500).json({ error: "Internal Proxy Error", details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
