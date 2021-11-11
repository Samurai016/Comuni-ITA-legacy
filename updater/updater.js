const fetch = require('node-fetch');
const xlsx = require('xlsx');
const telegram = require('./telegram_bot');
const fs = require('fs');
const zipper = require('adm-zip');
const path = require('path');
const paths = {
    comuni: path.resolve(__dirname + '\\..\\comuni.json'),
    province: path.resolve(__dirname + '\\..\\province.json'),
    regioni: path.resolve(__dirname + '\\..\\regioni.json'),
    regione: path.resolve(__dirname + '\\..\\regioni\\%s.json'),
    backup: path.resolve(__dirname + '\\..\\backup.zip'),
};
const backupFiles = [
    path.resolve(__dirname + '\\..\\comuni.json'),
    path.resolve(__dirname + '\\..\\province.json'),
    path.resolve(__dirname + '\\..\\regioni.json'),
    path.resolve(__dirname + '\\..\\regioni')
];

//#region Utils
String.prototype.capitalize = function () {
    return this.split(' ').map((chunk) => { return chunk.substring(0, 1).toUpperCase() + chunk.substring(1).toLowerCase() }).join(' ');
};
function getCoords(point) {
    const match = /Point\((.+) (.+)\)/gm.exec(point);
    return match ? {
        lat: match[1],
        lng: match[2],
    } : {};
}
function sanitizeProvincia(name) {
    const match = /(.+)\/.+/.exec(name);
    return (match ? match[1] : name)?.trim().toLowerCase();
}
function sanitizeRegione(name) {
    return sanitizeProvincia(name)?.replaceAll('-', ' ');
}
function sanitizeCap(cap) {
    const match = /^"?(?<cap>\d+)/.exec(cap);
    return match ? match[1] : cap;
}
function sanitizeForTelegram(text) {
    const escapes = ['!', '-', '.'];
    for (let i = 0; i < escapes.length; i++) {
        text = text.replaceAll(escapes[i], `\\${escapes[i]}`);
    }
    return text;
}
//#endregion

