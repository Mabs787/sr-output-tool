const express = require("express");
const path = require("path");

const PORT = parseInt(process.env.PORT || "3000", 10);
const app = express();

app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
  console.log(`\n  🧪 Test app running at http://localhost:${PORT}\n`);
});
