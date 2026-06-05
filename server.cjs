const express = require("express");

const cors = require("cors");

const admin = require("firebase-admin");

const fs = require("fs");

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const qrcode = require("qrcode-terminal");
const QRCode = require("qrcode");
/* FIREBASE SETUP */

const serviceAccount = JSON.parse(
    fs.readFileSync(
        "./water-dispenser-key.json",
        "utf8"
    )
);

admin.initializeApp({
    credential:
        admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/* EXPRESS SERVER */

const app = express();

app.use(cors());

app.use(express.json());

let sock;

/* WHATSAPP CONNECTION */

async function connectToWhatsApp() {

    const { state, saveCreds } =
        await useMultiFileAuthState(
            "auth_info_baileys"
        );

    const { version } =
        await fetchLatestBaileysVersion();

    console.log(
        `Using WA v${version.join(".")}`
    );

    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false
    });

    sock.ev.on(
        "connection.update",

        async (update) => {

            const {
                connection,
                lastDisconnect,
                qr
            } = update;

            /* SHOW QR */

            if (qr) {

                console.log(
                    "\nScan QR Below:\n"
                );

                qrcode.generate(qr, {
                    small: true
                });
            }

            /* CONNECTED */

            if (connection === "open") {

                console.log(
                    "\n✅ WhatsApp Connected\n"
                );

                try {

                    await sock.sendMessage(
                        "919745554888@s.whatsapp.net",
                        {
                            text:
                                "✅ Test message from server"
                        }
                    );

                    console.log(
                        "✅ Test message sent"
                    );

                } catch (err) {

                    console.log(
                        "❌ Test message failed"
                    );

                    console.log(err);
                }
            }

            /* DISCONNECTED */

            else if (
                connection === "close"
            ) {

                const statusCode =
                    lastDisconnect?.error
                        ?.output?.statusCode;

                const shouldReconnect =
                    statusCode !==
                    DisconnectReason.loggedOut;

                console.log(
                    "\n❌ WhatsApp Disconnected\n"
                );

                if (shouldReconnect) {

                    console.log(
                        "Reconnecting...\n"
                    );

                    connectToWhatsApp();
                }
            }
        }
    );

    sock.ev.on(
        "creds.update",
        saveCreds
    );
}

/* START WHATSAPP */

connectToWhatsApp();

/* TEST ROUTE */

app.get("/", (req, res) => {

    res.send(
        "Server Running"
    );
});
/* DELIVERY REQUEST ROUTE */

app.post("/request-delivery", async (req, res) => {
  console.log("🚚 Delivery request received");
    try {

        const {
            customerName,
            customerPhone,
            deviceId
        } = req.body;

        const vendorNumber = "919745554888";

        const message =
`🚚 DELIVERY REQUEST

Customer: ${customerName}
Phone: ${customerPhone}
Device: ${deviceId}

Customer has requested a water can delivery.`;

        await sock.sendMessage(
            vendorNumber + "@s.whatsapp.net",
            { text: message }
        );

        res.json({
            success: true,
            message: "Vendor notified successfully"
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Failed to notify vendor"
        });
    }
});


/* MAIN ROUTE */

app.post(
    "/update-water-level",

    async (req, res) => {

        console.log(
            "\n🔥 API CALLED 🔥"
        );

        try {

            const data = req.body;

            console.log("\nReceived Data:");
            console.log(data);

            const deviceRef = db
                .collection("devices")
                .doc(data.device_id);

            /* GET PREVIOUS DATA */

            const oldDoc =
                await deviceRef.get();

            const previousLevel =
                oldDoc.exists
                    ? String(
                        oldDoc.data()
                            .water_level || ""
                      )
                          .trim()
                          .toLowerCase()
                    : "";

            /* CURRENT LEVEL */

            const currentLevel =
                String(data.water_level)
                    .trim()
                    .toLowerCase();

            console.log(
                "Previous Level:",
                previousLevel
            );

            console.log(
                "Current Level:",
                currentLevel
            );

            /* STORE LATEST DATA */

            await deviceRef.set({

                water_level:
                    currentLevel,

                battery:
                    data.battery,

                status:
                    "online",

                timestamp:
                    Date.now()

            });

            console.log(
                "✅ Firebase Updated"
            );


             /* STORE LOW WATER ALERT */

            if (currentLevel === "low") {

            await db
            .collection("low_water_alerts")
            .add({

            device_id:
                data.device_id,

            water_level:
                currentLevel,

            createdAt:
                new Date()

            });

            console.log(
              "✅ Low water alert stored"
            );
            }

            /* ==========================
               STATE CHANGE DETECTION
               ==========================

               HIGH -> LOW
               Send Payment QR

               LOW -> LOW
               Do Nothing

               LOW -> HIGH
               Send Refilled Message

               HIGH -> HIGH
               Do Nothing
            */

            if (
                previousLevel === "high" &&
                currentLevel === "low"
            ) {

                console.log(
                    "🚨 HIGH -> LOW detected"
                );

                try {

                    const upiId =
                        "acd@oksbi";

                    const payeeName =
                        "Water Vendor";

                    const amount =
                        "1";

                    const note =
                        `Refill for ${data.device_id}`;

                    const upiLink =
                        `upi://pay?pa=${upiId}` +
                        `&pn=${encodeURIComponent(
                            payeeName
                        )}` +
                        `&am=${amount}` +
                        `&cu=INR` +
                        `&tn=${encodeURIComponent(
                            note
                        )}`;

                    const qrPath =
                        `./upi-${data.device_id}.png`;

                    await QRCode.toFile(
                        qrPath,
                        upiLink
                    );

                    console.log(
                        "✅ QR Generated"
                    );

                    await sock.sendMessage(
                        "919745554888@s.whatsapp.net",
                        {
                            image:
                                fs.readFileSync(
                                    qrPath
                                ),

                            caption:
`🚨 Water dispenser EMPTY

💳 Scan QR to Pay

Amount: ₹${amount}`
                        }
                    );

                    console.log(
                        "✅ WhatsApp QR sent"
                    );

                } catch (err) {

                    console.log(
                        "❌ WhatsApp Error"
                    );

                    console.log(err);
                }
            }

            else if (
                previousLevel === "low" &&
                currentLevel === "high"
            ) {

                console.log(
                    "✅ LOW -> HIGH detected"
                );

                try {

                    await sock.sendMessage(
                        "919745554888@s.whatsapp.net",
                        {
                            text:
                                "✅ Water dispenser REFILLED"
                        }
                    );

                    console.log(
                        "✅ Refill message sent"
                    );

                } catch (err) {

                    console.log(
                        "❌ WhatsApp Error"
                    );

                    console.log(err);
                }
            }

            else {

                console.log(
                    "ℹ️ No state change. No alert sent."
                );
            }

            res.send(
                "Data stored successfully"
            );

        } catch (error) {

            console.error(error);

            res.status(500).send(error);
        }
    }
);



/* START SERVER */

app.listen(3000, "0.0.0.0", () => {

    console.log(
        "\n🚀 Server running on port 3000\n"
    );
});