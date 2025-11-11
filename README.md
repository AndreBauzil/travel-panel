# ✈️ Painel do Viajante (Travel Dashboard)

Um assistente de viagem inteligente construído com uma arquitetura BFF (Backend for Frontend). O usuário pode pesquisar por uma cidade e receber um painel completo com informações em tempo real sobre clima, história, locais de interesse e dicas de viagem geradas por IA.

**Frontend Live:** [https://travel-panel-frontend.onrender.com/](https://travel-panel-frontend.onrender.com/)  
**Backend Live:** [https://travel-panel-api.onrender.com/](https://travel-panel-api.onrender.com/)

<!-- ![Print da Tela do Painel do Viajante](https://i.imgur.com/gKzBwN2.png)  -->

---

### ✨ Funcionalidades Principais

* **Busca Inteligente:** Componente de Autocomplete que usa uma API de Geocodificação para sugerir cidades enquanto o usuário digita.
* **Orquestração de APIs (BFF):** O backend em Rails busca dados de 4 APIs externas diferentes **em paralelo** para otimizar o desempenho.
* **Clima (5 Dias):** Exibe o clima atual e uma previsão expansível para os próximos 5 dias (usando a API OpenWeatherMap).
* **Informações da Cidade (Wikipedia):** Busca o sumário e um carrossel de imagens da Wikipedia, com lógica de busca precisa para evitar páginas de desambiguação.
* **Insights da IA (Gemini):** Usa a gem `ruby_llm` para enviar o nome da cidade à API do Google Gemini, gerando um "Resumo do Viajante" e "Dicas Rápidas" personalizadas.
* **Locais de Interesse (OpenStreetMap):** Busca Pontos Turísticos, Restaurantes e Hotéis próximos usando a API gratuita Overpass (OSM) e os exibe em abas.
* **Links Dinâmicos:** Os locais de interesse são links que abrem o Google Maps com a pesquisa do local.

---

### 🛠️ Tech Stack

**Frontend (pasta `/frontend`)**
* **React** (com Vite)
* **TypeScript**
* **Mantine:** Biblioteca de componentes UI.
* **@mantine/carousel:** Para o carrossel de imagens.
* **Axios:** Para chamadas de API.
* **Render:** Deploy de Site Estático.

**Backend (pasta `/api`)**
* **Ruby on Rails 8:** Usado como um BFF (Backend for Frontend) em modo API-only.
* **Puma:** Servidor de aplicação web.
* **Rack-CORS:** Para gerenciamento de Cross-Origin.
* **HTTParty:** Para consumir as APIs externas (OpenWeather, Wikipedia, OpenStreetMap).
* **RubyLLM:** Gem de abstração para consumir a API do Google Gemini.
* **Render:** Deploy de Web Service.

---

### 🚀 Como Executar Localmente

**Pré-requisitos:**
* Ruby & Rails instalados
* Node.js & NPM instalados
* Chaves de API (OpenWeatherMap, Google Gemini)

**1. Configurar o Backend (API)**

```bash
# 1. Navegue até a pasta da API
cd api

# 2. Instale as dependências
bundle install

# 3. Configure suas chaves secretas
# (Isso abrirá o editor para o credentials.yml.enc)
bin/rails credentials:edit

# Adicione suas chaves no formato:
# weather:
#   api_key: SUA_CHAVE_OPENWEATHER
# gemini:
#   api_key: SUA_CHAVE_GEMINI

# 4. Inicie o servidor Rails
rails s
```
A API estará rodando em http://localhost:3000.


**2. Configurar o Frontend**

```bash
# 1. Em um novo terminal, navegue até a pasta do frontend
cd frontend

# 2. Instale as dependências
npm install

# 3. Inicie o servidor de desenvolvimento do Vite
npm run dev
```

O frontend estará rodando em http://localhost:5173.

---