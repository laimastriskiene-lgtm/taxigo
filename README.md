# TaxiGo – internetinė taksi užsakymų sistema

TaxiGo – kuriama internetinė taksi užsakymų sistema, skirta patogiai įvesti kelionės maršrutą ir pateikti užsakymą kuo greičiau arba pasirinktu laiku. Projekto tikslas – sukurti paprastą, telefonui pritaikytą būdą užsisakyti kelionę ir matyti savo užsakymus vienoje vietoje.

Supabase autentifikacija ir keleivio profilio saugojimas jau įgyvendinti kode. Kelionės ir užsakymų kūrimas tebėra demonstraciniai: tikras taksi nėra iškviečiamas.

## Naudojamos technologijos

- **React** – sąsajos komponentai ir būsenos valdymas.
- **Vite** – vietinė kūrimo aplinka ir projekto surinkimas.
- **CSS** – tamsiai mėlynas dizainas su geltonais akcentais ir prisitaikantis išdėstymas.
- **Supabase ir @supabase/supabase-js** – autentifikacija ir keleivio profilio saugojimas.
- **React DayPicker** – lietuviškas datos pasirinkimo kalendorius.
- **GitHub** – projekto kodo saugykla ir versijų istorija.

## Jau įgyvendintos funkcijos

### Supabase autentifikacija ir keleivio profilis

- Registracija su vardu, el. paštu ir slaptažodžiu per `supabase.auth.signUp()`.
- Prisijungimas per `signInWithPassword()` ir atsijungimas per `signOut()`. Prisijungimo duomenys siunčiami į Supabase Auth.
- Pradinės sesijos atkūrimas per `getSession()` ir prisijungimo, atsijungimo bei kitų sesijos pokyčių stebėjimas per `onAuthStateChange()`. Sesijos saugojimą ir atnaujinimą tvarko Supabase klientas pagal numatytuosius naršyklės nustatymus.
- Keleivio profilio kūrimas `passengers` lentelėje su prisijungusio vartotojo `user_id` ir vardu. Registracijos metu profilis kuriamas gavus aktyvią sesiją.
- Profilio nuskaitymas prisijungus, lietuviški klaidų pranešimai ir galimybė pakartoti profilio išsaugojimą nekuriant naujos paskyros bei neperrašant esamo profilio. Jei profilio trūksta, galima įvesti vardą ir jį užbaigti.
- Vardo, el. pašto ir slaptažodžio įvedimo patikra. Registracijos slaptažodis turi būti bent 6 simbolių; Supabase gali taikyti papildomus reikalavimus.
- Galimybė išbandyti demonstracines keliones ir užsakymo formą be prisijungimo.

Šios funkcijos patvirtintos kodo peržiūra. README atnaujinimo metu tikros Supabase užklausos, sesijos išlikimas naršyklėje ir serverio RLS taisyklės nebuvo pakartotinai testuojami.

### Užsakymo forma ir navigacija

- Trys ekranai: **Prisijungimas**, **Kelionės** ir **Užsakymas**, su navigacija tarp jų.
- Penki užsakymo formos žingsniai: **01 Tavo maršrutas**, **02 Išvykimo laikas**, **03 Telefono numeris**, **04 Keliauk patogiai**, **05 Kelionės informacija**.
- Redaguojami paėmimo vietos ir kelionės tikslo laukeliai. Adresai įvedami rankiniu būdu; tikrinama, kad jie nebūtų tušti ar sudaryti vien iš tarpų. Adresų egzistavimas netikrinamas.
- Išvykimo pasirinkimai **Kuo greičiau** ir **Pasirinktu laiku**.
- Lietuviškas React DayPicker kalendorius, datos rodymas **DD.MM.YYYY** ir laiko pasirinkimas **HH:mm** formatu be AM/PM, kas 5 minutes. Praėjusios datos nepasirenkamos, o pateikiant formą papildomai tikrinama, kad išvykimo laikas būtų ateityje. Užsakymo duomenyse data saugoma kaip `YYYY-MM-DD`, laikas – kaip `HH:mm`.
- Telefono laukelis su fiksuotu **+370** prefiksu ir 8 skaitmenų įvedimu. Apdorojamas viso numerio įklijavimas, šalinami formatavimo simboliai ir pasikartojantys šalies kodai. Prieš kuriant užsakymą tikrinamas formatas **+370XXXXXXXX**. Numerio egzistavimas netikrinamas.
- Telefono laukeliui nustatyta skaitmeninės klaviatūros nuostata mobiliuosiuose įrenginiuose.
- Automobilio tipo pasirinkimas: **Standartinis** arba **Komfortas**.
- Kelionių filtrai: **Visos**, **Būsimos** ir **Praėjusios**.
- Telefonams pritaikytas išdėstymas, matomi fokusavimo kontūrai ir nuoroda pereiti prie pagrindinio turinio. Telefone užsakymo kortelės išdėstomos viena po kitos, kompiuteryje – greta.

## Demonstracinės funkcijos ir ribojimai

