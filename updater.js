const axios = require('axios');
const fs = require('fs');
const query = `https://query.wikidata.org/sparql?format=json&query=SELECT%20DISTINCT%20%3Fitem%20(SAMPLE(%3FitemLabel)%20AS%20%3FitemLabel)%20(SAMPLE(%3Fistat)%20AS%20%3Fistat)%0A%20%20(SAMPLE(%3Fcodice_catastale)%20AS%20%3Fcodice_catastale)%20(SAMPLE(%3Fcap)%20AS%20%3Fcap)%20%0A%20%20(SAMPLE(%3Fprovincia)%20as%20%3Fprovincia)%20(SAMPLE(%3FprovinciaLabel)%20as%20%3FprovinciaLabel)%20(SAMPLE(%3FregioneLabel)%20as%20%3FregioneLabel)%0A%20%20(SAMPLE(%3Fcoordinate)%20as%20%3Fcoordinate)%0AWHERE%20%7B%0A%20%20%3Fitem%20wdt%3AP31%20wd%3AQ747074.%0A%20%20FILTER(NOT%20EXISTS%20%7B%20%3Fitem%20wdt%3AP31%20wd%3AQ3685476.%20%7D)%0A%20%20FILTER(NOT%20EXISTS%20%7B%20%3Fitem%20wdt%3AP31%20wd%3AQ1134686.%20%7D)%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP635%20%3Fistat.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP131%20%3Fprovincia.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fprovincia%20wdt%3AP131%20%3Fregione.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP806%20%3Fcodice_catastale.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP281%20%3Fcap.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP625%20%3Fcoordinate.%20%7D%0A%20%20%0A%20%20%23%20FILTER(NOT%20EXISTS%20%7B%20%3Fprovincia%20wdt%3AP31%20wd%3AQ15110.%20%7D)%0A%20%20SERVICE%20wikibase%3Alabel%20%7B%20%0A%20%20%20%20bd%3AserviceParam%20wikibase%3Alanguage%20%22it%22.%20%0A%20%20%20%20%3Fitem%20rdfs%3Alabel%20%3FitemLabel.%0A%20%20%20%20%3Fprovincia%20rdfs%3Alabel%20%3FprovinciaLabel.%20%0A%20%20%20%20%3Fregione%20rdfs%3Alabel%20%3FregioneLabel.%20%0A%20%20%7D%0A%7D%20GROUP%20BY%20%3Fitem`;

console.log('========================');
console.log('== Comuni-ITA Updater ==');
console.log('========================');

// var sqlite3 = require('sqlite3').verbose();
// var db = new sqlite3.Database('./comuni.db');
// db.all("SELECT nome FROM comuni", function(err, row) {
//     console.log(JSON.stringify(row));
// });
// db.close();

writeCsv();
function writeCsv() {
    var comuni = JSON.parse(fs.readFileSync(`./comuni.json`, 'utf8'));
    var csv = '';
    comuni.forEach((comune, i) => {
        csv += i + ",";
        csv += comune.nome + ",";
        csv += comune.codice + ",";
        csv += comune.provincia + ",";
        csv += comune.codiceCatastale + ",";
        csv += comune.cap + ",";
        csv += comune.coordinate.lat + ",";
        csv += comune.coordinate.lng;
        if (i!=comuni.length-1) csv += `\r\n`;
    });
    console.log(csv);
    fs.writeFileSync(`./comuni.csv`, csv);
}
function update() {
    console.log('\n? Richiesta Wikidata inviata...');
    axios.get(query)
        .then((response) => {
            const comuni = response.data.results.bindings;
            
            console.log('? Richiesta avvenuta con successo!\n');
            console.log(`Comuni trovati => ${comuni.length}`);
    
            var province = [], comuniNoProvincia = [];
            comuni.forEach(com => {
                var comune = bindComune(com);
                console.log(`${comune.item}\t\t${comune.provincia}`);
            });
        })
        .catch((error) => {
            console.log('X Richiesta avvenuta con errore.\n');
            console.log(error);
        });
    
    function bindComune(comune) {
        return {
            item: comune.item ? comune.item.value : null,
            nome: comune.itemLabel ? comune.itemLabel.value : null,
            codice: comune.istat ? comune.istat.value : null,
            regione: comune.regioneLabel ? comune.regioneLabel.value : null,
            provincia: comune.provinciaLabel ? bindProvincia(comune.provinciaLabel.value) : null,
            codiceCatastale: comune.codice_catastale ? comune.codice_catastale.value : null,
            cap: comune.cap ? comune.cap.value : null,
            coordinate: bindCoordinate(comune.coordinate),
        }
    }
    function bindProvincia(provincia) {
        var regex = /(provincia (di|dell.|del|autonoma di)|citt. metropolitana di|libero consorzio comunale di|ente di decentramento regionale di ) ?(?<citta>.+)/gm;
        var match = regex.exec(provincia);
        return match ? match.groups.citta.toLowerCase() : null;
    }
    function bindCoordinate(coords) {
        if (coords) {
            coords = coords.value;
            var space = coords.indexOf(' ');
            return {
                lat: coords.substring(6, space),
                lng: coords.substring(space+1, coords.length-1)
            }
        }
        return { lat: null, lng: null };
    }
}
