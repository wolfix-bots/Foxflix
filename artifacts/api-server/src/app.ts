import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes/index.js";
import authRouter from "./routes/auth.js";
import userRouter from "./routes/user.js";
import roomsRouter from "./routes/rooms.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info({ method: req.method, url: req.url?.split("?")[0] }, "request");
  next();
});

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/rooms", roomsRouter);

export default app;
