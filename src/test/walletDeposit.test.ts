import { test, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

/**
 * Normaliza o valor para parseFloat aceitar (BR format to US format)
 */
const normalizeAmount = (val: string) => {
  return parseFloat(val.replace(",", ".")) || 0;
};

/**
 * Lógica de processamento de input simulada para o componente
 */
const processInput = (inputValue: string) => {
  const raw = inputValue.replace(/,/g, ".");
  const val = raw.replace(/[^0-9.]/g, "");
  const parts = val.split(".");
  const formatted = parts.length > 2 
    ? `${parts[0]}.${parts.slice(1).join("")}`
    : val;
  return formatted.replace(".", ",");
};

test('Deposit value normalization and validation', () => {
  // Testes de normalização (conversão para número para o backend)
  expect(normalizeAmount("20")).toBe(20);
  expect(normalizeAmount("20,00")).toBe(20);
  expect(normalizeAmount("20.00")).toBe(20);
  expect(normalizeAmount("20.5")).toBe(20.5);
  expect(normalizeAmount("20,5")).toBe(20.5);
  
  // Testes de validação de valor mínimo
  const isValid = (val: string) => normalizeAmount(val) >= 1.0;
  expect(isValid("0,99")).toBe(false);
  expect(isValid("1,00")).toBe(true);
  expect(isValid("20")).toBe(true);
});

test('UI Input processing logic (masking/formatting)', () => {
  // Simula o que o usuário digita vs o que aparece no campo
  expect(processInput("20")).toBe("20");
  expect(processInput("20.00")).toBe("20,00");
  expect(processInput("20,00")).toBe("20,00");
  expect(processInput("20,5")).toBe("20,5");
  
  // Caso de erro: múltiplos separadores (deve manter apenas o primeiro)
  expect(processInput("20.50.10")).toBe("20,5010");
  expect(processInput("20,50,10")).toBe("20,5010");
  
  // Caracteres inválidos (letras, símbolos) devem ser removidos
  expect(processInput("abc20def")).toBe("20");
  expect(processInput("R$ 20,00")).toBe("20,00");
});

test('Preset buttons behavior', () => {
  const presetAmounts = [20, 50, 100, 200];
  
  presetAmounts.forEach(val => {
    const formatted = processInput(val.toString());
    expect(normalizeAmount(formatted)).toBe(val);
  });
});

test('Supabase client availability', () => {
  expect(supabase.functions).toBeDefined();
});
