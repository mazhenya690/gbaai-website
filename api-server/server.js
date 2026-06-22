const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ====== JSON File Storage (zero-dependency, portable) ======
const DATA_FILE = path.join(__dirname, 'data', 'diagnoses.json');
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch { return []; }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function nextId(data) {
  return data.length > 0 ? Math.max(...data.map(d => d.id)) + 1 : 1;
}

// ====== API Routes ======

// Health check
app.get('/api/health', (req, res) => {
  const data = readData();
  res.json({ status: 'ok', total_diagnoses: data.length });
});

// Submit diagnosis
app.post('/api/diagnosis', (req, res) => {
  try {
    const d = req.body;
    const data = readData();

    const record = {
      id: nextId(data),
      company_name: d.company_name || '',
      company_scale: d.company_scale || '',
      industry: d.industry || '',
      ai_stage: d.ai_stage || '',
      ai_scenarios: Array.isArray(d.ai_scenarios) ? d.ai_scenarios.join(', ') : (d.ai_scenarios || ''),
      digital_level: d.digital_level || '',
      pain_points: Array.isArray(d.pain_points) ? d.pain_points.join(', ') : (d.pain_points || ''),
      barriers: Array.isArray(d.barriers) ? d.barriers.join(', ') : (d.barriers || ''),
      top_goal: d.top_goal || '',
      tools: Array.isArray(d.tools) ? d.tools.join(', ') : (d.tools || ''),
      budget: d.budget || '',
      external_research: d.external_research || '',
      training: d.training || '',
      contact_name: d.contact_name || '',
      contact_title: d.contact_title || '',
      contact_phone: d.contact_phone || '',
      contact_wechat: d.contact_wechat || '',
      contact_email: d.contact_email || '',
      submitted_at: d.submitted_at || new Date().toISOString(),
      source: d.source || 'gbaai-website',
      notes: '',
      created_at: new Date().toISOString()
    };

    data.push(record);
    writeData(data);

    console.log(`[DIAGNOSIS] #${record.id} ${record.contact_name} - ${record.company_name} (${record.contact_phone})`);

    res.json({ success: true, id: record.id, message: '诊断提交成功，AI智能体正在分析数据' });
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all diagnoses (paginated)
app.get('/api/diagnoses', (req, res) => {
  try {
    let data = readData();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const search = (req.query.search || '').toLowerCase();

    if (search) {
      data = data.filter(d =>
        (d.company_name || '').toLowerCase().includes(search) ||
        (d.contact_name || '').toLowerCase().includes(search) ||
        (d.contact_phone || '').includes(search) ||
        (d.contact_wechat || '').toLowerCase().includes(search)
      );
    }

    // Sort by newest first
    data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const total = data.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const pageData = data.slice(offset, offset + limit);

    res.json({ total, page, limit, total_pages: totalPages, data: pageData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single diagnosis
app.get('/api/diagnosis/:id', (req, res) => {
  try {
    const data = readData();
    const row = data.find(d => d.id === parseInt(req.params.id));
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export CSV
app.get('/api/export/csv', (req, res) => {
  try {
    const data = readData();
    const headers = [
      'ID', '企业名称', '企业规模', '行业', 'AI应用阶段', 'AI应用场景',
      '数字化水平', '核心痛点', '主要障碍', '首要目标', '已用工具',
      '预算', '外部调研', '培训经历',
      '联系人', '职位', '手机号', '微信号', '邮箱',
      '提交时间', '备注'
    ];

    const escape = (v) => '"' + String(v || '').replace(/"/g, '""') + '"';
    let csv = '\uFEFF' + headers.join(',') + '\n';

    data.forEach(r => {
      csv += [
        r.id, r.company_name, r.company_scale, r.industry, r.ai_stage, r.ai_scenarios,
        r.digital_level, r.pain_points, r.barriers, r.top_goal, r.tools,
        r.budget, r.external_research, r.training,
        r.contact_name, r.contact_title, r.contact_phone, r.contact_wechat, r.contact_email,
        r.submitted_at, r.notes
      ].map(escape).join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=gbaai_diagnoses_' + Date.now() + '.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update notes
app.patch('/api/diagnosis/:id', (req, res) => {
  try {
    const data = readData();
    const idx = data.findIndex(d => d.id === parseInt(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    if (req.body.notes !== undefined) data[idx].notes = req.body.notes;
    writeData(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI analysis endpoint (placeholder - connect to LLM API later)
app.post('/api/ai-analyze/:id', (req, res) => {
  try {
    const data = readData();
    const row = data.find(d => d.id === parseInt(req.params.id));
    if (!row) return res.status(404).json({ error: 'Not found' });

    const prompt = `企业AI诊断分析报告
---
企业名称：${row.company_name}
规模：${row.company_scale}
行业：${row.industry}
AI阶段：${row.ai_stage}
核心痛点：${row.pain_points}
主要障碍：${row.barriers}
首要目标：${row.top_goal}
预算：${row.budget}
外部调研经历：${row.external_research}
培训经历：${row.training}
已用工具：${row.tools}
---

请基于以上信息生成：
1. AI成熟度评估（1-5分）
2. 关键问题诊断
3. 建议的AI切入路径
4. 推荐的解决方案
5. 下一步行动建议`;

    res.json({
      id: row.id,
      company: row.company_name,
      prompt: prompt,
      analysis: '// AI分析即将上线，请联系马老师获取个性化诊断报告'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stats
app.get('/api/stats', (req, res) => {
  try {
    const data = readData();
    const today = new Date().toISOString().substring(0, 10);
    const todayCount = data.filter(d => (d.created_at || '').substring(0, 10) === today).length;

    const byIndustry = {};
    const byStage = {};
    data.forEach(d => {
      byIndustry[d.industry || '未知'] = (byIndustry[d.industry || '未知'] || 0) + 1;
      byStage[d.ai_stage || '未知'] = (byStage[d.ai_stage || '未知'] || 0) + 1;
    });

    res.json({
      total: data.length,
      today: todayCount,
      by_industry: Object.entries(byIndustry).map(([k, v]) => ({ industry: k, count: v })),
      by_stage: Object.entries(byStage).map(([k, v]) => ({ ai_stage: k, count: v }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====== Start Server ======
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   GBA AI 智能体后端服务已启动              ║
║                                          ║
║   Port:      ${String(PORT).padEnd(30)}║
║   Dashboard: http://localhost:${PORT}     ║
║   API:       http://localhost:${PORT}/api  ║
║   Data:      ${DATA_FILE.padEnd(30)}║
║                                          ║
║   部署到生产：建议使用 Render/Railway      ║
╚══════════════════════════════════════════╝
  `);
});
