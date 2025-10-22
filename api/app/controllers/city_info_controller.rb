require 'httparty'

class CityInfoController < ApplicationController
  # Quando acessar GET /city_info
  def index
    city = params[:city]
    weather_api_key = Rails.application.credentials.weather[:api_key]
    photos_access_key = Rails.application.credentials.photos[:access_key]

    if city.blank?
      render json: { error: 'Parâmetro "city é obrigatório' }, status: :bad_request
      return
    end

    weather_data = fetch_weather(city, weather_api_key)
    photo_data = fetch_photo(city+" city", photos_access_key)

    # Verifica erros
    if weather_data[:error] || photo_data[:error]
      # Combina as mensagens
      errors = [weather_data[:error], photo_data[:error]].compact.join('; ')
      render json: { error: errors}, status: :bad_gateway
      return
    end

    # Combina os resultados
    combined_data = {
      city: weather_data[:city],
      weather: {
        temperature: weather_data[:temperature],
        description: weather_data[:description],
        icon: weather_data[:icon]
      },
      photo: {
        url: photo_data[:url],
        photographer: photo_data[:photographer]
      }
    }

    render json: combined_data, status: :ok
  end

  private # Métodos auxiliares, não rotas diretas

  def fetch_weather(city, weather_api_key)
    base_url = "https://api.openweathermap.org/data/2.5/weather"
    options = {
      query: {
        q: city,
        appid: weather_api_key,
        units: 'metric',
        lang: 'pt_br'
      }
    }

    begin
      response = HTTParty.get(base_url, options)

      if response.success?
        # HTTParty converte JSON
        data = response.parsed_response 

        # Formata e retorna a resposta da API interna
        return {
          city: data['name'],
          temperature: data['main']['temp'],
          description: data['weather'][0]['description'],
          icon: "https://openweathermap.org/img/wn/#{data['weather'][0]['icon']}@2x.png"
        }
      else
        return { error: "Clima não encontrado (#{response.code})" }
      end
    rescue HTTParty::Error, StandardError => e
      return { error: "Erro ao buscar clima: #{e.message}" }
    end
  end


  def fetch_photo(city, access_key)
    base_url = "https://api.unsplash.com/search/photos"
    options = {
      query: {
        query: city,
        per_page: 1,
        orientation: 'landscape'
      },
      headers: {
        'Authorization' => "Client-ID #{access_key}"
      }
    }

    begin
      response = HTTParty.get(base_url, options)
      if response.success? && response.parsed_response['results'].any?
        photo = response.parsed_response['results'][0]

        return {
          url: photo['urls']['regular'],
          photographer: photo['user']['name'],
        }
      else
        return { url: nil, photographer: nil} # Retorna nulo se não encontrar
      end
    rescue HTTParty::Error, StandardError => e
      return { error: "Erro ao buscar foto: #{e.message}" }
    end
  end
end