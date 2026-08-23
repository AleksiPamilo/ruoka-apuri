# Ruoka-apuri

Mobiilisovellus viikon ateriasuunnitteluun ja reseptien hallintaan.

<p align="center">
  <img src="docs/images/etusivu_light.png" width="22%" alt="Etusivu 1" />&nbsp;
  <img src="docs/images/kalenteri_light.png" width="22%" alt="Kalenteri 1" />&nbsp;&nbsp;&nbsp;
  <img src="docs/images/etusivu_dark.png" width="22%" alt="Etusivu 2" />&nbsp;
  <img src="docs/images/kalenteri_dark.png" width="22%" alt="Kalenteri 2" />
</p>

### Ominaisuudet
- **Reseptisuositukset:** Ehdotukset valittujen proteiinilähteiden mukaan.
- **Viikkosuunnitelma:** 7 päivän ateriaehdotukset ilman toistoa.
- **Meal Prep & Kalenteri:** Reseptien rytmitys ja tallennus viikkonäkymään.

### Teknologiat
React Native (Expo Router) · TypeScript · Supabase

---

### Asennus & kehitys

1. **Kloonaa repo ja asenna riippuvuudet**
   ```bash
   git clone https://github.com/AleksiPamilo/ruoka-apuri.git
   cd ruoka-apuri
   pnpm install
   ```

2. **Ympäristömuuttujat**
Luo `.env`-tiedosto juureen:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=oma_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=oma_avain
   ```


3. **Käynnistä**
   ```bash
   pnpm start
   ```
