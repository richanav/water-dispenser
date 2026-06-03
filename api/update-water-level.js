import admin from "firebase-admin"

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_KEY)

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}

const db = admin.firestore()

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).send("AquaAlert API working")
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed")
  }

  try {
    const data = req.body

    const deviceId = data.device_id
    const waterLevel = String(data.water_level).toLowerCase()
    const battery = data.battery || "0"

    await db.collection("devices").doc(deviceId).set({
      device_id: deviceId,
      water_level: waterLevel,
      battery: battery,
      status: "online",
      timestamp: Date.now(),
    })

    if (waterLevel === "low") {
      await db.collection("low_water_alerts").add({
        device_id: deviceId,
        water_level: waterLevel,
        createdAt: new Date(),
      })
    }

    return res.status(200).send("Data stored successfully")
  } catch (error) {
    console.error(error)
    return res.status(500).send(error.message)
  }
}