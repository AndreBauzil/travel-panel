require 'httparty'

class WeatherController < ApplicationController
  # Quando acessar GET /weather
  def index
    city = params[:city]
    api_key = 'af1f178ae097b36fc1219ad92e1ad0b3'

    if city.blank?
      render json: { error: 'Parâmetro "city é obrigatório' }, status: :bad_request
      return
    end

    base_url = "https://api.openweathermap.org/data/2.5/weather"
    options = {
      query: {
        q: city,
        appid: api_key,
        units: 'metric',
        lang: 'pt_br'
      }
    }

    begin
      response = HTTParty.get(base_url, options)

      if response.success?
        # HTTParty converte JSON
        data = response.parsed_response 

        # Formata a resposta da API interna
        formatted_response = {
          city: data['name'],
          temperature: data['main']['temp'],
          description: data['weather'][0]['description'],
          icon: "https://openweathermap.org/img/wn/#{data['weather'][0]['icon']}@2x.png"
        }

        render json: formatted_response, status: :ok
      else
        # Se API externa retornar erro
        render json: { error: "Erro ao buscar dados do clima: #{response['message'] || response.code}" }, status: response.code
      end
    rescue HTTParty::Error => e
      # Erro de rede ou na requisição
      render json: { error: "Erro de conexão com a API de clima: #{e.message}" }, status: :service_unavailable
    rescue StandardError => e
      # Qualquer outro erro
      render json: { error: "Erro interno no servidor: #{e.message}" }, status: :internal_server_error
    end
  end
end