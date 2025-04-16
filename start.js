const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const token = process.env.token;
const bot = new TelegramBot(token, { polling: true });
const adminID = 5302582529;


// Radio URLs
const radioUrl1 = "https://backup.qurango.net/radio/mohammed_allohaidan";
const radioUrl2 = "https://backup.qurango.net/radio/yasser_aldosari";

// Custom Keyboards-----------------------------------------------------------------------------------------------------------------------
const keyboard = {
    reply_markup: {
        keyboard: [
            [{ text: '📻 Radio Quran' }, {text: '🌐 Online Quran'}]
    ],
        resize_keyboard: true,
        one_time_keyboard: false
    }
};

const qori = {
    reply_markup: {
        keyboard: [
            [{text: 'Muhammad Al-Luhaidan'}, {text: 'Yasser Al-Dosari'}],
            [{text: '⬅️ Ortga'}]
        ],
        resize_keyboard: true, 
        one_time_keyboard: false
    }
};
//--------------------------------------------------------------------------------------------------------------------------------------------


// Foydalanuvchilar ro'yxati (chatId lar)
const usersFile = './Users.json';
let users = fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile)) : [];
function saveUsersList() {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// Foydalanuvchilar ma'lumotlari (ism, username, id)
const usersFile2 = './usersData.json';
let usersData = fs.existsSync(usersFile2) ? JSON.parse(fs.readFileSync(usersFile2)) : [];
function saveUsersData() {
    fs.writeFileSync(usersFile2, JSON.stringify(usersData, null, 2));
}

// ============== WELCOME & COMMANDS ==============
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name;
    bot.sendMessage(chatId, `Assalamu 'alaykum ${userName}!\n\n❓To'liq surani olish uchun sura raqamini (masalan, 1) yuboring yoki oyat uchun 1:2 tarzida yuboring.\n\n❓Quran Radio uchun [📖 Quran Radio] tugmasini bosing.`, keyboard);
});

// ============== QURAN RADIO =======================================================================================================
bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text
    if(text === '📻 Radio Quran'){
        bot.sendMessage(chatId, "Qorini tanlang 👇", qori)
    }
    
    if(text === '⬅️ Ortga'){
        bot.sendMessage(chatId, 'Bosh sahifadasiz.', keyboard)
    }

    if(text === '🌐 Online Quran'){
        bot.sendMessage(chatId, 'https://quran.com/1');
    }
//======================================================= Qorilar ===================
    const radioLinks = {
        'Muhammad Al-Luhaidan': 'https://backup.qurango.net/radio/mohammed_allohaidan',
        'Yasser Al-Dosari': "https://backup.qurango.net/radio/yasser_aldosari"
    }
        if(radioLinks[text]){
            bot.sendMessage(chatId, `🎧 Eshitish uchun: \n${radioLinks[text]}`)
        }
})
//------------------------------------------------------------------------------------------------------------------------------------------------



bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // 📖 Quran Radio tugmasi uchun
    if (text === '📖 Quran Radio') {
        return bot.sendMessage(chatId, "Qorini tanlang:", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Muhammad Al-Luhaidan", callback_data: "radio1" }],
                    [{ text: "Yasser Al-Dosari", callback_data: "radio2" }]
                ]
            }
        });
    }

    // Foydalanuvchi chatId ro'yxatga qo‘shiladi
    if (!users.includes(chatId)) {
        users.push(chatId);
        saveUsersList();
    }

    // Foydalanuvchi ma'lumotlari ro'yxatga qo‘shiladi
    const userInfo = {
        id: chatId,
        username: msg.from.username || "No username",
        name: `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim()
    };
    if (!usersData.some(u => u.id === chatId)) {
        usersData.push(userInfo);
        saveUsersData();
    }

    // Surah yoki ayatni tekshirish
    const match = text?.match(/^(\d+)(?::(\d+))?$/);
    if (match) {
        const [_, surah, ayah] = match;
        fetchQuranData(surah, ayah).then(result => {
            if (result) {
                if (fs.existsSync(result)) {
                    bot.sendDocument(chatId, result).then(() => fs.unlinkSync(result));
                } else {
                    bot.sendMessage(chatId, result);
                }
            } else {
                bot.sendMessage(chatId, "Bunday sura yoki oyat topilmadi.");
            }
        });
    }
});

// ============== FETCH QURAN DATA ==============
async function fetchQuranData(surah, ayah = null) {
    try {
        if (ayah) {
            const arabic = await axios.get(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/ar.alafasy`);
            const uzbek = await axios.get(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/uz.sodik`);
            const surahInfo = await axios.get(`https://api.alquran.cloud/v1/surah/${surah}/uz.sodik`);

            if (arabic.data.status === 'OK' && uzbek.data.status === 'OK') {
                return `✦${surahInfo.data.data.englishName}\n━━━━━━━━❀༻༺❀━━━━━━━━━━━━━━ا\n\n❁${arabic.data.data.text}\n\n━━━━━━━━❀༻༺❀━━━━━━━━━━━━━ا\n\n❁ ${uzbek.data.data.text}`;
            }
        } else {
            const response = await axios.get(`https://api.alquran.cloud/v1/surah/${surah}/uz.sodik`);
            if (response.data.status === 'OK') {
                const surahData = response.data.data;
                let text = `📘 *Surah ${surahData.englishName} (${surahData.englishNameTranslation}) - ${surahData.numberOfAyahs} oyat*\n\n`;
                surahData.ayahs.forEach(a => {
                    text += `${a.numberInSurah}. ${a.text}\n`;
                });

                const fileName = `surah_${surahData.englishName}.txt`;
                fs.writeFileSync(fileName, text);
                return fileName;
            }
        }
        return null;
    } catch (err) {
        console.error("fetchQuranData Error:", err.message);
        return null;
    }
}