(async () => {
    const startDate = new Date();
    //#region Setup
    const bot = new telegram.TelegramBot(async (ctx) => {
        if (new Date(ctx.update.message.date * 1000) >= startDate) {
            await bot.sendText(`‼ *Aggiornamento annullato*`);
            console.log('[Updater] Update canceled');
            process.exit();
        }
    });
    process.on('uncaughtException', async (err) => {
        console.error(err);
        await bot.sendText(
            `‼ *Errore*\n` +
            `Aggiornamento terminato con un errore:\n` +
            '```\n' +
            JSON.stringify(err) +
            '```'
        );
        process.exit();
    });
    //#endregion

    await bot.sendText('🔄 *Aggiornamento database iniziato*');

    //#region 1. Fetching file
    console.log('[Updater] Fetching file');
    const buffer = await fetch("https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.xls").then(res => res.buffer());
    const workbook = xlsx.read(buffer);
    const csv = xlsx.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]).split('\n');
    //#endregion

    //#region Reading file and mapping
    console.log('[Updater] Reading file and mapping');
    const comuni = [];
    const regioni = [];
    const province = new Map();
    const codiciIstat = [];
    for (let i = 3; i < csv.length; i++) {
        const comune = csv[i].split(',');
        if (comune[5]) {
            codiciIstat.push(comune[3]);
            comuni.push({
                "nome": comune[5]?.trim(),
                "codice": comune[4]?.trim(),
                "codiceCatastale": comune[19]?.trim(),
                "regione": sanitizeRegione(comune[10]),
                "provincia": sanitizeProvincia(comune[11]),
            });
        }
        // Province
        if (comune[2] && !province.has(comune[2]?.trim())) {
            province.set(comune[2]?.trim(), {
                "nome": sanitizeProvincia(comune[11]),
                "codice": comune[2]?.trim(),
                "sigla": comune[14]?.trim().toLowerCase(),
                "regione": sanitizeRegione(comune[10]),
            });
        }
        // Regioni
        if (comune[10] && !regioni.includes(sanitizeRegione(comune[10]))) {
            regioni.push(sanitizeRegione(comune[10]));
        }
    }
    //#endregion

    //#region Fetching extra data
    // https://query.wikidata.org/#SELECT%20%3Fistat%20%3Fcap%20%3Fcoordinate%0AWHERE%20%7B%0A%20%20%3Fitem%20wdt%3AP31%20wd%3AQ747074.%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP635%20%3Fistat.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP281%20%3Fcap.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP625%20%3Fcoordinate.%20%7D%0A%20%20%0A%20%20SERVICE%20wikibase%3Alabel%20%7B%20%0A%20%20%20%20bd%3AserviceParam%20wikibase%3Alanguage%20"it".%20%0A%20%20%20%20%23%20%3Fitem%20rdfs%3Alabel%20%3FitemLabel.%0A%20%20%7D%0A%7D
    console.log('[Updater] Fetching extra data');
    const url = 'https://query.wikidata.org/sparql?query=SELECT%20%3Fistat%20%3Fcap%20%3Fcoordinate%0AWHERE%20%7B%0A%20%20%3Fitem%20p%3AP31%2Fps%3AP31%2Fwdt%3AP279*%20wd%3AQ747074.%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP635%20%3Fistat.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP281%20%3Fcap.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP625%20%3Fcoordinate.%20%7D%0A%20%20%0A%20%20SERVICE%20wikibase%3Alabel%20%7B%20%0A%20%20%20%20bd%3AserviceParam%20wikibase%3Alanguage%20%22it%22.%20%0A%20%20%20%20%23%20%3Fitem%20rdfs%3Alabel%20%3FitemLabel.%0A%20%20%7D%0A%7D';
    const responseBuffer = await fetch(url, { headers: { 'Accept': 'text/csv' } }).then(res => res.buffer());
    const comuniWithProblems = new Map();
    try {
        // Create binding map
        const map = new Map();
        const wikiLines = responseBuffer.toString().split('\r\n');
        for (let i = 1; i < wikiLines.length; i++) {
            const wikiLine = wikiLines[i].split(',');
            map.set(wikiLine[0], wikiLine);
        }

        // Binding data
        for (let i = 0; i < comuni.length; i++) {
            const comune = map.get(comuni[i].codice);
            if (comune) {
                comuni[i].cap = sanitizeCap(comune[1]);
                comuni[i].coordinate = getCoords(comune[2]);
            } else {
                comuniWithProblems.set(i, comuni[i]);
            }
        }
    } catch (err) {
        console.error('Error');
    }
    //#endregion

    //#region Solving conflicts
    console.log('[Updater] Solving conflicts');
    // Dump errors
    if (comuniWithProblems.size > 0) {
        const comuniWithProblemsKeys = Array.from(comuniWithProblems.keys());
        for (let i = 0; i < comuniWithProblemsKeys.length; i++) {
            const comune = comuniWithProblems.get(comuniWithProblemsKeys[i]);
            const reply = await bot.waitForReply(sanitizeForTelegram(
                `❗ *Conflitto!*\n\n` +
                `Comune: _${comune.nome}_\n` +
                `Regione: _${comune.regione}_\n` +
                `Provincia: _${comune.provincia}_\n` +
                `Codice ISTAT: _${comune.codice}_\n` +
                `Codice catasto: _${comune.codiceCatastale}_\n\n` +
                `Rispondi a questo messaggio inviando *CAP* e *coordinate* in questo modo:\n` +
                '`cap, Point(lat lon)`'
            ), async (rep) => {
                const success = /(\d+), ?(.+)/gm.exec(rep.update.message.text.trim());
                if (!success) await bot.sendText(`Dato non valido`);
                return success;
            });

            if (reply) {
                const match = /(\d+), ?(.+)/gm.exec(reply.update.message.text.trim());
                if (match) {
                    comuni[comuniWithProblemsKeys[i]].cap = sanitizeCap(match[1]);
                    comuni[comuniWithProblemsKeys[i]].coordinate = getCoords(match[2]);
                    success = true;
                }
            }
        }
    } else {
        console.log('[Updater] No conflicts found');
    }
    //#endregion

    //#region Sorting
    const comuniSorted = comuni.sort((a, b) => a.nome.localeCompare(b.nome));
    const provinceSorted = Array.from(province.values()).sort((a, b) => Number.parseInt(a.codice) - Number.parseInt(b.codice));
    const regioniSorted = regioni.sort((a, b) => a.localeCompare(b));
    //#endregion

    //#region Update repos
    console.log('[Updater] Backuping repo');
    const zip = new zipper();
    for (let i = 0; i < backupFiles.length; i++) {
        if (fs.existsSync(backupFiles[i])) {
            if (fs.lstatSync(backupFiles[i]).isFile()) {
                zip.addLocalFile(backupFiles[i]);
            } else {
                const files = fs.readdirSync(backupFiles[i]);
                for (let j = 0; j < files.length; j++) {
                    const file = files[j];
                    zip.addLocalFile(path.join(backupFiles[i], file), path.basename(backupFiles[i]));
                }
            }
        }
    }
    zip.writeZip(paths.backup);

    console.log('[Updater] Updating repo');
    fs.writeFileSync(paths.comuni, JSON.stringify(comuniSorted));
    fs.writeFileSync(paths.province, JSON.stringify(provinceSorted));
    fs.writeFileSync(paths.regioni, JSON.stringify(regioniSorted));
    regioni.forEach(regione => {
        fs.writeFileSync(paths.regione.replace('%s', regione), JSON.stringify(comuni.filter((c) => c.regione == regione)));
    });

    await bot.sendFile(
        paths.backup,
        `✔ *Aggiornamento database completato con successo*\n` +
        `Trovati ${comuni.length} comuni`
    );
    console.log(`[Updater] Update complete, found ${comuni.length} comuni`);
    //#endregion

    process.exit();
})();