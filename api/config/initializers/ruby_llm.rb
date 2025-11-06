# config/initializers/ruby_llm.rb
require 'ruby_llm'

RubyLLM.configure do |config|
  config.gemini_api_key = Rails.application.credentials.gemini[:api_key]
end