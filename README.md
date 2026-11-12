# TaxiGo – mokomoji kelionių užsakymų sistema

TaxiGo leidžia keleiviui prisiregistruoti, pasirinkti Lietuvos adresus, apskaičiuoti preliminarų automobilio maršrutą, pateikti užsakymą ir peržiūrėti savo keliones. Sąsaja lietuviška, pritaikyta telefonams ir kompiuteriams.

**TaxiGo yra mokomasis projektas – tikros taksi paslaugos neteikiamos.** Prisijungusio keleivio užsakymai išsaugomi Supabase, tačiau tai nėra tikras vairuotojo iškvietimas.

## 1. Tikslas ir apimtis (Scope)

Tikslas – įgyvendinti visą mokomojo užsakymo kelią: paskyra → adresai → preliminarus įvertis → išsaugojimas → asmeninė istorija.

Įgyvendinta: Supabase Auth, keleivio profilis, užsakymų saugojimas, istorijos filtrai, Lietuvos adresų pasiūlymai, maršruto ir kainos skaičiavimas, klaidų pranešimai bei neišsiųsto užsakymo juodraštis.

Už apimties ribų: realus taksi iškvietimas, vairuotojų paskyrimas, mokėjimai ir kelionės stebėjimas realiu laiku. Užsakymų istorijos grafikas dar neįgyvendintas.

## 2. Technologijos ir projekto struktūra

- React 19 ir Vite 8 – komponentai, būsenos valdymas ir surinkimas.
- CSS – tamsus dizainas, geltoni aktyvūs mygtukai ir prisitaikantis išdėstymas.
- Supabase – Auth, `passengers` ir `rides` duomenys.
- Geoapify – adresų paieška, geokodavimas ir Routing API.
- React DayPicker – lietuviškas datos pasirinkimas.
- Node.js test runner ir ESLint – automatinės patikros.

```text
src/
  App.jsx                         ekranai ir užsakymo forma
  App.css, index.css              dizainas ir prisitaikymas
  components/AuthForm.jsx         prisijungimas ir registracija
  components/AddressAutocomplete.jsx  adresų pasiūlymų sąsaja
  hooks/useAuth.js                sesija ir keleivio profilis
  hooks/useRides.js               istorija, išsaugojimas ir juodraštis
  hooks/useAddressAutocomplete.js adresų užklausų valdymas
  hooks/useRideEstimate.js        maršruto skaičiavimo būsenos
  lib/supabase.js                 Supabase klientas
  lib/geoapify.js                 adresų ir maršruto API
  lib/addressValidation.js        adresų tikslumo validacija
  lib/rideEstimate.js             formulė ir rezultatų formatavimas
tests/                           automatiniai testai
public/                          viešieji statiniai failai
```

## 3. Vietinis paleidimas

Reikalingi Node.js ir npm. Tikslūs įdiegtos Vite versijos Node.js reikalavimai nurodyti `node_modules/vite/package.json` lauke `engines`; naudokite juos atitinkančią palaikomą Node.js versiją.

```bash
npm ci
```

Projekto šaknyje vietiškai sukurkite `.env.local`. Pavyzdyje pateikti tik vietaženkliai:

```dotenv
VITE_SUPABASE_URL=https://JUSU_PROJEKTAS.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=JUSU_VIESAS_SUPABASE_RAKTAS
VITE_GEOAPIFY_API_KEY=JUSU_GEOAPIFY_RAKTAS
```

- `VITE_SUPABASE_URL` – Supabase projekto adresas.
- `VITE_SUPABASE_PUBLISHABLE_KEY` – viešas Supabase publishable raktas. Abu Supabase kintamieji būtini programai paleisti.
- `VITE_GEOAPIFY_API_KEY` – Geoapify adresų ir maršruto užklausoms. Jei jo nėra arba API neveikia, rodoma klaida; leidžiama įvesti adresą rankiniu būdu ir pateikti užsakymą be apskaičiuoto įverčio.
- `VITE_` kintamieji patenka į naršyklės kodą. Čia negalima naudoti Supabase `service_role`, slaptažodžių ar serverio paslapčių. Geoapify raktui paskyroje pritaikykite naudojimo apribojimus pagal projekto aplinkas.
- `.env.local` ignoruojamas Git. Tikrų reikšmių nedėkite į README, commit ar ekrano nuotraukas. Pakeitus vietinius nustatymus, paleiskite Vite iš naujo.
- Zapier Webhook paslaptys neturi būti dedamos į `VITE_` kintamuosius.

