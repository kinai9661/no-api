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
app.use(express.static('public')); // 託管 public 資料夾中的網頁

// Proxy Endpoint
app.post('/api/generate', async (req, res) => {
    console.log("收到生成請求:", req.body);

    try {
        // 轉發請求到 Appmedo
        const response = await fetch(TARGET_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        
        // 將原始狀態碼和數據回傳給前端
        res.status(response.status).json(data);

    } catch (error) {
        console.error("Proxy Error:", error);
        res.status(500).json({ error: "Internal Proxy Error", details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
