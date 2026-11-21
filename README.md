# Cozy Merge (radni naziv)

Offline merge igra za Android: mala pekara. Spajaj sastojke u sve bolje poslastice, ispuni narudžbe kupaca, zarađuj zvijezde i otključavaj nove generatore i prostore pekare.

- Potpuno offline, portret, igra se jednom rukom (dodir ili povuci-i-spusti)
- 5 lanaca po 6 nivoa (brašno, jaja, mliječni, voće, slatkiši), ploča 7x9
- 20 ručno pisanih narudžbi, poslije toga se generišu beskonačno
- 2 područja: Little Kitchen, Garden Terrace
- Energija: max 100, +1 na minut (računa se i dok je igra zatvorena)
- Monetizacija: samo rewarded video (+25 energije, dupla nagrada, spoji sve). Trenutno **simulirano** kroz `AdService`

## Pokretanje lokalno

```
npm start        # http://localhost:8080  (otvori u Chrome, uključi mobile view)
npm run sim      # testovi logike + bot koji odigra 30 narudžbi
```

Ne treba `npm install` za lokalno igranje (samo za APK build).

## APK

Svaki push na GitHub pokreće Actions (`.github/workflows/build-apk.yml`):

1. Pokrene `npm run sim` (build pada ako logika ne valja)
2. Generiše Android projekat preko Capacitora, zaključa portret, potpiše fiksnim debug ključem
3. Šalje `cozy-merge.apk` kao **artifact** (Actions > run > Artifacts) i objavi ga u **Releases**
   - grana `main`: `build-N` (release)
   - ostale grane: `dev-N` (prerelease, instalira se pored originala, `com.devabu.cozymerge.dev`)

`keystore/debug.keystore` je fiksni DEBUG ključ (da se nove verzije instaliraju preko starih). Nije za Play Store.

## Gdje su postavke

| Šta | Gdje |
|---|---|
| Svi tekstovi (UI, nazivi predmeta, kupaca) | `www/strings.js` |
| Energija, cijene, lanci, boje, generatori, područja, 20 narudžbi | `www/data.js` |
| Pravila igre (spajanje, energija, narudžbe, nagrade) | `www/core.js` |
| Spremanje + **AdService** | `www/services.js` |
| Zvuk i muzika (WebAudio, bez fajlova) | `www/audio.js` |
| Grafika predmeta (crtano kodom) | `www/sprites.js` |
| Crtanje, dodir, ekrani | `www/main.js` |

Korisničke postavke (muzika, efekti, vibracija) su u meniju (zupčanik gore desno) i spremaju se lokalno.

## Zamjena simulirane reklame pravim AdMob-om

Sav kod za reklame je u `AdService` (`www/services.js`). Igra poziva samo:

- `AdService.show(placement, onReward)`: pokreni reklamu, na nagradu pozovi `onReward()`
- `AdService.status(placement, now)`: stanje dugmeta (`idle` / `watching` / `cooldown`)
- `AdService.cancel(placement)`, `AdService.update(now)`

Placementi: `energy`, `mergeAll`, `double`. Kad dodaš AdMob plugin, zamijeni tijela ovih funkcija; ostatak koda se ne dira.

## Spremanje

`localStorage`, ključ `cozymerge_save_v1` (coini, zvijezde, energija + vrijeme, ploča, narudžbe, područje, postavke, najbolji nivo, rezultat).