```bash
npm run dev
```

Atidarykite terminale parodytą vietinį adresą.

```bash
npm run build
npm run preview
```

`build` sukuria `dist/`; `preview` leidžia vietiškai patikrinti surinktą programą.

## 4. Ekranai, būsenos ir forma

Trys ekranai: **Prisijungimas**, **Kelionės**, **Užsakymas**. Telefonuose naudojama apatinė navigacija.

Keturių būsenų pavyzdžiai:

- **Loading:** tikrinama sesija, kraunama istorija, skaičiuojamas maršrutas arba saugomas užsakymas.
- **Error:** neteisingas prisijungimas, nepasiekiama istorija, netikslus adresas, API ar išsaugojimo klaida.
- **Empty:** keleivis dar neturi kelionių arba pasirinktas filtras neturi rezultatų.
- **Success:** užsakymas patvirtintas, pateikiama nuoroda peržiūrėti kelionę.

Forma išlaiko penkis žingsnius: maršrutas, išvykimo laikas, telefonas, automobilio tipas ir kelionės informacija. Galima rinktis „Kuo greičiau“ arba būsimą datą bei laiką kas 5 minutes. Telefonas tikrinamas pagal `+370XXXXXXXX` formatą, automobilio tipas – `standard` arba `comfort`.

Naujas užsakymas atidaromas tuščia forma. Sėkmingai išsaugojus forma išvaloma. Kelionių istorijoje yra filtrai „Visos“, „Būsimos“, „Praėjusios“.

## 5. Supabase Auth ir duomenys

Registraciją, prisijungimą, atsijungimą bei sesijos atkūrimą valdo Supabase Auth. Slaptažodžiai į `passengers`, `rides` ar kelionės juodraštį nerašomi. Jei po registracijos reikia el. pašto patvirtinimo, programa apie tai praneša; profilį galima užbaigti prisijungus.

`passengers` profilis naudojamas su laukais `id`, `user_id`, `name`, `created_at`. `user_id` turi būti unikalus ir susietas su `auth.users(id)`.

Užsakymui naudojami `public.rides` laukai:

- `id` – UUID pirminis raktas; kliento sukurtas UUID išlieka tas pats pakartotiniams bandymams.
- `user_id`, `passenger_id` – prisijungęs vartotojas ir jam priklausantis keleivio profilis.
- `pickup_address`, `destination`, `phone` – maršruto ir kontakto duomenys.
- `pickup_time` – neprivalomas `timestamptz`; „Kuo greičiau“ atveju `NULL`.
- `priority` – `normal` arba `high`, numatytoji `normal`.
- `status` – `requested`, `in_progress`, `done`, `cancelled`; naujam užsakymui `requested`.
- `car_type` – `standard` arba `comfort`, numatytoji `standard`.
- `distance_km NUMERIC(10,2)`, `duration_min INTEGER`, `estimated_price NUMERIC(10,2)` – neprivalomas maršruto įvertis.
- `created_at` – sukūrimo laikas.

Struktūra aprašyta pagal programos kodą ir savininkės pateiktą DB patvirtinimą. Saugykloje SQL migracijų nėra; README nėra automatinė DB diegimo migracija. Esamų užsakymų `NULL` įverčiai palaikomi ir nerodomi kaip nulinė kaina.

## 6. RLS ir vartotojų duomenų atskyrimas

Kode profilis skaitomas pagal prisijungusio vartotojo `user_id`, o kelionės – pagal jo `user_id` ir `passenger_id`. Kuriant užsakymą abu identifikatoriai imami iš aktyvios sesijos ir profilio. Keičiantis paskyrai sąsajos būsena sukuriama iš naujo.