- Užsakymo sukūrimas veikia tik naršyklėje. `book()` išsaugo adresus, telefono numerį, automobilio tipą atitinkantį kainos intervalą, išvykimo datą bei laiką ir būseną React būsenoje; į Supabase `rides` lentelę užsakymas nesiunčiamas.
- Išsaugomas vienas naujausias demo užsakymas: naujas pakeičia ankstesnį, o perkrovus puslapį jis prarandamas. Telefono numeris užsakymo duomenyse yra, tačiau kelionių kortelėje nerodomas.
- Pradinės praėjusios kelionės yra pavyzdinės. Jos ir demo užsakymas nesudaro prisijungusio vartotojo ilgalaikės kelionių istorijos.
- Kainos **9–12 €** ir **13–16 €** yra pavyzdinės ir priklauso tik nuo pasirinkto automobilio tipo, o ne nuo tikro maršruto.
- Atstumui ir kelionės trukmei rodoma **Bus apskaičiuota**. Maršrutas, kilometrai ir trukmė dar neskaičiuojami.
- Nėra tikro taksi iškvietimo, vairuotojo paskyrimo ar kelionės vykdymo stebėjimo. Demonstraciniams adresams ir telefono numeriui naudokite išgalvotus duomenis.

## Planuojamos funkcijos

- Užsakymų saugojimas Supabase `rides` lentelėje ir asmeninė kelionių istorija.
- **Geoapify API** – tikrų adresų pasiūlymai rašant ir maršruto duomenų integracija.
- Tikro maršruto atstumo, kelionės trukmės ir nuo maršruto priklausančios kainos skaičiavimas.
- **Zapier** – pranešimai apie skubius užsakymus.
- **Vercel** – numatyta publikavimo platforma. Faktinė publikavimo būsena šio README kodo peržiūros metu nepatikrinta.

Supabase Auth ir keleivio profilio integracija jau yra kode; aukščiau išvardytos užsakymų bei maršruto integracijos dar neįgyvendintos.

## Projekto paleidimas

Reikalingi **Node.js** ir **npm**. Projekte naudojamai Vite versijai tinka Node.js **20.19.x ar naujesnė 20.x versija**, arba **22.12.0 ir naujesnė versija**.

Atidarykite terminalą projekto kataloge ir įdiekite priklausomybes:

```bash
npm ci
```

Projekto šaknyje sukurkite `.env.local` ir įrašykite savo Supabase projekto nustatymus. Toliau pateikti tik vietaženkliai, kuriuos reikia pakeisti tikromis savo projekto reikšmėmis:

```dotenv
VITE_SUPABASE_URL=https://JUSU_PROJEKTAS.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=JUSU_VIESAS_SUPABASE_RAKTAS
```

- `VITE_SUPABASE_URL` – Supabase projekto URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY` – viešas Supabase projekto publishable raktas.
- Abu kintamieji būtini net atidarant demonstracinę sąsają: jei kurio nors trūksta, `src/lib/supabase.js` išmeta klaidą.
- `VITE_` reikšmės pasiekiamos naršyklėje. Nenaudokite `service_role`, slapto API rakto ar slaptažodžio. Duomenų prieigą turi riboti Supabase RLS taisyklės.
- `.env.local` turi likti ignoruojamas Git ir negali būti keliamas į saugyklą. Po nustatymų pakeitimo paleiskite kūrimo serverį iš naujo.
- Zapier ir Geoapify raktų dabartiniam kodui nereikia.

### Supabase paruošimo prielaidos

Reikalingas Supabase projektas su el. pašto ir slaptažodžio autentifikacija. Testavimo aplinkoje, pagal projekto savininkės pateiktą informaciją, el. pašto patvirtinimas išjungtas. Šis nustatymas saugyklos kode nekonfigūruojamas. Jei patvirtinimas įjungtas ir po registracijos sesijos nėra, programa parodo pranešimą; keleivio profilį galima užbaigti prisijungus.

Pagal pateiktą duomenų bazės aprašą `public.passengers` lentelėje turi būti:

- `id` – automatiškai generuojamas UUID pirminis raktas.
- `user_id` – privalomas unikalus UUID, susietas su `auth.users(id)`, su `ON DELETE CASCADE`.
- `name` – privalomas TEXT.
- `created_at` – automatiškai nustatomas TIMESTAMPTZ.

RLS turi būti įjungtas: SELECT ir INSERT leidžiami tik kai `user_id = auth.uid()`; UPDATE ta pati sąlyga taikoma ir USING, ir WITH CHECK. Tai pateiktos serverio konfigūracijos prielaidos, o ne šio README atnaujinimo metu patikrintos taisyklės. `rides` lentelė dabartinėje užsakymo formoje dar nenaudojama.

Paleiskite vietinę kūrimo aplinką:

```bash
npm run dev
```

Naršyklėje atidarykite terminale Vite parodytą vietinį adresą.

Papildomos komandos:

- `npm run build` – sukuria publikavimui skirtus failus kataloge `dist/`.
- `npm run preview` – leidžia vietiškai peržiūrėti jau surinktą projektą; prieš tai paleiskite `npm run build`.
- `npm run lint` – paleidžia ESLint kodo patikrą.

## Dabartinė projekto būsena

Projektas turi įgyvendintą Supabase autentifikaciją ir keleivio profilio integraciją bei demonstracinę kelionių sąsają. Auth paskyros ir keleivio profilis saugomi Supabase; sesijos saugojimą naršyklėje tvarko Supabase klientas. Demo užsakymas laikomas tik React būsenoje ir po puslapio perkrovimo neišlieka.

Prisijungimas nepaverčia demo užsakymo tikru taksi iškvietimu. Ilgalaikis kelionių saugojimas, tikra kainodara ir išoriniai pranešimai numatyti tolesniuose etapuose.

## Autorė

**Laima Striškienė**
