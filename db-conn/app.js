const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const Router = require('koa-router');
const logger = require('koa-logger');

const handleTableUpdate = require('./handlers/updateDB');

const router = new Router();
const app = new Koa();
app.use(logger());
app.use(bodyParser());

router.post('/update-db', async (ctx) => {
  ctx.body = await handleTableUpdate(ctx.request.body);
});

const server = app
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(3000);

console.log('Server listening on: http://127.0.0.1:3000');