**Serverio apsauga turi būti užtikrinta RLS, o ne vien kliento filtrais.** RLS privalo likti įjungtas abiem lentelėms. Politikos turi riboti prieigą pagal `auth.uid()`; `rides` INSERT taip pat turi tikrinti, kad nurodytas `passenger_id` priklauso tam pačiam vartotojui. Authenticated rolei reikalingos atitinkamos SELECT ir INSERT teisės.

Savininkė anksčiau patvirtino `rides` SELECT / INSERT teises ir RLS politikas. Faktinės politikų sąlygos, DB ryšiai bei atmetimas su svetimu `passenger_id` šiame dokumentavimo etape tiesiogiai nepatikrinti. Atsiskaitymui reikia dviejų paskyrų izoliacijos testo ir Supabase lentelių, ryšių bei RLS ekrano nuotraukų.

## 7. Lietuvos adresai, maršrutas ir preliminari kaina

Abiejuose adresų laukuose veikia Geoapify pasiūlymai su `filter=countrycode:lt`. Rodomi turimi gatvės, namo numerio ir vietovės duomenys. Leidžiamas rankinis įvedimas.

Vien miesto nepakanka. Gatvei reikia namo numerio ir vietovės; konkreti įvardyta vieta, pavyzdžiui, autobusų stotis su vietove, gali būti priimama be namo numerio. Tikrinamas pasirinkto pasiūlymo tipas ir duomenys, ne vien skaičiaus buvimas tekste.

Maršrutas skaičiuojamas Geoapify Routing API su `mode=drive`. Rankinis adresas pirmiausia geokoduojamas su Lietuvos filtru; neaiškus ar netikslus rezultatas nenaudojamas kaip patvirtinta vieta.

```text
atstumas km = atstumas metrais / 1000 (rodoma 2 skaitmenimis po kablelio)
trukmė min. = sekundės / 60 (apvalinama į didesnę sveiką minutę)
kaina = 3 € + 1 € × atstumas km (apvalinama iki centų)
```

Kaina skaičiuojama iš pradinio atstumo metrais, prieš rodymo apvalinimą. Abiem automobilio tipams taikoma ta pati formulė. Rezultatai rodomi formoje, išsaugomi Supabase ir pateikiami istorijoje.

Naudojamas užklausų uždelsimas (debounce), atšaukimas ir apsauga nuo pasenusių atsakymų. Pakeitus adresą ankstesnis įvertis nebelaikomas dabartiniu. Jei API ar maršrutas nepasiekiamas, rodoma klaida ir galima tęsti su `NULL` įverčiu – išgalvota kaina nerodoma.

Kaina yra mokomasis kliento apskaičiuotas įvertis, ne serverio patvirtinta mokėjimo suma.

## 8. Klaidos, juodraštis ir pakartotiniai bandymai

Nepavykus išsaugoti prisijungusio keleivio užsakymo, jo duomenys išlaikomi localStorage su tuo pačiu UUID. Rodomas pranešimas:

> Užsakymo išsiųsti nepavyko. Duomenys išsaugoti. Bandykite dar kartą.

- Juodraštis nėra patvirtintas užsakymas ir į formą atkuriamas tik paspaudus „Atkurti juodraštį“.
- Pakartotinis bandymas naudoja tą patį UUID; užraktas neleidžia lygiagrečiai pateikti antro užsakymo.
- Prieš atkūrimą ir pakartotinį pateikimą tikrinama, ar užsakymas jau išsaugotas Supabase.
- Patvirtinus išsaugojimą, susijęs juodraštis pašalinamas. Jei localStorage neprieinamas, rodoma atskira klaida ir perspėjama neperkrauti puslapio.
- Juodraštyje išlieka ir maršruto įvertis; atkūrus jis perskaičiuojamas. Palaikomi seni juodraščiai be naujų laukų.
- Juodraštyje yra adresai, telefonas ir užsakymo parinktys, tačiau nėra slaptažodžių ar prieigos raktų. Jis atskiriamas pagal vartotojo ID, bet nėra šifruotas ir bendrame įrenginyje gali išlikti atsijungus.

