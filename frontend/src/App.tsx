// frontend/src/App.tsx
import { useState } from 'react';
import axios from 'axios';

import {
  AppShell, Burger, Group, TextInput, Button, Paper, Text, Image, Center, Loader, Alert, ActionIcon, Card, SimpleGrid, Title
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertCircle, IconLayoutSidebarLeftCollapse, IconLayoutSidebarRightCollapse, IconCloud } from '@tabler/icons-react';


interface CityInfoData {
  city: string;
  weather: {
    temperature: number;
    description: string;
    icon: string;
  };
  photo: {
    url: string | null; // Nulo caso não encontrar foto
    photographer: string | null;
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
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <ActionIcon 
            onClick={() => setDesktopNavCollapsed((prev) => !prev)} 
            variant="default" 
            size="lg" 
            aria-label="Toggle navigation"
            visibleFrom="sm" 
          >
            {desktopNavCollapsed ? <IconLayoutSidebarRightCollapse /> : <IconLayoutSidebarLeftCollapse />}
          </ActionIcon>

          <Title order={3}>Painel do Viajante</Title> 
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        Navegação
      </AppShell.Navbar>

      <AppShell.Main w="100vw">
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

        {/* Resultados */}
        {loading && <Center mt="xl"><Loader /></Center>}
        {error && (
          <Alert mt="xl" variant="light" color="red" title="Erro" icon={<IconAlertCircle />}>
            {error}
          </Alert>
        )}
        {cityInfo && (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl" mt="xl">
            {/* Clima */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text fw={500}>Clima em {cityInfo.city}</Text>
                <IconCloud size={20} />
              </Group>
              <Center>
                <Image
                  src={cityInfo.weather.icon}
                  alt={cityInfo.weather.description}
                  height={80}
                  width={80}
                />
              </Center>
              <Text ta="center" size="xl" fw={700} mt="md">{cityInfo.weather.temperature}°C</Text>
              <Text ta="center" c="dimmed" tt="capitalize">{cityInfo.weather.description}</Text>
            </Card>

            {/* Foto */}
            {cityInfo.photo?.url && ( // Se houver URL da foto
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Card.Section>
                  <Image
                    src={cityInfo.photo.url}
                    height={200}
                    alt={`Foto de ${cityInfo.city}`}
                  />
                </Card.Section>
                <Text size="sm" c="dimmed" mt="md">
                  Foto por: {cityInfo.photo.photographer || 'Desconhecido'} (via Unsplash)
                </Text>
              </Card>
            )}
          </SimpleGrid>
        )}
      </AppShell.Main>
    </AppShell>
  );
}

export default App;