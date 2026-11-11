# TaxiGo – internetinė taksi užsakymų sistema

TaxiGo – kuriama internetinė taksi užsakymų sistema, skirta patogiai įvesti kelionės maršrutą ir pateikti užsakymą kuo greičiau arba pasirinktu laiku. Projekto tikslas – sukurti paprastą, telefonui pritaikytą būdą užsisakyti kelionę ir matyti savo užsakymus vienoje vietoje.

Šiuo metu įgyvendinta demonstracinė naudotojo sąsaja. Tikras taksi nėra iškviečiamas.

## Naudojamos technologijos

- **React** – sąsajos komponentai ir būsenos valdymas.
- **Vite** – vietinė kūrimo aplinka ir projekto surinkimas.
- **CSS** – tamsiai mėlynas dizainas su geltonais akcentais ir prisitaikantis išdėstymas.
- **GitHub** – projekto kodo saugykla ir versijų istorija.

## Jau įgyvendintos funkcijos

- Trys demonstraciniai ekranai: **Prisijungimas**, **Kelionės** ir **Užsakymas**, su navigacija tarp jų.
- Prisijungimo formos demonstracija su el. pašto ir minimalaus slaptažodžio ilgio patikra bei galimybe išbandyti sistemą be prisijungimo. Tikras naudotojų autentifikavimas dar neįgyvendintas.
- Redaguojami paėmimo vietos ir kelionės tikslo laukeliai. Adresai įvedami rankiniu būdu; tikrinama, kad jie nebūtų tušti ar sudaryti vien iš tarpų. Adresų egzistavimas netikrinamas.
- Išvykimo pasirinkimai **Kuo greičiau** ir **Pasirinktu laiku**.
- Atskiri datos ir laiko laukeliai su kalendoriaus bei laikrodžio piktogramomis. Laikui taikomas 5 minučių intervalas, o prieš kuriant užsakymą atmetamas netinkamas intervalas ar praėjęs laikas.
- Telefono laukelis su fiksuotu **+370** prefiksu ir 8 skaitmenų įvedimu. Apdorojamas viso numerio įklijavimas, šalinami formatavimo simboliai ir pasikartojantys šalies kodai. Prieš kuriant užsakymą tikrinamas formatas **+370XXXXXXXX**. Numerio egzistavimas netikrinamas.
- Telefono laukeliui nustatyta skaitmeninės klaviatūros nuostata mobiliuosiuose įrenginiuose.
- Automobilio tipo pasirinkimas: **Standartinis** arba **Komfortas**, su pavyzdiniais kainų intervalais.
- Demonstracinio užsakymo sukūrimas. Jame išsaugomi abu adresai, visas telefono numeris, pasirinkta data ir laikas, pavyzdinis kainos intervalas bei būsena.
- Kelionių sąrašas su pavyzdinėmis praėjusiomis kelionėmis ir naujausiu sukurtu demo užsakymu. Rodomi adresai, data, laikas, kaina ir būsena.
- Kelionių filtrai: **Visos**, **Būsimos** ir **Praėjusios**.
- Telefonams pritaikytas išdėstymas, apvalūs laukeliai, matomi fokusavimo kontūrai ir nuoroda pereiti prie pagrindinio turinio. Mažuose ekranuose datos ir laiko laukeliai išdėstomi vienas po kitu.

## Planuojamos funkcijos

- **Supabase Auth** – tikras naudotojų prisijungimas ir paskyrų valdymas.
- **Duomenų bazė** – ilgalaikis užsakymų ir naudotojų duomenų saugojimas.
- **Zapier** – pranešimai apie skubius užsakymus.
- **Vercel** – projekto publikavimas internete.
- **Geoapify API** – tikrų adresų pasiūlymai rašant.

Šios integracijos kol kas neprijungtos.

## Projekto paleidimas

Reikalingi **Node.js** ir **npm**. Projekte naudojamai Vite versijai tinka Node.js **20.19.x ar naujesnė 20.x versija**, arba **22.12.0 ir naujesnė versija**.

Atidarykite terminalą projekto kataloge ir įdiekite priklausomybes:

```bash
npm ci
```

Paleiskite vietinę kūrimo aplinką:

```bash
npm run dev
```

Naršyklėje atidarykite terminale Vite parodytą vietinį adresą.

Papildomos komandos:

- `npm run build` – sukuria publikavimui skirtus failus kataloge `dist/`.
- `npm run preview` – leidžia vietiškai peržiūrėti jau surinktą projektą; prieš tai paleiskite `npm run build`.
- `npm run lint` – paleidžia ESLint kodo patikrą.

Dabartinei demonstracijai Supabase, Zapier ar Geoapify raktų ir aplinkos kintamųjų nereikia.

## Dabartinė projekto būsena

Projektas yra **demonstracinės sąsajos kūrimo etape**. Veikia vietinis formų pildymas, validacija ir demo užsakymo rodymas kelionių sąraše. Kainos ir pradinės kelionės yra pavyzdinės; nėra realaus vairuotojo paskyrimo ar kelionės vykdymo stebėjimo.

Duomenys laikomi tik React būsenoje naršyklės atmintyje. Išsaugomas vienas naujausias demo užsakymas: naujas užsakymas pakeičia ankstesnį, o perkrovus puslapį jis prarandamas. Telefono numeris laikomas užsakymo duomenyse, bet kelionių kortelėje nerodomas.

Prisijungimo forma paskyros nesukuria ir kredencialų serveriui nesiunčia. Tikras autentifikavimas, ilgalaikis duomenų saugojimas ir išoriniai pranešimai numatyti tolesniuose etapuose. Demonstracijai naudokite išgalvotus duomenis.

## Autorė

**Laima Striškienė**