Neprisijungus galima naudoti demonstracinį režimą. Demo užsakymas nėra siunčiamas į Supabase, laikomas React būsenoje ir prarandamas perkrovus puslapį.

## 9. Zapier automatizacija ir jos įrodymai

Užsakymo kode perduodama `priority`: „Kuo greičiau“ → `high`, pasirinktu laiku → `normal`.

React kode tiesioginio Zapier Webhook kvietimo nėra. Grandinė iš Supabase INSERT per DB trigerį / Database Webhook į Zapier, Paths sąlygos ir faktiniai veiksmai turi būti patikrinti išorinėse sistemose. Saugyklos kodas jų veikimo nepatvirtina.

Atsiskaitymui paruošti:

- Supabase trigerio / Webhook konfigūracijos įrodymą, neatskleidžiant paslapčių.
- Po vieną `high` ir `normal` užsakymą su susietu užsakymo ID ir vykdymo laiku.
- Zapier Paths sąlygas bei abiejų šakų rezultatą Zap History.
- Klaidos scenarijų, klaidos aptikimą, pranešimą savininkui ir pakartojimo eigą.
- Automatizacijos savininko vardą, atsakomybę ir dokumentacijos nuorodą.
- Mėnesio Tasks įvertį pagal faktinius mokamus veiksmus kiekvienoje šakoje: numatomi `high` užsakymai × jų Tasks + `normal` užsakymai × jų Tasks, papildomai įvertinant pakartojimus. Tikruosius skaičius pagrįsti Zap naudojimo duomenimis.

Šių išorinių įrodymų ir faktinio Tasks skaičiaus šiame README dar nėra.

## 10. Vercel diegimas ir aplinkos

Projektas surenkamas kaip Vite statinė programa. Vercel nustatymai: priklausomybių diegimas `npm ci`, Build komanda `npm run build`, Output Directory `dist`.

Vercel projekto aplinkoje nustatykite tris 3 skyriuje išvardytus kintamuosius. Patikrinkite, kuriose aplinkose jie galioja, ir po pakeitimų atlikite naują diegimą. Supabase Auth URL nustatymus ir Geoapify leidžiamų svetainių apribojimus suderinkite su faktiniu viešu adresu.

Viešas Vercel URL šiame dokumente dar nepateiktas. Diegimo būsenos negalima patvirtinti vien sėkmingu vietiniu surinkimu. Viešame puslapyje reikia patikrinti registraciją, prisijungimą, adresus, maršrutą, išsaugojimą ir istoriją telefone bei kompiuteryje.

## 11. Automatinės ir rankinės patikros

```bash
npm run lint
npm run build
node --test --test-concurrency=1 tests/*.test.js
```

`npm test` komandos šiuo metu nėra. Testai paleidžiami tiesiogiai Node.js test runner. Nuoseklus vykdymas leidžia išvengti audito metu pasitaikiusios lygiagretaus procesų paleidimo `spawn EPERM` klaidos.

2026-11-12 audite: lint ir build praėjo, 31 iš 31 testo praėjo. Build pateikė įspėjimą apie didesnį nei 500 kB JS paketą; surinkimas sėkmingas.

Testų aprėptis:

- `addressValidation.test.js` – 8 adresų tikslumo testai.
- `geoapifyRouting.test.js` – 7 geokodavimo ir maršruto API testai.
- `rideEstimate.test.js` – 4 formulės, reikšmių ir formatavimo testai.
- `rideFlow.test.js` – 7 išsaugojimo, UUID, atkūrimo ir formos valdymo testai.
- `useRideEstimate.test.js` – 5 debounce, pasenusių atsakymų, klaidų ir atšaukimo testai.

