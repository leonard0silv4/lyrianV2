require("dotenv").config();
const app = require("./app");
const { connectDb } = require("./shared/db/connection");

const PORT = process.env.PORT || 4001;

connectDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`lyria-ateliers-backend listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });
