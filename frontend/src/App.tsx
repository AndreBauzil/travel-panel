// frontend/src/App.tsx
import { useEffect, useState } from 'react';
import axios from 'axios';

import {
  AppShell, Group, Button, Paper, Text, Image, Center, Loader, Alert, List, Card, Title, Container, Stack, Grid, UnstyledButton,
  Collapse, Autocomplete,
  Tabs, Anchor,
  ThemeIcon
} from '@mantine/core'; 
import { useDisclosure, useDebouncedValue } from '@mantine/hooks';

import { Carousel } from '@mantine/carousel';
import '@mantine/carousel/styles.css'

import { IconAlertCircle, 
  IconSparkles, 
  IconBuildingMonument, 
  IconToolsKitchen2,  
  IconBed 
} from '@tabler/icons-react'; 

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
  image_urls: string[] | null;
  page_title: string;
}

interface AIInsightsData {
  traveler_summary: string;
  quick_tips: string[];
}

interface Place {
  name: string;
  address: string;
  rating?: number | string;
}

interface PlacesData {
  points_of_interest: Place[];
  restaurants: Place[];
  hotels: Place[];
}

interface CityInfoData {
  city: string;
  weather: WeatherData;
  wikipedia: WikipediaData;
  ai_insights: AIInsightsData;
  places: PlacesData;
}

function App() {
  const [opened, { toggle }] = useDisclosure(); 
  const [desktopNavCollapsed, setDesktopNavCollapsed] = useState(true); 

  const [city, setCity] = useState(''); 
  const [cityInfo, setCityInfo] = useState<CityInfoData | null>(null);

  const [debouncedCityQuery] = useDebouncedValue(city, 150); 
  const [autocompleteData, setAutocompleteData] = useState<string[]>([]); 

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isForecastVisible, setIsForecastVisible] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  const fetchCityInfo = async (cityToFetch?: string) => {
    const query = cityToFetch || city;
    if (!query) return;
    
    setLoading(true);
    setError(null);
    setCityInfo(null);
    setIsForecastVisible(false); 
    setIsSummaryExpanded(false); 

    try {
      const response = await axios.get(`http://localhost:3000/city_info?city=${query}`);
      setCityInfo(response.data);
    } catch (err: any) {
      console.error("Erro ao buscar informações da cidade:", err);
      setError(err.response?.data?.error || err.message || "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  };

  const handleAutocompleteSubmit = (value: string) => {
    setCity(value);       // Updates input value
    fetchCityInfo(value); // Call search immediately with selected value
  };

  const PlaceCard: React.FC<{ place: Place; city: string; icon: React.ReactNode }> = ({ place, city, icon }) => (
    <Card shadow="sm" radius="md" withBorder p="sm">
      <Group>
        <ThemeIcon variant="light" size="lg" radius="md">
          {icon}
        </ThemeIcon>
        <Stack gap={0}>
          <Anchor 
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ', ' + city)}`}
            target="_blank"
            fw={500}
            size="sm"
          >
            {place.name}
          </Anchor>
          <Text c="dimmed" size="xs">{place.address}</Text>
        </Stack>
      </Group>
    </Card>
  );

  useEffect(() => {
    const fetchAutocomplete = async () => {
      if (debouncedCityQuery.length < 3) {
        setAutocompleteData([]); // Clean sugestions if search too short
        return;
      }

      try {
        const response = await axios.get(`http://localhost:3000/autocomplete_cities?query=${debouncedCityQuery}`);
        setAutocompleteData(response.data);
      } catch (err) {
        console.error("Erro no autocomplete:", err);
        setAutocompleteData([]); // Cleans on error case
      }
    };

    fetchAutocomplete();
  }, [debouncedCityQuery]); // <-- Runs always that a late value changes

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
              <Autocomplete
                placeholder="Para onde vamos?" 
                value={city}
                onChange={setCity} 
                data={autocompleteData}
                style={{ flex: 1 }}
                onKeyDown={(event) => { if (event.key === 'Enter') fetchCityInfo(); }}
                onOptionSubmit={handleAutocompleteSubmit} 
              />
              <Button onClick={() => fetchCityInfo()} loading={loading}>Explorar</Button>
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
                      {cityInfo.wikipedia.image_urls && cityInfo.wikipedia.image_urls.length > 0 && (
                        <Card shadow="sm" p="lg" radius="md" withBorder>
                          <Card.Section>
                            <Carousel withIndicators emblaOptions={{loop: true}}>
                              {cityInfo.wikipedia.image_urls.map((url, index) => (
                                <Carousel.Slide key={index}>
                                  <Image
                                    src={url}
                                    height={300}
                                    alt={`Imagem ${index + 1} de ${cityInfo.city}`}
                                  />
                                </Carousel.Slide>
                              ))}
                            </Carousel>
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

                <Grid.Col>
                </Grid.Col>
              </Grid>

              <Title order={4}  mt="xl">Locais de Interesse</Title>
              <Tabs defaultValue="pois" mt="md">
                <Tabs.List>
                  <Tabs.Tab value="pois">Pontos Turísticos</Tabs.Tab>
                  <Tabs.Tab value="restaurants">Restaurantes</Tabs.Tab>
                  <Tabs.Tab value="hotels">Hotéis</Tabs.Tab>
                </Tabs.List>

                {/* Painel for Turistic Places */}
                <Tabs.Panel value="pois" pt="md">
                  <Stack gap="xs">
                    {cityInfo.places.points_of_interest.length > 0 ? (
                      cityInfo.places.points_of_interest.map((place, index) => (
                        <PlaceCard key={index} place={place} city={cityInfo.weather.city} icon={<IconBuildingMonument size={20} />} />
                      ))
                    ) : (
                      <Text c="dimmed" size="sm">Nenhum ponto turístico encontrado.</Text>
                    )}
                  </Stack>
                </Tabs.Panel>

                {/* Painel for Restaurants */}
                <Tabs.Panel value="restaurants" pt="md">
                  <Stack gap="xs">
                    {cityInfo.places.restaurants.length > 0 ? (
                      cityInfo.places.restaurants.map((place, index) => (
                        <PlaceCard key={index} place={place} city={cityInfo.weather.city} icon={<IconToolsKitchen2 size={20} />} />
                      ))
                    ) : (
                      <Text c="dimmed" size="sm">Nenhum restaurante encontrado.</Text>
                    )}
                  </Stack>
                </Tabs.Panel>

                {/* Painel for Hotels */}
                <Tabs.Panel value="hotels" pt="md">
                  <Stack gap="xs">
                    {cityInfo.places.hotels.length > 0 ? (
                      cityInfo.places.hotels.map((place, index) => (
                        <PlaceCard key={index} place={place} city={cityInfo.weather.city} icon={<IconBed size={20} />} />
                      ))
                    ) : (
                      <Text c="dimmed" size="sm">Nenhum hotel encontrado.</Text>
                    )}
                  </Stack>
                </Tabs.Panel>
              </Tabs>
            </Paper>
          </Container>
        )}
      </AppShell.Main>
    </AppShell>
  );
}

export default App;