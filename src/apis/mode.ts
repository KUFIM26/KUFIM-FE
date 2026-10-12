// Explicit mode selection: an API error never silently changes the data source.
export const isMockMode = import.meta.env.VITE_USE_MOCK !== 'false'
