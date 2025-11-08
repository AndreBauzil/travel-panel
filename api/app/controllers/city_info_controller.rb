require 'httparty'
require 'mediawiktory'

class CityInfoController < ApplicationController
  # Quando acessar GET /city_info
  def autocomplete
    city_query = params[:query]
    weather_api_key = Rails.application.credentials.weather[:api_key]

    if city_query.blank? || city_query.length < 3
      render json: [], status: :ok
      return
    end

    base_url = "http://api.openweathermap.org/geo/1.0/direct"
    options = { 
      query: { 
        q: city_query, 
        limit: 5, 
        appid: weather_api_key 
      } 
    }
    
    begin
      response = HTTParty.get(base_url, options)
      if response.success? && response.parsed_response.any?
        
        # Map results to string
        suggestions = response.parsed_response.map do |city|
          parts = [city['name'], city['state'], city['country']]
          parts.compact.reject(&:empty?).join(', ') # Remove nulls/empty and joins all
        end
        
        # Calls .uniq on array to remove all duplicates
        render json: suggestions.uniq, status: :ok

      else
        render json: [], status: :ok
      end
    rescue StandardError => e
      render json: { error: "Erro na geocodificação: #{e.message}" }, status: :service_unavailable
    end
  end

  def index
    full_city_param = params[:city]
    weather_api_key = Rails.application.credentials.weather[:api_key]
    
    if full_city_param.blank?
      render json: { error: 'Parâmetro "city" é obrigatório' }, status: :bad_request
      return
    end

    simple_city_name = full_city_param.split(',').first.strip

    coord_data = fetch_coordinates(full_city_param, weather_api_key)
    if coord_data[:error]
      render json: { error: coord_data[:error] }, status: :bad_gateway
      return
    end
  
    # APIs Calls Using Threads
    weather_thread = Thread.new do
      fetch_weather_and_forecast(full_city_param, weather_api_key) 
    end

    wikipedia_thread = Thread.new do
      fetch_wikipedia_data(simple_city_name)
    end
    
    places_thread = Thread.new do 
      fetch_places(coord_data[:lat], coord_data[:lon])
    end

    # Waits for main threads to finish
    weather_data = weather_thread.value
    wikipedia_data = wikipedia_thread.value
    places_data = places_thread.value

    ai_data = fetch_ai_insights(simple_city_name, wikipedia_data[:summary])

    # Verifiy all errors
    errors = [weather_data[:error], wikipedia_data[:error], ai_data[:error], places_data[:error]].compact.join('; ')
    if errors.present?
      render json: { error: errors}, status: :bad_gateway
      return
    end
  
    # Combine all
    combined_data = {
      city: weather_data[:city], 
      weather: weather_data,
      wikipedia: wikipedia_data,
      ai_insights: ai_data,
      places: places_data 
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
            current_icon: "https://openweathermap.org/img/wn/#{current_data['weather'][0]['icon'].gsub('n', 'd')}@2x.png",
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
          icon: "https://openweathermap.org/img/wn/#{common_icon.gsub('n', 'd')}@2x.png",
          description: common_desc
        }
      end

      # Return next 5 days
      return forecast.take(5)
    end

    # --- WIKIPEDIA ---
    def fetch_wikipedia_data(city)
      base_url = 'https://pt.wikipedia.org/w/api.php'
      
      summary_query_options = {
        action: 'query', format: 'json',
        prop: 'extracts|pageimages',
        exintro: true,
        piprop: 'original',
        redirects: true,
        utf8: true       
      }
    
      found_page_title = city # Fallback title
      summary_clean = "Nenhuma informação encontrada na Wikipedia."
      main_image_url = nil
      page_data = nil
    
      begin
        # Search for "City (city)"
        response = HTTParty.get(base_url, query: summary_query_options.merge(titles: city + " (cidade)"))
        page_data = response.parsed_response.dig('query', 'pages')&.values&.first

        # If search for "cidade" fails
        if page_data.nil? || page_data.key?('missing')
          response = HTTParty.get(base_url, query: summary_query_options.merge(titles: city))
          page_data = response.parsed_response.dig('query', 'pages')&.values&.first
        end
    
        # "Smart" search, using generator 
        if page_data.nil? || page_data.key?('missing')
          search_query_options = {
            action: 'query', format: 'json',
            prop: 'extracts|pageimages',
            exintro: true, piprop: 'original', redirects: true, utf8: true,
            generator: 'search',
            gsrsearch: city, 
            gsrlimit: 1
          }
          response = HTTParty.get(base_url, query: search_query_options)
          page_data = response.parsed_response.dig('query', 'pages')&.values&.first
        end
    
        # Process data (Any try)
        if page_data && !page_data.key?('missing')
          summary_html = page_data.fetch('extract', '')
          summary_raw = summary_html ? ActionController::Base.helpers.strip_tags(summary_html) : "Nenhum resumo encontrado."
          
          summary_clean = summary_raw
                            .gsub(/\(\[.*?\]\s*\)\s*/, '')
                            .gsub(/&nbsp;/, ' ')
                            .gsub(/\s+/, ' ')
                            .strip
          
          found_page_title = page_data.fetch('title', city)
          main_image_url = page_data.dig('original', 'source')
        end
    
      rescue StandardError => e
        return { error: "Erro ao buscar sumário da Wikipedia: #{e.message}" }
      end

      # Gallery images search
      gallery_query_options = {
        action: 'query', format: 'json',
        prop: 'imageinfo', iiprop: 'url',
        generator: 'images', gimlimit: 5,
        titles: found_page_title # Uses title found on first call
      }
    
      image_urls = []
      begin
        image_response = HTTParty.get(base_url, query: gallery_query_options)
        images_data = image_response.parsed_response.dig('query', 'pages')&.values
    
        if images_data
          image_urls = images_data.map { |img| img.dig('imageinfo', 0, 'url') }.compact
                                .select { |url| url.end_with?('.jpg', '.jpeg', '.png', '.gif') }
        end
      rescue StandardError => e
        puts "Erro ao buscar imagens da galeria: #{e.message}"
      end
    
      # Combine images and return
      final_image_list = ([main_image_url] + image_urls).compact.uniq
    
      return {
        summary: summary_clean,
        image_urls: final_image_list,
        page_title: found_page_title
      }
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

    # --- PLACES OF INTEREST ---
    def fetch_places(lat, lon)
      base_url = "https://overpass-api.de/api/interpreter"
      
      # Search for 3 categories on parallel using Threads
      poi_thread = Thread.new { fetch_osm_category(lat, lon, "tourism", "attraction", base_url) }
      resto_thread = Thread.new { fetch_osm_category(lat, lon, "amenity", "restaurant", base_url) }
      hotel_thread = Thread.new { fetch_osm_category(lat, lon, "tourism", "hotel", base_url) }

      return {
        points_of_interest: poi_thread.value,
        restaurants: resto_thread.value,
        hotels: hotel_thread.value
      }
      rescue StandardError => e
        return { error: "Erro ao buscar locais (OSM): #{e.message}" }
    end

    # --- OPEN STREET MAP ---
    def fetch_osm_category(lat, lon, key, value, base_url)
      overpass_query = """
        [out:json][timeout:10];
        (
          node[\"#{key}\"=\"#{value}\"](around:10000, #{lat}, #{lon});
          way[\"#{key}\"=\"#{value}\"](around:10000, #{lat}, #{lon});
        );
        out 7;
      """

      options = { body: { data: overpass_query } }
      
      response = HTTParty.post(base_url, options)
      return [] unless response.success?

      # Process raw data from OSM
      response.parsed_response['elements'].map do |place|
        tags = place['tags']
        next unless tags['name'] 

        {
          name: tags['name'],
          address: [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']].compact.join(', '),
          rating: 'N/A' 
        }
      end.compact.uniq { |place| place[:name] } 
    end

    # --- COORDINATES ---
    def fetch_coordinates(city, api_key)
      base_url = "http://api.openweathermap.org/geo/1.0/direct"
      options = { query: { q: city, limit: 1, appid: api_key } }
      
      begin
        response = HTTParty.get(base_url, options)
        if response.success? && response.parsed_response.any?
          data = response.parsed_response.first
          return { lat: data['lat'], lon: data['lon'], city_name: data['name'] }
        else
          return { error: "Coordenadas da cidade não encontradas." }
        end
      rescue HTTParty::Error, StandardError => e
        return { error: "Erro ao buscar coordenadas: #{e.message}" }
      end
    end
end