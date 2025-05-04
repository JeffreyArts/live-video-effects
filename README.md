# Live video effects

Dit project maakt het mogelijk om real-time video-effecten toe te passen op webcam-beelden met behulp van moderne webtechnologieën.

## Technische werking

De applicatie werkt door de webcam stream op te delen in een grid van cellen. Elke cel wordt geanalyseerd op basis van de gemiddelde grijswaarde van de pixels binnen die cel. Deze grijswaarde wordt vervolgens omgezet naar een waarde tussen 0 (zwart) en 1 (wit).

Deze waarden kunnen vervolgens gebruikt worden om verschillende soorten effecten te genereren:
- Afbeeldingen te tonen
- Vormen tekenen (vierkanten, cirkels)
- Tekst weergeven

De effecten worden gedefinieerd in JSON-bestanden, waarbij je kunt specificeren welk effect er moet verschijnen bij bepaalde grijswaarden of combinaties van grijswaarden van aangrenzende cellen.

Daarnaast maakt de applicatie gebruik van MediaPipe's Pose Detection model om lichaamsdelen te detecteren in de video stream. Dit model kan verschillende lichaamsdelen identificeren en veranderd de video stream in een soort van zwart-wit beeld met een stick-figure.

## Installatie

Om het project op te zetten, volg deze stappen:

1. Clone de repository:
```bash
git clone git@github.com:JeffreyArts/live-video-effects.git
cd live-video-effects
```

2. Installeer de dependencies:
```bash
npm install
```

Wanneer dit gedaan is, kun je het project starten met `npm run dev`. Zie het volgende stukje om 

## Ontwikkeling

Om het project lokaal te ontwikkelen en custom video-effecten te maken:

### Start de development server:
```bash
npm run dev
```

### Bekijk het project
Open je browser en ga naar `http://localhost:5173` (of een andere url die in de terminal gegeven wordt na npm run dev)
**Tip!**
Plaats `?dev` in de url om wat meer informatie te krijgen over hoe het achter de schermen werkt.

### Voeg nieuwe effecten toe
Om nu nieuwe effecten toe te voegen, kun je een nieuw json bestand aanmaken in de `src/video-effects` map. Deze wordt automatisch geladen in de dropdown voor video-effecten. De JSON die je invoert kan de volgende waarden bevatten:

- **name**: [*string*] Naam van het effect
- **type**: [*string*] Het type effect, dit kunnen de volgende opties zijn:
    - *image*, hiermee kun je afbeelding url's toevoegen (plaats je afbeeldingen in de public map)
    - *rectangle*, dit tekent een vierkantje waar je de kleur & formaat van kunt bepalen
    - *dot*, dit tekent een cirkel waar je de kleur & formaat van kunt bepalen
    - *text*, hiermee kun je cijfers, letters, emoji's en andere karakters mee tekenen.
- **valueRange**: [*number*] Hiermee geef je een nummer op, om de cell waardes op af te ronden. Een valueRange van 2 levert bijvoorbeeld alleen 0 of 1 op, een valueRange van 3 levert 0, 0.5 of 1 op, een valueRange van 4 levert 0, 0.334~, 0.667~ of 1 op, enz. Wanneer je geen valueRange opgeeft, dan kan de waarde 0 t/m 1 zijn, en alles er tussenin.
- **defaultColor**: [*string*] Hiermee kun je de basiskleur instellen. Zodat wanneer je cijfers gebruikt bij de waardes in de values array om de sizing te bepalen, je wel nog een kleur kunt bepalen.
- **values**: [*array*] Een lijst met objecten, waarmee je kunt bepalen wat er moet gebeuren met een specifieke grijswaarde(-range) van de cel.
    - *min*: [*number*] De minimale grijswaarde waarop dit effect moet verschijnen
    - *max*: [*number*] De maximale grijswaarde waarop dit effect moet verschijnen
    - *if*: [*string*] Een conditionele expressie die kan verwijzen naar aangrenzende cellen (werkt momenteel alleen wanneer type, image is)
        - `c`: huidige cel
        - `t`: cel boven
        - `b`: cel onder
        - `l`: cel links
        - `r`: cel rechts
        - `tl`: cel linksboven
        - `tr`: cel rechtsboven
        - `bl`: cel linksonder
        - `br`: cel rechtsonder
    - *val*: [*string*] De waarde die getoond moet worden:
        - Bij `type: "image"`: een URL naar een afbeelding
        - Bij `type: "rectangle"`: een kleur in hex formaat (bijv. "#FF0000")
        - Bij `type: "dot"`: een kleur in hex formaat
        - Bij `type: "text"`: een teken of emoji
    - *size*: [*number*] (optioneel) De grootte van het effect als percentage van de cel (0-1), 1=100%, 0=%, mag ook hoger dan 1 zijn.

De if statement van het values object kan nogal overweldigend overkomen, maar het is in principe gewoon een if-statement in string formaat;
```
{"if": "tl==1 && tr==1 && bl==1 && br==1 && c==1", "val": "/video-effects/<naam-effect>/afbeelding.png"}
```
[image table of if statement variables ](https://raw.githubusercontent.com/JeffreyArts/live-video-effects/refs/heads/main/public/ja-crisp.svg)

## Deployment

In deze repo zit ook een script om het project in 1 keer te deployen via SSH. Hiervoor moet je eerst een bestand aanmaken met informatie over waar het project ge-deployed moet worden. Daarna kun je het iedere keer met 1 commando deployen naar de server.

### Configuratie bestand aanmaken
Maak een `.env.staging` bestand aan in de root van het project met de volgende variabelen:
```
DEPLOYMENT_USER=<gebruikersnaam>
DEPLOYMENT_HOST=<hostnaam>
DEPLOYMENT_PATH=/var/www/<projectnaam> // Of een ander pathnaam
MAX_BACKUPS=5
```
   - Vervang `<gebruikersnaam>` met de SSH gebruikersnaam voor de server
   - Vervang `<hostnaam>` met de hostnaam of IP-adres van de server
   - Vervang `<projectnaam>` met de naam van je project


### Deployen
Voer nu deployment script uit met het volgende commando in de terminal:
```bash
npm run deploy
```

Dit zal het project bouwen en deployen naar de staging omgeving.

Voor meer gedetailleerde informatie over de deployment setup, zie de [Vite website setup wiki](https://github.com/JeffreyArts/server/wiki/Vite-website-setup).