const express = require('express');
const cors = require('cors');
const submissionRoutes = require('./routes/submissions');
const lookupUserRoutes = require('./routes/lookupUser');
const lookupGroupRoutes = require('./routes/lookupGroup');
const lookupProblemList = require('./routes/lookupProblemList');
const lookupProblemSet = require('./routes/lookupProblemSet')
const lookupProblemListInSet = require('./routes/lookupProblemListInSet');
const lookupProblem = require('./routes/lookupProblem');

const lookupGroupSetup = require('./routes/admin/lookupGroupSetup');
const saveGroupSetup = require('./routes/admin/saveGroupSetup');
const createGroup = require('./routes/admin/createGroup');
const lookupMembers = require('./routes/admin/lookupMembers');
const saveMemberRole = require('./routes/admin/saveMemberRole');
const createProblemSet = require('./routes/admin/createProblemSet');
const saveProblemSet = require('./routes/admin/saveProblemSet');
const problemSetProblems = require('./routes/admin/problemSetProblems');
const { createProblemAuthoringRouters } = require('./routes/admin/adminProblems');
const { createMysqlProblemAuthoringRepository } = require('../DB/method/problemAuthoring');
const pool = require('../DB/connection');

const app = express();

// 미들웨어 설정
app.use(cors()); // 프론트엔드(React)와의 CORS 통신 허용
const problemAuthoring = createProblemAuthoringRouters({ repository: createMysqlProblemAuthoringRepository(pool) });
app.use('/api/admin', express.json({ limit: '32mb' }), problemAuthoring.adminRouter, problemAuthoring.jsonErrorHandler);
app.use('/api', problemAuthoring.assetRouter);
app.use(express.json()); // JSON Request Body 파싱

// 라우터 등록
app.use('/api', submissionRoutes);
app.use('/api', lookupUserRoutes);
app.use('/api', lookupGroupRoutes);
app.use('/api', lookupProblemList);
app.use('/api', lookupProblemSet);
app.use('/api', lookupProblemListInSet);
app.use('/api', lookupProblem);

//관리자 관련 라우터
app.use('/api/admin', lookupGroupSetup);
app.use('/api/admin', saveGroupSetup);
app.use('/api/admin', createGroup);
app.use('/api/admin', lookupMembers);
app.use('/api/admin', saveMemberRole);
app.use('/api/admin', createProblemSet);
app.use('/api/admin', saveProblemSet);
app.use('/api/admin', problemSetProblems);

module.exports = app;
