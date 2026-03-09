import { useState, useEffect } from "react";

interface State {
  id: number;
  sigla: string;
  nome: string;
}

interface City {
  id: number;
  nome: string;
}

export function useBrazilLocations(selectedState: string) {
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome")
      .then((res) => res.json())
      .then((data) => setStates(data))
      .catch(console.error)
      .finally(() => setLoadingStates(false));
  }, []);

  useEffect(() => {
    if (!selectedState) {
      setCities([]);
      return;
    }
    setLoadingCities(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedState}/municipios?orderBy=nome`)
      .then((res) => res.json())
      .then((data) => setCities(data))
      .catch(console.error)
      .finally(() => setLoadingCities(false));
  }, [selectedState]);

  return { states, cities, loadingStates, loadingCities };
}
