import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import fs from "fs";

const serviceAccount = JSON.parse(
  fs.readFileSync("./water-dispenser-key.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();

app.use(cors());
app.use(express.json());

app.get("/update-water-level", (req, res) => {
  res.send("POST endpoint working");
});

app.post("/update-water-level", async (req, res) => {
  try {
    const data = req.body;

    await db.collection("devices").doc(data.device_id).set({
      water_level: data.water_level,
      battery: data.battery,
      status: "online",
      timestamp: Date.now(),
    });

    if (String(data.water_level).toUpperCase() === "LOW") {
      await db.collection("low_water_alerts").add({
        device_id: data.device_id,
        water_level: data.water_level,
        createdAt: new Date(),
      });
    }

    res.send("Data stored successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});