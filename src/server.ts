import errorHandler from "errorhandler";

import app from "./app";
import { Logger } from "./util/logger";

const logger = new Logger("server");

/**
 * Error Handler. Provides full stack - remove for production
 */
if (process.env.NODE_ENV !== "production") {
  app.use(errorHandler());
}

/**
 * Start Express server.
 */
const server = app.listen(app.get("port"), () => {
  logger.info(
    `App is running at http://localhost:${app.get("port")} in ${app.get("env")} mode`
  );
  logger.info("Press CTRL-C to stop\n");
});

export default server;
