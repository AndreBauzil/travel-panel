// frontend/src/App.tsx
import { useState } from 'react';
import axios from 'axios';
import {
  AppShell, Group, TextInput, Button, Paper, Text, Image, Center, Loader, Alert, List, Card, Title, Container, Stack, Grid, UnstyledButton,
  Collapse
} from '@mantine/core'; 
import { useDisclosure } from '@mantine/hooks';
import { IconAlertCircle, IconSparkles } from '@tabler/icons-react'; 

// --- INTERFACES ---
interface ForecastDay {
  date: string;
  temp_min: number;
  temp_max: number;
  icon: string;
  description: string;
}

interface WeatherData {
  city: string; 
  current_temp: number;
  current_desc: string;
  current_icon: string;
  forecast: ForecastDay[];
}

interface WikipediaData {
  summary: string | null;
  image_url: string | null;
  page_title: string;
}

interface AIInsightsData {
  traveler_summary: string;
  quick_tips: string[];
}

interface CityInfoData {
  city: string;
  weather: WeatherData;
  wikipedia: WikipediaData;
  ai_insights: AIInsightsData; 
}

function App() {
  const [opened, { toggle }] = useDisclosure(); 
  const [desktopNavCollapsed, setDesktopNavCollapsed] = useState(true); 

  const [city, setCity] = useState('');
  const [cityInfo, setCityInfo] = useState<CityInfoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isForecastVisible, setIsForecastVisible] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  const fetchCityInfo = async () => {
    if (!city) return;
    setLoading(true);
    setError(null);
    setCityInfo(null);
    setIsForecastVisible(false); 
    setIsSummaryExpanded(false); 

    try {
      const response = await axios.get(`http://localhost:3000/city_info?city=${city}`);
      setCityInfo(response.data);
    } catch (err: any) {
      console.error("Erro ao buscar informações da cidade:", err);
      setError(err.response?.data?.error || err.message || "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ 
        width: 300, 
        breakpoint: 'sm', 
        collapsed: { mobile: !opened, desktop: desktopNavCollapsed } 
      }}
      padding="md"
    >
      <AppShell.Header>
        {/* ... (Header) ... */}
      </AppShell.Header>

      <AppShell.Navbar p="md">
        Navegação
      </AppShell.Navbar>

      <AppShell.Main w="100vw">
        {/* Search Box */}
        <Center>
          <Paper shadow="xs" p="xl" mb="xl" withBorder style={{ width: '100%', maxWidth: '600px' }}>
            <Group>
              <TextInput
                placeholder="Para onde vamos?" 
                value={city}
                onChange={(event) => setCity(event.currentTarget.value)}
                style={{ flex: 1 }}
                onKeyDown={(event) => { if (event.key === 'Enter') fetchCityInfo(); }}
              />
              <Button onClick={fetchCityInfo} loading={loading}>Explorar</Button>
            </Group>
            </Paper>
        </Center>

        {loading && <Center mt="xl"><Loader /></Center>}

        {error && (
          <Alert mt="xl" variant="light" color="red" title="Erro" icon={<IconAlertCircle />}>
            {error}
          </Alert>
        )}

        {cityInfo && (
          <Container size="lg" mt="xl">
            <Paper shadow="md" p="xl" withBorder radius="md">
              <Title order={2} mb="lg">{cityInfo.weather.city}</Title>
              
              <Grid>
                {/* Main Column - Info */}
                <Grid.Col span={{ base: 12, md: 8 }}>
                  <Stack>
                    {/* Image - Wikipedia */}
                    {cityInfo.wikipedia.image_url && (
                      <Card shadow="sm" p="lg" radius="md" withBorder>
                        <Card.Section>
                          <Image
                            src={cityInfo.wikipedia.image_url}
                            height={300}
                            alt={`Imagem de ${cityInfo.city} (Wikipedia)`}
                          />
                        </Card.Section>
                      </Card>
                    )}
                    
                    {/* Expandable Summary */}
                    <Title order={4} mt="md">Sobre</Title>
                    <Stack gap={0}>
                      <Text 
                        c="dimmed" 
                        lineClamp={isSummaryExpanded ? undefined : 2} 
                      >
                        {cityInfo.wikipedia.summary || "Nenhum resumo disponível."}
                      </Text>
                      
                      <UnstyledButton onClick={() => setIsSummaryExpanded((prev) => !prev)} c="blue" fw={500} size="sm" mt="xs">
                        {isSummaryExpanded ? "Ver menos" : "Ver mais..."}
                      </UnstyledButton>
                    </Stack>

                  </Stack>
                </Grid.Col>

                {/* Lateral Column - Widgets */}
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Stack gap="lg">

                    {/* Weather Card */}
                    <Card 
                      shadow="sm" 
                      padding="lg" 
                      radius="md" 
                      withBorder 
                      onClick={() => setIsForecastVisible((prev) => !prev)} 
                      style={{ cursor: 'pointer' }}
                    >
                      <Group justify="space-between" mb="xs">
                        <Text fw={500}>Clima Atual</Text>
                        <Image
                          src={cityInfo.weather.current_icon}
                          alt={cityInfo.weather.current_desc}
                          w={50} h={50}
                        />
                      </Group>
                      <Text ta="center" size="2.5rem" fw={700} my="xs">
                        {cityInfo.weather.current_temp.toFixed(1)}°C 
                      </Text>
                      <Text ta="center" c="dimmed" tt="capitalize" size="sm">
                        {cityInfo.weather.current_desc}
                      </Text>

                      {/* --- Weekly Forecast (hidden) --- */}
                      <Collapse in={isForecastVisible} mt="md">
                        <Stack gap="sm" pt="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
                          <Text fw={500} size="sm" ta="center">Previsão 7 Dias</Text>
                          {cityInfo.weather.forecast.map((day) => (
                            <Group key={day.date} justify="space-between">
                              <Text size="sm">{day.date}</Text>
                              <Image src={day.icon} w={30} h={30} alt={day.description} />
                              <Text size="sm" fw={500}>{day.temp_max}° / {day.temp_min}°</Text>
                            </Group>
                          ))}
                        </Stack>
                      </Collapse>

                    </Card>
                  </Stack>
                </Grid.Col>

                {/* AI Resume */}
                <Stack gap="md" mt="xl">
                  <Title order={4}>Resumo do Viajante (IA)</Title>
                  <Text c="dimmed" style={{ fontStyle: 'italic' }}>
                    "{cityInfo.ai_insights.traveler_summary}"
                  </Text>

                  <Title order={5} mt="sm">Dicas Rápidas (IA)</Title>
                  <List
                    spacing="xs"
                    size="sm"
                    center
                    icon={
                      <IconSparkles size={16} color="var(--mantine-color-blue-filled)" />
                    }
                  >
                    {cityInfo.ai_insights.quick_tips.map((tip, index) => (
                      <List.Item key={index}>{tip}</List.Item>
                    ))}
                  </List>
                </Stack>
              </Grid>
            </Paper>
          </Container>
        )}
      </AppShell.Main>
    </AppShell>
  );
}

export default App;