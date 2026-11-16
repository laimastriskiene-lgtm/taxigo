# TaxiGo – mokomoji kelionių užsakymų sistema

TaxiGo leidžia keleiviui prisiregistruoti, pasirinkti Lietuvos adresus, apskaičiuoti preliminarų automobilio maršrutą, pateikti užsakymą ir peržiūrėti savo keliones. Sąsaja lietuviška, pritaikyta telefonams ir kompiuteriams.

**TaxiGo yra mokomasis projektas – tikros taksi paslaugos neteikiamos.** Prisijungusio keleivio užsakymai išsaugomi Supabase, tačiau tai nėra tikras vairuotojo iškvietimas.

**Būsena atnaujinta 2026-11-16.** Kodo teiginiai sutikrinti su GitHub `main` (`cf1a8bfa9c820e5e228ceb3ea205e41cae599332`), išorinių bandymų rezultatai – su [Notion dokumentacija](https://app.notion.com/p/415299223c19802fb674f380e46580fc). Senesni Notion pažangos įrašai yra istoriniai.

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

**Patvirtinta pagal 2026-11-12 Notion įrašą:** atliktas dviejų vartotojų UI bandymas – vieno vartotojo kelionės kito vartotojo istorijoje nerodomos. Dokumentuota Supabase Policies vizualinė peržiūra: abiejose lentelėse RLS įjungtas, politikos taikomos `authenticated` rolei. SELECT ribojamas pagal `user_id = auth.uid()`; `rides` INSERT tikrina ir keleivio priklausymą vartotojui. `passengers` INSERT bei UPDATE tikrina vartotojo ID; `rides` UPDATE / DELETE ir `passengers` DELETE politikų peržiūroje nebuvo.

**Dar nepatikrinti saugumo testai:** faktinės `GRANT` teisės, API prieigos nustatymai ir tiesioginiai neleistinų SELECT, INSERT (įskaitant svetimą `passenger_id`), UPDATE bei DELETE bandymai su dviejų vartotojų sesijomis. UI izoliacijos testas ir politikų vizualinė peržiūra nėra pilnas serverio RLS saugumo auditas. Administratoriaus SQL Editor bandymai neatstoja vartotojo sesijos testų. Šio README atnaujinimo metu prie gyvos DB nesijungta, politikos nekeistos.

## 7. Lietuvos adresai, maršrutas ir preliminari kaina

Abiejuose adresų laukuose veikia Geoapify pasiūlymai su `filter=countrycode:lt`. Rodomi turimi gatvės, namo numerio ir vietovės duomenys. Leidžiamas rankinis įvedimas.

Vien miesto nepakanka. Gatvei reikia namo numerio ir vietovės; konkreti įvardyta vieta, pavyzdžiui, autobusų stotis su vietove, gali būti priimama be namo numerio. Tikrinamas pasirinkto pasiūlymo tipas ir duomenys, ne vien skaičiaus buvimas tekste.

Maršrutas skaičiuojamas Geoapify Routing API su `mode=drive`. Rankinis adresas pirmiausia geokoduojamas su Lietuvos filtru; neaiškus ar netikslus rezultatas nenaudojamas kaip patvirtinta vieta.

```text
atstumas km = atstumas metrais / 1000 (rodoma 2 skaitmenimis po kablelio)
trukmė min. = sekundės / 60 (apvalinama į didesnę sveiką minutę)
Standard kaina = 3 € + 1,00 € × atstumas km (apvalinama iki centų)
Comfort kaina = 3 € + 1,50 € × atstumas km (apvalinama iki centų)
```

Kaina skaičiuojama iš pradinio atstumo metrais, prieš rodymo apvalinimą. Pakeitus automobilio tipą perskaičiuojama tik kaina; atstumas ir trukmė nesikeičia, papildoma maršruto API užklausa nesiunčiama. Pavyzdžiui, 10 km: Standard – 13 €, Comfort – 18 €. Rezultatai rodomi formoje, išsaugomi Supabase ir pateikiami istorijoje.

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

React kode tiesioginio Zapier Webhook kvietimo nėra. Išorinė automatizacija dokumentuota [Notion](https://app.notion.com/p/415299223c19802fb674f380e46580fc): Supabase Webhook → Webhooks by Zapier (Catch Hook) → Filter → Paths.

- **HIGH:** Path A → Gmail „Send Email“, pranešimas apie skubų užsakymą.
- **NORMAL:** Fallback → Storage by Zapier „Set Value“, be Gmail laiško. Dokumentuota reikšmė `normal` raktui `taxigo_normal_orders`; tai nėra visų NORMAL užsakymų archyvas ar skaitiklis.
- **Gmail klaida:** Error Handler → Storage by Zapier „Set Value“; raktas `taxigo_gmail_error`, reikšmė „Gmail siuntimo klaida“. Klaidos registravimas Storage savaime nepatvirtina atskiro pranešimo savininkui.

Abu prioritetų keliai išbandyti ir paskelbta Zap versija dokumentuoti 2026-11-12. **2026-11-16 atliktas pilnas paskelbtos automatizacijos klaidos bandymas:** neteisingas Gmail gavėjas sukėlė „Handled error“ vykdymą; Notion pateiktoje Zap History nuotraukoje matomas laikas 17:41:18. Tai papildo ankstesnius atskirų žingsnių bandymus ir patvirtina viso Zap klaidos apdorojimą.

**Po testo sėkmingas siuntimas atkurtas:** naujas HIGH užsakymas 2026-11-16 17:52:14 Lietuvos laiku, vartotojos patvirtinimu, baigėsi „Successful“ ir gautu laišku. Šio kontrolinio vykdymo rezultatas dokumentuotas pagal vartotojos patvirtinimą; nauja jo ekrano nuotrauka nepateikta. Gavėjo adresas ir užsakymo identifikatorius į README neperkeliami. Vėlesnis el. pašto nepristatymo pranešimas nėra tas pats, kas Gmail veiksmo klaida Zapier.

**Mėnesio Tasks prognozė:** 50 Tasks/mėn. pagal Notion 2026-11-16 prielaidą: 25 HIGH × 1 Gmail veiksmas + 25 NORMAL × 1 Storage veiksmas = 50. Šiame modelyje Webhook, Filter ir Paths nelaikomi atskirais mokamais veiksmais. Tai planavimo prognozė, ne faktinis naudojimas ar plano kainos patvirtinimas; papildomas klaidų apdorojimas ir pakartojimai gali keisti sąnaudas. Faktinę apskaitą ir Webhooks / Paths prieinamumą reikia sutikrinti su naudojamu Zapier planu.

Automatizacijos priežiūra: projekto savininkė; konfigūracija, bandymai ir įrodymai – Notion. Šiame dokumentavimo etape gyva Supabase Webhook ir Zapier konfigūracija tiesiogiai neperžiūrėta ir nekeista; išoriniai rezultatai pateikiami pagal dokumentuotus įrodymus.

## 10. Vercel diegimas ir aplinkos

Projektas surenkamas kaip Vite statinė programa. Vercel diegimui naudojami Vite nustatymai: priklausomybių diegimas `npm ci`, Build komanda `npm run build`, Output Directory `dist`.

Vercel projekto aplinkoje nustatykite tris 3 skyriuje išvardytus kintamuosius. Patikrinkite, kuriose aplinkose jie galioja, ir po pakeitimų atlikite naują diegimą. Supabase Auth URL nustatymus ir Geoapify leidžiamų svetainių apribojimus suderinkite su faktiniu viešu adresu.

**Gyva svetainė: [TaxiGo](https://taxigo-gamma.vercel.app/).** Tikslus adresas paimtas iš GitHub repozitorijos svetainės lauko; 2026-11-16 atidarytas ir patvirtintas veikiantis TaxiGo prisijungimo ekranas. GitHub `main` commit Vercel būsena – „Deployment has completed“. PR peržiūros adresas nėra pagrindinis svetainės adresas.

Ši patikra neapima prisijungimo tikra paskyra, visos užsakymo eigos ar telefono išdėstymo. Viešai aplinkai dar reikia pilnos registracijos, prisijungimo, adresų, maršruto, išsaugojimo ir istorijos patikros telefone bei kompiuteryje. Faktinės Vercel aplinkos kintamųjų reikšmės ir Auth / Geoapify paskyrų apribojimai šiame etape neperžiūrėti.

## 11. Automatinės ir rankinės patikros

```bash
npm run lint
npm run build
node --test --test-concurrency=1 tests/*.test.js
```

`npm test` komandos šiuo metu nėra. Testai paleidžiami tiesiogiai Node.js test runner. Nuoseklus vykdymas leidžia išvengti audito metu pasitaikiusios lygiagretaus procesų paleidimo `spawn EPERM` klaidos.

**Naujausias dokumentuotas rezultatas – 35/35 testų praėjo**, lint ir build sėkmingi ([sujungtas PR #5](https://github.com/laimastriskiene-lgtm/taxigo/pull/5)). Build išlieka įspėjimas apie didesnį nei 500 kB JS paketą. Tai PR įgyvendinimo metu užfiksuoti rezultatai; šio README atnaujinimo metu testai, lint ir build iš naujo nepaleisti.

Testų aprėptis:

- `addressValidation.test.js` – 8 adresų tikslumo testai.
- `geoapifyRouting.test.js` – 7 geokodavimo ir maršruto API testai.
- `rideEstimate.test.js` – 5 formulės, abiejų tarifų, reikšmių ir formatavimo testai.
- `rideFlow.test.js` – 9 išsaugojimo, tarifų duomenų, UUID, atkūrimo ir formos valdymo testai.
- `useRideEstimate.test.js` – 6 debounce, pasenusių atsakymų, klaidų, atšaukimo ir automobilio tipo keitimo be naujos API užklausos testai.

API ir Supabase šiuose testuose imituojami; dalis formos logikos tikrinama be tikro naršyklės DOM. Testai nepatvirtina realių RLS politikų, Zapier ar Vercel veikimo. Savininkė patvirtino ankstesnę sėkmingą maršruto ir išsaugojimo patikrą naršyklėje bei Supabase.

Rankinių patikrų sąrašas prieš atsiskaitymą (ne visas sąrašas jau atliktas; patvirtinimai atskirti 6, 9 ir 10 skyriuose):

1. Registracija, klaidingas prisijungimas, sesijos atkūrimas ir atsijungimas.
2. Dviejų paskyrų UI izoliacija jau dokumentuota; papildomai atlikti tiesioginius neleistinų DB operacijų bandymus, įskaitant INSERT su svetimu `passenger_id`.
3. Tuščia istorija, filtrai ir seno užsakymo `NULL` įverčiai.
4. Lietuvos miesto, miestelio ir kaimo adresai, namo numeris, rankinis adresas ir konkreti vieta be numerio.
5. Greitas adresų keitimas, maršruto API sutrikimas, perskaičiavimas ir užsakymas be įverčio.
6. Tinklo sutrikimas išsaugant, perkrovimas, aiškus juodraščio atkūrimas, pakartotinis siuntimas ir dvigubas paspaudimas. Patikrinti, kad DB liko vienas įrašas.
7. Nauja tuščia forma po sėkmės; išsaugotas užsakymas nebeatkuriamas kaip juodraštis.
8. Pristatyti dokumentuotus `high` / `normal` ir pilno „Handled error“ rezultatus; prieš demonstraciją patikrinti Zapier plano galiojimą.
9. Vieša Vercel aplinka telefone ir kompiuteryje: nėra horizontalaus slinkimo, veikia apatinė navigacija, pasiūlymai ir klaviatūros valdymas.

## 12. GitHub, Notion ir atsiskaitymas

- [GitHub saugykla](https://github.com/laimastriskiene-lgtm/taxigo).
- [PR #1 – užsakymų valdymas ir fallback](https://github.com/laimastriskiene-lgtm/taxigo/pull/1).
- [PR #2 – Lietuvos adresų paieška ir validacija](https://github.com/laimastriskiene-lgtm/taxigo/pull/2).
- [PR #3 – atstumas, trukmė ir preliminari kaina](https://github.com/laimastriskiene-lgtm/taxigo/pull/3).

- [PR #4 – README ir TaxiGo favicon](https://github.com/laimastriskiene-lgtm/taxigo/pull/4).
- [PR #5 – Standard ir Comfort tarifai](https://github.com/laimastriskiene-lgtm/taxigo/pull/5).
- [Gyva Vercel svetainė](https://taxigo-gamma.vercel.app/).
- [Notion dokumentacija](https://app.notion.com/p/415299223c19802fb674f380e46580fc).

2026-11-16 GitHub patikroje **5 PR (#1–#5) sujungti į `main`**. Tai šios patikros momento būsena; šis README atnaujinimas į skaičių neįtrauktas.

Notion pateikti tikslas, Scope, Kanban nuoroda, sprendimai, UI būsenų įrodymai, RLS peržiūra, Zapier klaidų bandymai ir Tasks prognozė. Senesnius pažangos įrašus reikia skaityti kartu su vėlesniais patikslinimais; pavyzdžiui, senas `ride_time` pavadinimas neatitinka dabartinio kodo `pickup_time`. Prieš atsiskaitymą sutikrinti dokumentacijos reikalavimus: bent 3 sprendimų ir 2 klaidų įrašai su kontekstu, sprendimu / taisymu ir rezultatu.

Įrodymų rinkinys: Supabase lentelės, ryšiai ir RLS; dviejų vartotojų izoliacija; Zapier Paths ir Zap History; klaidų apdorojimas, savininkas ir Tasks skaičiavimas; testų rezultatai; viešas URL ir PR nuorodos. Ekrano nuotraukose paslėpti asmens duomenis, raktus ir Webhook paslaptis.

Siūlomas 5 minučių demonstracijos scenarijus:

1. 0:00–0:40 – tikslas, apimtis ir trys ekranai.
2. 0:40–1:40 – prisijungimas, adresų pasirinkimas ir preliminarus įvertis.
3. 1:40–2:30 – užsakymas, jo Supabase įrašas ir asmeninė istorija.
4. 2:30–3:30 – patikrintų `high` / `normal` Zapier vykdymų įrodymai.
5. 3:30–4:30 – klaida, juodraštis ir pakartotinis bandymas be dublikato.
6. 4:30–5:00 – testai, RLS įrodymai, PR ir likę ribojimai.

Likę darbai: užbaigti tiesioginius serverio RLS saugumo testus bei `GRANT` / API prieigos patikrą, pilną viešos svetainės patikrą telefone ir kompiuteryje, sutikrinti Zapier planą ir galutinį atsiskaitymo įrodymų rinkinį. Dokumentuoti UI izoliacijos ir Zapier klaidos bandymai nelaikomi neatliktais darbais. Papildomiems taškams galima įgyvendinti užsakymų istorijos grafiką; šiuo metu jo nėra.

## Autorė

Projekto savininkė.
