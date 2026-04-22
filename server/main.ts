import { appConfig } from './config';
import { createApp } from './app';

const { app } = await createApp();

app.listen(appConfig.apiPort, () => {
  console.log(`[api] listening on http://localhost:${appConfig.apiPort}`);
});