//                                                        ===================================== /admin ==========================================
bot.onText(/\/admin/, (msg) => {
    if (msg.chat.id === adminID) {
        option = {
            reply_to_message_id: msg.message_id,
            parse_mode: "markdown",
            reply_markup: JSON.stringify({
              resize_keyboard: true,
              keyboard: [
                [`🔎 Users`, `📣 Send to all`]
              ]
            })
          }

        bot.sendMessage(adminID, "Admin paneliga xush kelibsiz.", option);

    } else {
        bot.sendMessage(msg.chat.id, "Bu buyruq faqat admin uchun.");
    }
});

bot.on("message", (msg) => {
    chatId = msg.chat.id;
    text = msg.text;  
    if(text == "🔎 Users"){
        let content = `Total Users: ${usersData.length}\n\n`;
        usersData.forEach(u => {
            content += `Name: ${u.name}\nUsername: ${u.username}\nUser ID: ${u.id}\n\n`;
        });
        const filePath = path.resolve('user_list.txt');
        fs.writeFileSync(filePath, content);
        bot.sendDocument(adminID, filePath, {}, { contentType: 'text/plain' });
    }
})   


let isSending = false;

bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Admin tomonidan yuborilgan "Send to all" buyrug'ini tekshirish
    if (text === "📣 Send to all" && chatId === adminID) {
        isSending = true; // keyingi xabarlarni yuborishga tayyor holatga o'tadi
        return bot.sendMessage(adminID, "📢 *Keyingi yuboriladigan xabar barcha foydalanuvchilarga jo'natiladi.*", {
            parse_mode: "Markdown"
        });
    }

    // Faqat admin keyingi xabarni yuboradi
    if (isSending && chatId === adminID) {
        isSending = false; // faqat bitta xabar yuboriladi, keyin flagni o'chiramiz

        usersData.forEach(u => {
            if (!u.id) return; // user.id mavjudligini tekshirish

            if (msg.text) {
                bot.sendMessage(u.id, msg.text).catch(() => {});
            } else if (msg.photo) {
                bot.sendPhoto(u.id, msg.photo[msg.photo.length - 1].file_id, {
                    caption: msg.caption || ''
                }).catch(() => {});
            } else if (msg.video) {
                bot.sendVideo(u.id, msg.video.file_id, {
                    caption: msg.caption || ''
                }).catch(() => {});
            } else if (msg.document) {
                bot.sendDocument(u.id, msg.document.file_id, {
                    caption: msg.caption || ''
                }).catch(() => {});
            } else if (msg.audio) {
                bot.sendAudio(u.id, msg.audio.file_id, {
                    caption: msg.caption || ''
                }).catch(() => {});
            } else if (msg.voice) {
                bot.sendVoice(u.id, msg.voice.file_id, {
                    caption: msg.caption || ''
                }).catch(() => {});
            } else if (msg.sticker) {
                bot.sendSticker(u.id, msg.sticker.file_id).catch(() => {});
            } else if (msg.location) {
                bot.sendLocation(u.id, msg.location.latitude, msg.location.longitude).catch(() => {});
            } else if (msg.contact) {
                bot.sendContact(u.id, msg.contact.phone_number, msg.contact.first_name).catch(() => {});
            } else if (msg.poll) {
                bot.sendPoll(u.id, msg.poll.question, msg.poll.options.map(opt => opt.text)).catch(() => {});
            } else if (msg.venue) {
                bot.sendVenue(
                    user.id,
                    msg.venue.location.latitude,
                    msg.venue.location.longitude,
                    msg.venue.title,
                    msg.venue.address
                ).catch(() => {});
            } else if (msg.animation) {
                bot.sendAnimation(u.id, msg.animation.file_id, {
                    caption: msg.caption || ''
                }).catch(() => {});
            }
        });

        return bot.sendMessage(adminID, "✅ Xabar barcha foydalanuvchilarga yuborildi.");
    }

    // Oddiy foydalanuvchilar buyrug'ni yozsa
    if (text === "Send to all" && chatId !== adminID) {
        bot.sendMessage(chatId, "❌ Bu buyruq faqat admin uchun mo‘ljallangan.");
    }
});

console.log("...");
