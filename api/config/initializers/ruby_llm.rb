# config/initializers/ruby_llm.rb
require 'ruby_llm'

RubyLLM.configure do |config|
  config.gemini_api_key = ENV['GEMINI_API_KEY']
end