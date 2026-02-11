const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.static('public'));

// --- Proxy: 生成內容 ---
app.post('/api/proxy', async (req, res) => {
    // (保留原本的生成邏輯，完全不變)
    let targetUrl = req.headers['x-target-url'];
    const targetKey = req.headers['x-target-key'];
    
    if (!targetUrl) return res.status(400).json({ error: "Missing x-target-url" });

    if (targetKey && !targetUrl.includes('key=')) {
        const separator = targetUrl.includes('?') ? '&' : '?';
        targetUrl = `${targetUrl}${separator}key=${targetKey}`;
    }

    console.log(`[Gen] Request -> ${targetUrl.substring(0, 50)}...`);

    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: JSON.stringify(req.body)
        });

        const rawText = await response.text();
        try {
            const data = JSON.parse(rawText);
            res.status(response.status).json(data);
        } catch (e) {
            res.status(502).json({ error: "Non-JSON response", raw: rawText.substring(0, 500) });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- NEW: Proxy: 獲取模型列表 ---
app.get('/api/models', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    // 如果沒有 Key，我們使用一個預設的 Google Discovery URL (通常需要 Key，這裡假設前端會傳)
    // 或者使用一個公開的已知模型列表作為備案
    
    if (!apiKey) {
        return res.status(400).json({ error: "API Key required for model listing" });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    console.log(`[Models] Fetching list from Google...`);

    try {
        const response = await fetch(url);
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error("Model fetch error:", error);
        res.status(500).json({ error: "Failed to fetch models" });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
