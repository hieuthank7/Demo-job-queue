import app from "./src/api/app";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[Server] API running on http://localhost:${PORT}`);
});
