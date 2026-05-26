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

/* MAIN ROUTE */

app.post(
    "/update-water-level",

    async (req, res) => {

        try {

            const data = req.body;

            console.log("\nReceived Data:");
            console.log(data);

            /* STORE TO FIREBASE */

            await db
                .collection("devices")
                .doc(data.device_id)
                .set({

                    water_level:
                        data.water_level,

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

            /* WHATSAPP ALERT */

            console.log(
                "Checking water level..."
            );

            const waterLevel =
                String(data.water_level)
                .trim()
                .toLowerCase();

            console.log(
                "Processed Level:"
            );

            console.log(waterLevel);

            if (
                waterLevel.includes("low")
            ) {

                console.log(
                    "LOW water level detected"
                );

                try {

                    console.log(
                        "Sending WhatsApp message..."
                    );

                    await sock.sendMessage(
                        "919745554888@s.whatsapp.net",
                        {
                            text:
                                "🚨 Water dispenser EMPTY"
                        }
                    );

                    console.log(
                        "✅ WhatsApp message sent"
                    );

                } catch (err) {

                    console.log(
                        "❌ WhatsApp Error:"
                    );

                    console.log(err);
                }
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

app.listen(3000, () => {

    console.log(
        "\n🚀 Server running on port 3000\n"
    );
});