const ORDER = [
  "Theo","Staat","Recht","Medi","Vete","Wirts",
  "Philosophische Fakultät","Philosophische Fakultät II"
];

export function fakSortKey(name: string): number {
  const i = ORDER.findIndex(prefix => (name || '').startsWith(prefix));
  return i === -1 ? ORDER.length : i;
}

export function sortFakultaeten(names: string[]): string[] {
  return names.slice().sort((a,b) => {
    const da = fakSortKey(a), db = fakSortKey(b);
    return da === db ? a.localeCompare(b) : da - db;
  });
}
