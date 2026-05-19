const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion 
} = require('@whiskeysockets/baileys');

const qrcode = require('qrcode-terminal');
const { Boom } = require('@hapi/boom');

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    // Get latest WhatsApp version
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Using WA v${version.join('.')}, isLatest: ${isLatest}`);

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "121.0.6167.160"]
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Show QR
        if (qr) {
            qrcode.generate(qr, { small: true });
            console.log("▲ Scan the QR code above ▲");
        }

        // Handle disconnect
        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error instanceof Boom)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            console.log(`Connection closed (Reason: ${statusCode}). Reconnecting: ${shouldReconnect}`);

            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } 
        
        // On successful connection
        else if (connection === 'open') {
            console.log('✅ Connection established successfully!');

            try {
                const groupName = "water refill";

                // 🔴 Replace with your participants
                const participants = [
                    "919686568538@s.whatsapp.net",
                    "919961915908@s.whatsapp.net"
                ];

                // 🔍 Get all groups
                const groups = await sock.groupFetchAllParticipating();

                // 🔍 Find if group already exists
                let existingGroup = Object.entries(groups).find(
                    ([id, group]) => group.subject === groupName
                );

                let groupId;

                if (existingGroup) {
                    groupId = existingGroup[0];
                    console.log("✅ Group already exists:", groupId);
                } else {
                    const newGroup = await sock.groupCreate(groupName, participants);
                    groupId = newGroup.id;
                    console.log("✅ New group created:", groupId);
                }

                // ⏳ Wait before sending message
                setTimeout(async () => {
                    await sock.sendMessage(groupId, {
                        text: "water alert"
                    });

                    console.log("📩 Message sent to group");
                }, 3000);

            } catch (err) {
                console.log("❌ Error:", err);
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

connectToWhatsApp();