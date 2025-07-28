// Importa os matchers do jest-dom
import '@testing-library/jest-dom/vitest';
// Não é mais necessário importar 'expect' de 'vitest' diretamente aqui
// nem chamar expect.extend, pois a importação acima já faz isso para o Vitest.

// Limpar o DOM após cada teste (opcional, mas boa prática)
import { cleanup } from '@testing-library/react';
afterEach(() => {
  cleanup();
});
