# Be sure to restart your server when you modify this file.

# Avoid CORS issues when API is called from the frontend app.
# Handle Cross-Origin Resource Sharing (CORS) in order to accept cross-origin Ajax requests.

# Read more: https://github.com/cyu/rack-cors

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(
      "http://127.0.0.1:5173",
<<<<<<< HEAD
      "https://travel-panel-api.onrender.com"
=======
      "https://travel-panel-frontend.onrender.com"
>>>>>>> 82384dd3e202128750df5bb4c99ad392b66e53be
    )
    
    resource "*",
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head]
  end
end