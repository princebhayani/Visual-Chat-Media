import path from "path";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import conversationsRoutes from "./routes/conversations";
import messagesRoutes from "./routes/messages";
import callsRoutes from "./routes/calls";
import { authenticateFirebase } from "./middleware/authenticate";
import { setupSocketIO } from "./socket/socket-handler";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

const app = express();
const httpServer = createServer(app);
// Support both PORT (standard) and API_PORT (legacy) for deployment compatibility
const port = process.env.PORT ? Number(process.env.PORT) : (process.env.API_PORT ? Number(process.env.API_PORT) : 4000);
const allowedOrigins = process.env.FRONTEND_ORIGINS?.split(",").map((origin) => origin.trim()) ?? [
	"http://localhost:3000",
];

const io = new Server(httpServer, {
	cors: {
		origin: allowedOrigins,
		credentials: true,
	},
});

app.use(
	cors({
		origin: allowedOrigins,
		credentials: true,
	})
);
app.use(express.json({ limit: "25mb" }));

app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});

app.use("/auth", authRoutes);

app.use(authenticateFirebase);
app.use("/users", usersRoutes);
app.use("/conversations", conversationsRoutes);
app.use("/messages", messagesRoutes);
app.use("/calls", callsRoutes);

setupSocketIO(io);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
	console.error(err);
	res.status(500).json({ message: "Something went wrong" });
});

httpServer.listen(port, () => {
	console.log(`API server listening on port ${port}`);
});

