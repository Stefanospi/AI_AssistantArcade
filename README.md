# 🕹️ AI Assistant Arcade

**AI Assistant Arcade** è un piccolo esperimento personale ispirato ai cabinati arcade anni '80, pensato per integrare strumenti AI a supporto della produttività degli sviluppatori moderni.

Un'interfaccia semplice e nostalgica, in cui testare alcune funzionalità utili come la generazione di regex, il debugging di codice, la gestione di snippet e l’esplorazione della documentazione tecnica, il tutto potenziato da un assistente AI.

> ⚠️ Il progetto è ancora in fase di test iniziale: le funzioni attuali sono prototipali, con aggiornamenti in corso.

## 🎯 Funzionalità

L’app include una selezione di strumenti accessibili tramite un’unica dashboard:

### 🤖 Ask the Assistant
Una semplice chat AI dove puoi:
- Porre domande su linguaggi e concetti di programmazione
- Chiedere spiegazioni su codice
- Ricevere suggerimenti su come affrontare problemi comuni

### 🔠 Regex Builder
Uno strumento per:
- Generare espressioni regolari tramite input testuale
- Analizzare e scomporre regex complesse
- Testare le regex su stringhe di esempio

### 🛠️ Code Fixer
Permette di:
- Inviare brevi snippet di codice
- Rilevare errori e bug
- Ottenere soluzioni e spiegazioni

### 📁 Snippet Manager
Un sistema semplice per:
- Salvare e visualizzare frammenti di codice riutilizzabili
- Ricevere suggerimenti automatici in base al contesto

### 📚 Docs Explorer
Supporto alla consultazione tecnica:
- Ricerca semplificata nella documentazione di framework
- Risposte assistite con spiegazioni focalizzate
- Supporto per librerie front-end/back-end più comuni

## 🧠 Stack Tecnologico

### Frontend
- ✅ HTML5
- ✅ SCSS
- ✅ JavaScript Vanilla
- ✅ GSAP per animazioni dinamiche
- 🔜 *In futuro*: migrazione su **Angular** per componentizzazione e scalabilità

### Backend
- ⚙️ FastAPI (Python)
- 🔌 Integrazione con **Google Gemini Pro API** per elaborazione AI

## 📁 Struttura del Progetto

ai-assistant-arcade/
├── frontend/
│   ├── index.html
│   ├── styles/
│   │   └── main.scss
│   ├── scripts/
│   │   ├── main.js
│   │   ├── chat.js
│   │   ├── sidebar.js
├── backend/
|   ├── run.py
│   ├── main.py
|   ├── config.py
│   ├── routers/
│   │   ├── __init__.py
│   │   └── ai_router.py
│   ├── services/
│   │   ├── __init__.py
│   │   └── gemini_service.py
│   └── requirements.txt
├── assets/
│   └── img/, fonts/, audio/
└── README.md

## 🛠️ Installazione e Avvio in Locale

### 📦 Requisiti

- Python 3.9+
- Ambiente virtuale (consigliato)
- Editor con Live Server (es. VS Code)

### ▶️ Avvio Backend (FastAPI)

Clona la repo:
git clone https://github.com/tuo-username/ai-assistant-arcade.git
cd ai-assistant-arcade/backend

Crea ed attiva un virtual environment:
python -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate

Installa le dipendenze:
pip install -r requirements.txt

Crea il file .env ed inserisci le seguenti variabili:
GOOGLE_API_KEY=la_tua_chiave_api
FRONTEND_URL=http://localhost:8000

Avvia il server:
uvicorn main:app --reload

Il backend sarà disponibile su http://localhost:8000

Documentazione API:
Swagger UI → http://localhost:8000/docs

### 🌐 Avvio Frontend

Apri il file frontend/index.html nel browser, o usa Live Server da un editor.

## 🔄 Stato del Progetto

| Funzionalità       | Stato                         |
|--------------------|-------------------------------|
| Ask the Assistant  | ✅ Test iniziale funzionante   |
| Regex Builder      | ✅ Base operativa              |
| Code Fixer         | ✅ Output semplificato attivo  |
| Snippet Manager    | 🧪 In sviluppo                 |
| Docs Explorer      | 🧪 In sviluppo                 |
| Layout Responsive  | 🚧 In progressivo miglioramento |
| Angular Frontend   | 🔜 Previsto nei prossimi step  |

## 📬 Contribuire

1. Fai un fork della repo
2. Crea un branch (`git checkout -b feature/mia-funzionalità`)
3. Fai il commit delle modifiche
4. Pusha il branch (`git push origin feature/mia-funzionalità`)
5. Crea una Pull Request

Oppure apri una Issue per feedback o domande.

## 📄 Licenza

Solo a scopo di apprendimento, non è distribuito per guadagnarci!

## 🙌 Credits

- Progetto di **Stefano Spitaleri**
- Design ispirato ai cabinati arcade classici anni '80
- AI supportata da **Google Gemini Pro API**

> Made with ❤️ + FastAPI + un pizzico di nostalgia

