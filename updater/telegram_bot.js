const Telegraf = require('telegraf').Telegraf;
const fs = require('fs');
const path = require('path');
require('dotenv').config({path: path.resolve(__dirname+'\\..\\environment.env')});

const usersPath = __dirname+'\\telegram_chats.json';
const strings = {
    'welcome': `🎉 *Benvenuto!*\nTi sei registrato al logger dell'API [comuni-ita](https://comuni-ita.herokuapp.com/).\nQuando l'API si aggiornerà riceverai dei log e ti verrà chiesto di risolvere i conflitti.`,
    'notSubscribed': `‼ *Attenzione!*\nNon sei registrato\.\nEsegui il comando /start per registrarti.`,
    'unsubscribed': `❌ Ti sei disiscritto. Non riceverai più aggiornamenti.`
};
    
module.exports.TelegramBot = class TelegramBot {
    constructor(onStopUpdate) {
        console.log('[Telegram Bot] Bot starting');
        this.bot = new Telegraf(process.env.BOT_KEY);
        this.users = new Set();
        this.replyBuffer = new Map();
        this.onStopUpdate = onStopUpdate;

        if (process.env.TELEGRAM_CHAT)
            this.users.add(Number.parseInt(process.env.TELEGRAM_CHAT));

        this.bot.start((ctx) => this.onStart(ctx));
        this.bot.command('unsubscribe', (ctx) => this.onUnsubscribe(ctx));
        this.bot.command('cancel', (ctx) => this.onCancel(ctx));
        this.bot.on('text', (ctx) => this.onMessage(ctx));
        this.onDismiss();

        this.bot.launch();
        console.log(`[Telegram Bot] Bot started with ${this.users.size} users`);
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
        const users = Array.from(this.users);
        for (let i = 0; i < users.length; i++) {
            const message = await this.bot.telegram.sendMessage(users[i], text, {
                parse_mode: 'MarkdownV2'
            });
            if (options)
                this.replyBuffer.set(message.message_id, options);
        }
    }

    async sendFile(url, caption, options) {
        const users = Array.from(this.users);
        for (let i = 0; i < users.length; i++) {
            const data = fs.readFileSync(url);
            const message = await this.bot.telegram.sendDocument(users[i], {
                source: data,
                filename: path.basename(url)
            }, {
                caption: caption,
                parse_mode: 'MarkdownV2'
            });
            if (options)
                this.replyBuffer.set(message.message_id, options);
        }
    }

    async onStart(ctx) {
        const chat = await ctx.getChat();
        this.users.add(chat.id);
        await ctx.replyWithMarkdown(strings.welcome);
        this.log(`User subscribed`);
    }

    async onUnsubscribe(ctx) {
        const chat = await ctx.getChat();
        this.users.delete(chat.id);
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
                    fs.writeFileSync(usersPath, JSON.stringify(Array.from(instance.users)));
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
        if (!this.users.has(chat.id)) {
            await ctx.replyWithMarkdown(strings.notSubscribed);
            return false;
        }
        return true;
    }

    log(message) {
        console.log(`[Telegram Bot] ${message}`);
    }
}