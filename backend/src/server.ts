import { criarApp } from "./app";
import { config } from "./config";

criarApp().listen(config.PORT, () => {
  console.log(`Valentines Beauty API em http://localhost:${config.PORT}/api (${config.NODE_ENV})`);
});
