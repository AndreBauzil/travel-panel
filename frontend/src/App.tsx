// frontend/src/App.tsx
import { useState } from 'react';
import axios from 'axios';
import {
  AppShell, Group, TextInput, Button, Paper, Text, Image, Center, Loader, Alert, ActionIcon, Card, SimpleGrid, Title, Container, Stack, Grid
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertCircle, IconLayoutSidebarLeftCollapse, IconLayoutSidebarRightCollapse } from '@tabler/icons-react';

interface CityInfoData {
  city: string;
  weather: {
    temperature: number;
    description: string;
    icon: string;
  };
  wikipedia: { 
    summary: string | null;
    image_url: string | null; 
  };
}

function App() {
  const [opened, { toggle }] = useDisclosure(); 
  const [desktopNavCollapsed, setDesktopNavCollapsed] = useState(true); 

  const [city, setCity] = useState('');
  const [cityInfo, setCityInfo] = useState<CityInfoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCityInfo = async () => {
    if (!city) return;
    setLoading(true);
    setError(null);
    setCityInfo(null);

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
        
      </AppShell.Header>

      <AppShell.Navbar p="md">
        Navegação
      </AppShell.Navbar>

      <AppShell.Main w="100vw">
        {/* Caixa de Busca */}
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

        {/* Diário de Bordo*/}
        {cityInfo && (
          <Paper shadow="md" p="xl" mt="xl" withBorder radius="md">
            <Title order={2} mb="lg">{cityInfo.city}</Title>
            
            <Grid>
              {/* Coluna Principal - Informações */}
              <Grid.Col span={{ base: 12, md: 8 }}>
                <Stack>
                  <Title order={4}>Resumo</Title>
                  <Text c="dimmed">
                    {cityInfo.wikipedia.summary || "Nenhum resumo disponível."}
                  </Text>
                  
                  {/* Mais info */}

                </Stack>
              </Grid.Col>

              {/* Coluna Lateral - Widgets */}
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Stack gap="lg">

                  {/* 2. CLIMA */}
                  <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Group justify="space-between">
                      <Stack gap={0}>
                        <Text fw={500}>Clima Atual</Text>
                        <Text c="dimmed" tt="capitalize" size="sm">
                          {cityInfo.weather.description}
                        </Text>
                      </Stack>
                      <Image
                        src={cityInfo.weather.icon}
                        alt={cityInfo.weather.description}
                        w={60} 
                        h={60}
                      />
                    </Group>
                    <Text ta="center" size="2.5rem" fw={700} my="xs">
                      {cityInfo.weather.temperature.toFixed(1)}°C 
                    </Text>
                  </Card>

                  {/* IMAGEM DA WIKIPEDIA */}
                  {cityInfo.wikipedia.image_url && (
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                      <Card.Section>
                        <Image
                          src={cityInfo.wikipedia.image_url}
                          height={220}
                          alt={`Imagem de ${cityInfo.city} (Wikipedia)`}
                        />
                      </Card.Section>
                    </Card>
                  )}
                  
                </Stack>
              </Grid.Col>
            </Grid>
          </Paper>
        )}
      </AppShell.Main>
    </AppShell>
  );
}

export default App;