API ir Supabase šiuose testuose imituojami; dalis formos logikos tikrinama be tikro naršyklės DOM. Testai nepatvirtina realių RLS politikų, Zapier ar Vercel veikimo. Savininkė patvirtino ankstesnę sėkmingą maršruto ir išsaugojimo patikrą naršyklėje bei Supabase.

Rankinės patikros prieš atsiskaitymą:

1. Registracija, klaidingas prisijungimas, sesijos atkūrimas ir atsijungimas.
2. Dvi paskyros: svetimos istorijos nuskaitymo ir INSERT su svetimu `passenger_id` atmetimas.
3. Tuščia istorija, filtrai ir seno užsakymo `NULL` įverčiai.
4. Lietuvos miesto, miestelio ir kaimo adresai, namo numeris, rankinis adresas ir konkreti vieta be numerio.
5. Greitas adresų keitimas, maršruto API sutrikimas, perskaičiavimas ir užsakymas be įverčio.
6. Tinklo sutrikimas išsaugant, perkrovimas, aiškus juodraščio atkūrimas, pakartotinis siuntimas ir dvigubas paspaudimas. Patikrinti, kad DB liko vienas įrašas.
7. Nauja tuščia forma po sėkmės; išsaugotas užsakymas nebeatkuriamas kaip juodraštis.
8. `high` ir `normal` Zapier šakos, jų rezultatai ir klaidos apdorojimas.
9. Vieša Vercel aplinka telefone ir kompiuteryje: nėra horizontalaus slinkimo, veikia apatinė navigacija, pasiūlymai ir klaviatūros valdymas.

## 12. GitHub, Notion ir atsiskaitymas

- [GitHub saugykla](https://github.com/laimastriskiene-lgtm/taxigo).
- [PR #1 – užsakymų valdymas ir fallback](https://github.com/laimastriskiene-lgtm/taxigo/pull/1).
- [PR #2 – Lietuvos adresų paieška ir validacija](https://github.com/laimastriskiene-lgtm/taxigo/pull/2).
- [PR #3 – atstumas, trukmė ir preliminari kaina](https://github.com/laimastriskiene-lgtm/taxigo/pull/3).

2026-11-12 audite visi trys PR buvo sujungti į `main`; vietinė `main` sutapo su GitHub. Tai audito momento, ne nuolat atnaujinama būsena.

Dar reikia pateikti viešą Vercel URL ir Notion dokumentacijos nuorodą. Notion turi apimti projekto tikslą, Scope, užduočių sąrašą, bent 3 sprendimų įrašus ir 2 klaidų įrašus. Kiekviename įraše nurodyti kontekstą, pasirinktą sprendimą / taisymą ir rezultatą; nepriskirti dar neatliktų darbų įgyvendintiems.

Įrodymų rinkinys: Supabase lentelės, ryšiai ir RLS; dviejų vartotojų izoliacija; Zapier Paths ir Zap History; klaidų apdorojimas, savininkas ir Tasks skaičiavimas; testų rezultatai; viešas URL ir PR nuorodos. Ekrano nuotraukose paslėpti asmens duomenis, raktus ir Webhook paslaptis.

Siūlomas 5 minučių demonstracijos scenarijus:

1. 0:00–0:40 – tikslas, apimtis ir trys ekranai.
2. 0:40–1:40 – prisijungimas, adresų pasirinkimas ir preliminarus įvertis.
3. 1:40–2:30 – užsakymas, jo Supabase įrašas ir asmeninė istorija.
4. 2:30–3:30 – patikrintų `high` / `normal` Zapier vykdymų įrodymai.
5. 3:30–4:30 – klaida, juodraštis ir pakartotinis bandymas be dublikato.
6. 4:30–5:00 – testai, RLS įrodymai, PR ir likę ribojimai.

Likę darbai: patvirtinti serverio RLS ir automatizaciją, surinkti išorinius įrodymus, pateikti Vercel / Notion nuorodas ir užbaigti rankines patikras. Papildomiems taškams galima įgyvendinti užsakymų istorijos grafiką; šiuo metu jo nėra.

## Autorė

**Laima Striškienė**
