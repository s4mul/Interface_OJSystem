const express = require('express');
const cors = require('cors');
const submissionRoutes = require('./routes/submissions');
const lookupUserRoutes = require('./routes/lookupUser');
const lookupGroupRoutes = require('./routes/lookupGroup');

const app = express();

// 미들웨어 설정
app.use(cors()); // 프론트엔드(React)와의 CORS 통신 허용
app.use(express.json()); // JSON Request Body 파싱

// 라우터 등록
app.use('/api', submissionRoutes);
app.use('/api', lookupUserRoutes);
app.use('/api', lookupGroupRoutes);

module.exports = app;
