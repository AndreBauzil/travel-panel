// frontend/src/App.tsx
import { useState } from 'react';
import axios from 'axios';
import { AppShell, Burger, Group, TextInput, Button, Paper, Text, Image, Center, Loader, Alert } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertCircle } from '@tabler/icons-react'; 

// Interface para o formato dos dados que se espera
interface WeatherData {
  city: string;
  temperature: number;
  description: string;
  icon: string;
}

function App() {
  const [opened, { toggle }] = useDisclosure(); 
  const [city, setCity] = useState('');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    if (!city) return; // Não busca se o campo estiver vazio
    setLoading(true);
    setError(null);
    setWeatherData(null); // Limpa dados anteriores

    try {
      // Requisição para a nossa API Rails
      const response = await axios.get(`http://localhost:3000/weather?city=${city}`);
      setWeatherData(response.data);
    } catch (err: any) {
      console.error("Erro ao buscar clima:", err);
      setError(err.response?.data?.error || err.message || "Erro desconhecido ao buscar clima.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Text fw={700} size="lg">Painel do Viajante</Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        Menu Lateral
      </AppShell.Navbar>

      <AppShell.Main>
        <Paper shadow="xs" p="xl" withBorder>
          <Group>
            <TextInput
              placeholder="Digite o nome da cidade"
              value={city}
              onChange={(event) => setCity(event.currentTarget.value)}
              style={{ flex: 1 }} 
              onKeyDown={(event) => {
                if (event.key === 'Enter') fetchWeather();
              }}
            />
            <Button onClick={fetchWeather} loading={loading}>Buscar Clima</Button>
          </Group>

          {/* Resultados */}
          <Center mt="xl">
            {loading && <Loader />}
            {error && (
              <Alert variant="light" color="red" title="Erro" icon={<IconAlertCircle />}>
                {error}
              </Alert>
            )}
            {weatherData && (
              <Paper shadow="md" p="lg" radius="md" withBorder style={{ textAlign: 'center' }}>
                <Text size="xl" fw={700}>{weatherData.city}</Text>
                <Image
                  src={weatherData.icon}
                  alt={weatherData.description}
                  height={100}
                  width={100}
                  mx="auto"
                />
                <Text size="lg">{weatherData.temperature}°C</Text>
                <Text c="dimmed">{weatherData.description}</Text>
              </Paper>
            )}
          </Center>
        </Paper>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;