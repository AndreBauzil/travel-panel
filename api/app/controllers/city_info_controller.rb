require 'httparty'
require 'mediawiktory'

class CityInfoController < ApplicationController
  # Quando acessar GET /city_info
  def index
    city = params[:city]
    weather_api_key = Rails.application.credentials.weather[:api_key]
    
    if city.blank?
      render json: { error: 'Parâmetro "city" é obrigatório' }, status: :bad_request
      return
    end
  
    weather_data = fetch_weather_and_forecast(city, weather_api_key)
    wikipedia_data = fetch_wikipedia_data(city)
  
    # IA Call
    ai_data = fetch_ai_insights(city, wikipedia_data[:summary])

    # Verifiy all errors
    errors = [weather_data[:error], wikipedia_data[:error], ai_data[:error]].compact.join('; ')
    if errors.present?
      render json: { error: errors}, status: :bad_gateway
      return
    end
  
    # Combine all
    combined_data = {
      city: weather_data[:city], 
      weather: weather_data,
      wikipedia: wikipedia_data,
      ai_insights: ai_data 
    }
  
    render json: combined_data, status: :ok
  end

  private # Auxiliar Methods, not routes

  # --- Weekly - WEATHER ---
  def fetch_weather_and_forecast(city, api_key)
    base_url = "https://api.openweathermap.org/data/2.5/forecast"
    options = {
      query: {
        q: city,
        appid: api_key,
        units: 'metric',
        lang: 'pt_br',
      }
    }

    begin
      response = HTTParty.get(base_url, options)
      if response.success?
        data = response.parsed_response
        
        # Find current data (first of the list)
        current_data = data['list'].first
        
        # Process full list to extract daily forecast
        daily_forecast = process_daily_forecast(data['list'])

        return {
          city: data['city']['name'],
          current_temp: current_data['main']['temp'].round(1),
          current_desc: current_data['weather'][0]['description'],
          current_icon: "https://openweathermap.org/img/wn/#{current_data['weather'][0]['icon']}@2x.png",
          forecast: daily_forecast
        }
      else
        return { error: "Dados de clima não encontrados (#{response.code})" }
      end
    rescue HTTParty::Error, StandardError => e
      return { error: "Erro ao buscar dados do clima: #{e.message}" }
    end
  end

  # --- Daily - WEATHER FORECAST ---
  def process_daily_forecast(list)
    daily_data = {}

    list.each do |item|
      # Convert timestamp 'dt' to an object Date
      day = Time.at(item['dt']).to_date
      
      # Ignore today
      next if day == Date.today 

      # Creates an entry for that day, if first time
      daily_data[day] ||= { temps: [], icons: [], descriptions: [] }
      
      # Adds data from 3hours item
      daily_data[day][:temps] << item['main']['temp_min']
      daily_data[day][:temps] << item['main']['temp_max']
      daily_data[day][:icons] << item['weather'][0]['icon']
      daily_data[day][:descriptions] << item['weather'][0]['description']
    end

    # Format agrouped data
    forecast = daily_data.map do |day, data|
      # Find daily commons icon and description
      common_icon = data[:icons].group_by(&:itself).max_by { |_, v| v.size }&.first || data[:icons].first
      common_desc = data[:descriptions].group_by(&:itself).max_by { |_, v| v.size }&.first || data[:descriptions].first
      
      {
        date: day.strftime('%a, %d/%m'), # Format date
        temp_min: data[:temps].min.round(1),
        temp_max: data[:temps].max.round(1),
        icon: "https://openweathermap.org/img/wn/#{common_icon}@2x.png",
        description: common_desc
      }
    end

    # Return next 5 days
    return forecast.take(5)
  end

  # --- WIKIPEDIA ---
  def fetch_wikipedia_data(city)
    base_url = 'https://pt.wikipedia.org/w/api.php'
    
    query_options = {
      action: 'query',
      format: 'json',
      prop: 'extracts|pageimages',
      exintro: true,         
      piprop: 'original',    
      redirects: true,       
      utf8: true,

      generator: 'search', 
      gsrsearch: city,     
      gsrlimit: 1          
    }
  
    # Search for "City (city)"
    begin
      response = HTTParty.get(base_url, query: query_options.merge(titles: city + " (cidade)"))
      page_data = response.parsed_response.dig('query', 'pages')&.values&.first
    
      if page_data.nil? || page_data.key?('missing')
        response = HTTParty.get(base_url, query: query_options.merge(titles: city))
        page_data = response.parsed_response.dig('query', 'pages')&.values&.first
      end
  
      if page_data && !page_data.key?('missing')
        summary_html = page_data.fetch('extract', '')
        
        summary_raw = summary_html ? ActionController::Base.helpers.strip_tags(summary_html) : "Nenhum resumo encontrado."
        
        # Cleaning Block
        summary_clean = summary_raw
                          .gsub(/\(\[.*?\]\s*\)\s*/, '') # Remove pronunciation guides
                          .gsub(/&nbsp;/, ' ')           # Replace "&nbsp;"
                          .gsub(/\s+/, ' ')              # Replace multiple spaces
                          .strip                       
        
        image_url = page_data.dig('original', 'source')
  
        return {
          summary: summary_clean, 
          image_url: image_url,
          page_title: page_data.fetch('title', city)
        }
      else
        return { summary: "Nenhuma informação encontrada na Wikipedia.", image_url: nil, page_title: nil }
      end
  
    rescue StandardError => e
      return { error: "Erro ao buscar dados da Wikipedia: #{e.message}" }
    end
  end
  
  # --- AI PROMPT LOGIC ---
  def fetch_ai_insights(city, wikipedia_summary)
    prompt = <<-PROMPT
      Você é um assistente de viagens com um tom amigável e experiente, 
      como um "diário de bordo" inteligente. 
      Sua tarefa é gerar duas coisas sobre a cidade: 
      1. Um "Resumo do Viajante" (uma descrição curta e envolvente em 2-3 frases).
      2. Três "Dicas Rápidas" (curiosidades ou conselhos úteis em formato de lista).
  
      Use o resumo da Wikipedia abaixo como contexto principal, mas sinta-se à vontade para adicionar 
      conhecimento comum sobre a cidade. A resposta deve ser um JSON válido.
  
      Contexto da Wikipedia: 
      "#{wikipedia_summary}"
  
      Cidade: #{city}
  
      Responda apenas com o objeto JSON, formatado da seguinte maneira:
      {
        "traveler_summary": "...",
        "quick_tips": [
          "...",
          "...",
          "..."
        ]
      }
    PROMPT
  
    begin
      chat = RubyLLM.chat(
        provider: :gemini, 
        model: 'gemini-2.5-flash'
      )
      
      response = chat.ask(prompt)
      
      json_string = response.content
      
      json_response = json_string.gsub("```json", "")
                                 .gsub("```", "")
                                 .strip
  
      return JSON.parse(json_response)
  
    rescue StandardError => e
      return { error: "Erro ao gerar insights da IA: #{e.message}" }
    end
  end
end