import * as cp from 'cron-parser';

try {
  const expr = cp.CronExpressionParser.parse('*/5 * * * *');
  console.log('parsed ok');
  const next = expr.next();
  console.log('next ok', next.toString());
} catch (e) {
  console.error('PARSE ERR', e);
}
