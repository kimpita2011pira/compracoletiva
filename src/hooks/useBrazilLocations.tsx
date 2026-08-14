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
    let isMounted = true;
    fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) setStates(data);
      })
      .catch((err) => {
        console.error("Erro ao buscar estados:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingStates(false);
      });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedState) {
      setCities([]);
      return;
    }
    let isMounted = true;
    setLoadingCities(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedState}/municipios?orderBy=nome`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) setCities(data);
      })
      .catch((err) => {
        console.error("Erro ao buscar cidades:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingCities(false);
      });
    return () => { isMounted = false; };
  }, [selectedState]);

  return { states, cities, loadingStates, loadingCities };
}
