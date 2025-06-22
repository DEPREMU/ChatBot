import app from "./app.ts";
import { port } from "./config.ts";

const server = app.listen(port, () => {
  console.log(`Server listening in port ${port}`);
});
