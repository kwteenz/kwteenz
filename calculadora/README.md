# Calculadora do Herói

Calculadora em HTML/CSS/JS com tema RPG (XP, níveis e diário de missões), publicada no **GitHub Pages** e pronta para virar **APK** com [Capacitor](https://capacitorjs.com/).

Online: https://kwteenz.github.io/kwteenz/

## Rodar no navegador

```bash
cd calculadora
npm run start   # abre em http://localhost:8080
```

Ou abra `www/index.html` direto no navegador.

## Gerar o APK

### Automático (GitHub Actions)

O workflow `.github/workflows/calculadora-apk.yml` compila o APK a cada push em `main` que mexer em `calculadora/`.

- Baixe o APK em **Actions → execução → Artifacts → calculadora-apk**.
- Para publicar numa Release, crie uma tag: `git tag calculadora-v1.0.0 && git push --tags`.

O APK gerado é **debug** (instala direto no celular, sem assinatura própria). Para publicar na Play Store, é preciso um APK/AAB **release assinado** com seu keystore.

### Local

Requer Node 20+, JDK 17 e Android SDK.

```bash
cd calculadora
npm install
npx cap add android
npm run android:build
# APK em android/app/build/outputs/apk/debug/app-debug.apk
```

## Estrutura

```
calculadora/
├── www/                  # o app (HTML, CSS, JS, PWA)
├── capacitor.config.json # id e nome do app Android
└── package.json
```

O ID do app é `com.kwteenz.calculadora`; altere em `capacitor.config.json` se quiser outro.
