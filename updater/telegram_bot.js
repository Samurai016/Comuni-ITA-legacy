const Telegraf = require('telegraf').Telegraf;
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname + '\\..\\environment.env') });

const strings = {
    'welcome': `🎉 *Benvenuto!*\nTi sei registrato al logger dell'API [comuni-ita](https://comuni-ita.herokuapp.com/).\nQuando l'API si aggiornerà riceverai dei log e ti verrà chiesto di risolvere i conflitti.\nIl tuo chat ID è: *%s*`,
    'notSubscribed': `‼ *Attenzione!*\nNon sei registrato\.\nEsegui il comando /start per registrarti.`,
    'unsubscribed': `❌ Ti sei disiscritto. Non riceverai più aggiornamenti.`,
    'editHeader': `✏ *Modalità modifica*\n\n`,
    'editStep1': `✏ *Modalità modifica*\n\nRispondi con il nome del comune che vuoi modificare`,
    'editStep2': `✏ *Modalità modifica*\n\nComune trovato, invia i nuovi dati in formato JSON`,
    'editError': `✏ *Modalità modifica*\n\nNon esiste nessun comune con il nome indicato`,
    'editSuccess': `✏ *Modalità modifica*\n\nComune modificato correttamente`
};

module.exports.TelegramBot = class TelegramBot {
    /**
     * Create a new bot
     * @param {Function} onStopUpdate A callback that is called when the user cancel an operation
     */
    constructor(onStopUpdate) {
        this.log('Bot starting');
        this.bot = new Telegraf(process.env.BOT_KEY);
        this.user = null;
        this.replyBuffer = new Map();
        this.onStopUpdate = onStopUpdate;

        if (process.env.TELEGRAM_CHAT)
            this.user = Number.parseInt(process.env.TELEGRAM_CHAT);

        this.bot.start((ctx) => this.onStart(ctx));
        this.bot.command('unsubscribe', (ctx) => this.onUnsubscribe(ctx));
        this.bot.command('cancel', (ctx) => this.onCancel(ctx));
        this.bot.command('edit', (ctx) => this.onEdit(ctx));
        this.bot.on('text', (ctx) => this.onMessage(ctx));
        this.onDismiss();

        this.bot.launch();
        if (this.user)
            this.log(`Bot started with a connected user`);
        else
            this.log(`Bot started without connected user`);
    }

    /**
     * Send a markdown text message and wait for a valid reply
     * @param {String} text The markdown text to send
     * @param {Function} validateReply A callback that is called every time a reply is received, it should return true when the reply is ok, false either
     * @returns {Promise<Context>} The reply Context
     */
    waitForReply(text, validateReply) {
        const self = this;
        return new Promise(async (resolve, rej) => {
            await self.sendText(text, {
                validateReply: validateReply,
                onReply: (ctx) => {
                    resolve(ctx);
                }
            })
        });
    }

    /**
     * Send a markdown text message
     * @param {String} text The markdown text to send
     * @param {Object} options An object containing various options like the validateReply and the onReply callbacks
     */
    async sendText(text, options) {
        if (this.user) {
            const message = await this.bot.telegram.sendMessage(this.user, text, {
                parse_mode: 'MarkdownV2'
            });
            if (options)
                this.replyBuffer.set(message.message_id, options);
        }
    }

    /**
     * Send a document message based on array of bytes
     * @param {Buffer} bytes The bytes to send
     * @param {String} filename The name of the file that will be shown to the user
     * @param {String} caption The markdown message that will be attached to the document
     * @param {Object} options An object containing various options like the validateReply and the onReply callbacks
     */
    async sendBytes(bytes, filename, caption, options) {
        if (this.user) {
            const message = await this.bot.telegram.sendDocument(this.user, {
                source: bytes,
                filename: filename
            }, {
                caption: caption,
                parse_mode: 'MarkdownV2'
            });
            if (options)
                this.replyBuffer.set(message.message_id, options);
        }
    }

    /**
     * Send a document message based on a file path
     * @param {String} url The path of the file
     * @param {String} caption The markdown message that will be attached to the document
     * @param {Object} options An object containing various options like the validateReply and the onReply callbacks
     */
    async sendFile(url, caption, options) {
        const data = fs.readFileSync(url);
        await this.sendBytes(data, path.basename(url), caption, options);
    }

    async onStart(ctx) {
        const chat = await ctx.getChat();
        this.user = chat.id;
        await ctx.replyWithMarkdown(strings.welcome.replace('%s', chat.id));
        this.log(`User subscribed`);
    }

    async onUnsubscribe(ctx) {
        this.user = null;
        await ctx.replyWithMarkdown(strings.unsubscribed);
        this.log('User unsubscribed');
    }

    async onCancel(ctx) {
        if (await this.checkSubscribe(ctx) && this.onStopUpdate) {
            await this.onStopUpdate(ctx);
        }
    }

    async onEdit(ctx) {
        if (await this.checkSubscribe(ctx)) {
            this.log('[Editing] Started');
            const db = await mysql.createConnection({
                host: process.env.MYSQL_HOST || 'localhost',
                user: process.env.MYSQL_USERNAME || 'root',
                password: process.env.MYSQL_PASSWORD || null,
                database: process.env.MYSQL_DATABASE || 'comuni-ita'
            });
            const comuneValido = await this.waitForReply(strings.editStep1, async (rep) => {
                // Cerco comune
                const comune = (await db.execute('SELECT * FROM comuni WHERE LOWER(nome)=?', [rep.update.message.text.trim().toLowerCase()]))[0];

                // Se non esiste segnalo l'errore
                if (comune.length < 1) {
                    this.log('[Editing] Comune non valido');
                    await this.bot.telegram.editMessageText(
                        ctx.update.message.chat.id,
                        ctx.update.message.message_id, null,
                        strings.editError,
                    );
                    return false;
                }
                return true;
            });
            this.log('[Editing] Comune valido');

            const newDataJson = await this.waitForReply(strings.editStep2, async (rep) => {
                var error = '';
                try {
                    var json = JSON.parse(rep.update.message.text);
                    const keys = Object.keys(json);
                    if (keys < 1) { 
                        error = 'Impossibile inviare dati vuoti'; 
                    } else  {
                        for (let i = 0; i < keys.length; i++) {
                            const key = keys[i];
                            json[key] = json[key] instanceof String ? json[key].trim() : json[key];
                            switch (key) {
                                case 'codice':
                                    if (json[key].length>10) error = 'Codice troppo lungo (max 10 caratteri)';
                                    break;
                                case 'nome':
                                    if (json[key].length>100) error = 'Nome troppo lungo (max 100 caratteri)';
                                    break;
                                case 'codiceCatastale':
                                    if (json[key].length>5) error = 'Codice catastale troppo lungo (max 5 caratteri)';
                                    break;
                                case 'cap':
                                    if (json[key].length!=5) error = 'Il CAP deve essere di 5 caratteri';
                                    break;
                                case 'lat':
                                    if (-90 <= json[key] && json[key] <= 90) error = 'La latitudine deve essere compresa da -90 e 90';
                                    break;
                                case 'lng':
                                    if (-180 <= json[key] && json[key] <= 180) error = 'La longitudine deve essere compresa da -180 e 180';
                                    break;
                                case 'provincia': break;
                                default:
                                    error = `Colonna _ ${key}_ inesistente`;
                                    break;
                            }
                        }
                    }
                } catch (error) {
                    error = 'JSON non valido';
                }

                if (error) {
                    this.log('[Editing] Dati non validi');
                    await this.bot.telegram.editMessageText(
                        ctx.update.message.chat.id,
                        ctx.update.message.message_id, null,
                        strings.editError+error,
                    );
                    return false;
                } else {
                    return true;
                }
            });
            const newData = JSON.parse(newDataJson.update.message.text);
            const columns = Object.keys(newData).map((colonna) => {return `${colonna} = ?`}).join(',');
            const values = Object.values(newData);
            this.log('[Editing] Dati validi');

            await db.execute(`UPDATE comuni SET ${columns} WHERE codice=?`, [values, comuneValido[0].codice]);
            this.log('[Editing] Dati modificati');
            await this.bot.telegram.editMessageText(
                ctx.update.message.chat.id,
                ctx.update.message.message_id, null,
                strings.editSuccess,
            );
        }
    }

    async onMessage(ctx) {
        if (await this.checkSubscribe(ctx)) {
            const reply = ctx.update.message.reply_to_message;
            if (reply && this.replyBuffer.has(reply.message_id)) {
                const options = this.replyBuffer.get(reply.message_id);
                if ((options.validateReply && await options.validateReply(ctx)) || !options.validateReply) {
                    options.onReply?.apply(null, [ctx]);
                    this.replyBuffer.delete(reply.message_id);
                }
            }
        }
    }

    onDismiss() {
        function exitHandler(instance, exitCode, options) {
            if (options.cleanup) {
                try {
                    instance.bot.stop(exitCode);
                    instance.log('Bot turn off');
                } catch (error) { }
            }
            if (options.exit) {
                process.exit();
            }
        }

        //do something when app is closing
        process.on('exit', exitHandler.bind(null, this, 'exit', { cleanup: true }));

        //catches ctrl+c event
        process.on('SIGINT', exitHandler.bind(null, this, 'SIGINT', { exit: true }));
        process.on('SIGTERM', exitHandler.bind(null, this, 'SIGTERM', { exit: true }));

        // catches "kill pid" (for example: nodemon restart)
        process.on('SIGUSR1', exitHandler.bind(null, this, 'SIGUSR1', { exit: true }));
        process.on('SIGUSR2', exitHandler.bind(null, this, 'SIGUSR2', { exit: true }));
    }

    async checkSubscribe(ctx) {
        if (!this.user) {
            await ctx.replyWithMarkdown(strings.notSubscribed);
            return false;
        }
        return true;
    }

    log(message) {
        console.log(`[Telegram Bot] ${message}`);
    }
}