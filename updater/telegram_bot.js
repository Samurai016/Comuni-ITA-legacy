const Telegraf = require('telegraf').Telegraf;
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname + '\\..\\environment.env') });

const strings = {
    'welcome': `🎉 *Benvenuto!*\nTi sei registrato al logger dell'API [comuni-ita](https://comuni-ita.herokuapp.com/).\nQuando l'API si aggiornerà riceverai dei log e ti verrà chiesto di risolvere i conflitti.\nIl tuo chat ID è: *%s*`,
    'notSubscribed': `‼ *Attenzione!*\nNon sei registrato\.\nEsegui il comando /start per registrarti.`,
    'unsubscribed': `❌ Ti sei disiscritto. Non riceverai più aggiornamenti.`
};

module.exports.TelegramBot = class TelegramBot {
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
        this.bot.on('text', (ctx) => this.onMessage(ctx));
        this.onDismiss();

        this.bot.launch();
        if (this.user)
            this.log(`Bot started with a connected user`);
        else
            this.log(`Bot started without connected user`);
    }

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

    async sendText(text, options) {
        if (this.user) {
            const message = await this.bot.telegram.sendMessage(this.user, text, {
                parse_mode: 'MarkdownV2'
            });
            if (options)
                this.replyBuffer.set(message.message_id, options);
        }
    }

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
        const chat = await ctx.getChat();
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